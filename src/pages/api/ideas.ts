import type { APIRoute } from 'astro';
import { fallbackIdeas, type Idea } from '../../lib/ai/fallbackIdeas';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

// Ordered failover chain, fastest first — same list and same reason as /api/edit:
// mistral-nemotron went dark on 2026-09-05 (connections hang, no status) and took
// this endpoint down with it, so a single primary + single fallback is not enough.
// Any failure walks to the next model, and the hand-written static bank still backs
// the whole chain, so ideas never hard-fail.
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// `extra` disables each model's chain-of-thought — see the same note in
// /api/edit.ts. Without it every model here burns its budget thinking out loud and
// the endpoint served static ideas on every single request.
const CHAIN: readonly { model: string; ms: number; extra: Record<string, unknown> }[] = [
  { model: 'openai/gpt-oss-20b', ms: 20000, extra: { reasoning_effort: 'low' } },
  { model: 'nvidia/nemotron-3-super-120b-a12b', ms: 15000, extra: { chat_template_kwargs: { thinking: false } } },
  { model: 'nvidia/nemotron-3-ultra-550b-a55b', ms: 20000, extra: { chat_template_kwargs: { thinking: false } } },
];
const LANG_NAMES: Record<string, string> = { en: 'English', ro: 'Romanian', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian' };

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clamp = (v: unknown, n: number) => String(v ?? '').slice(0, n);

/** Length-cap WITHOUT cutting mid-word: prefer the last sentence end within the
    limit, else the last word boundary, then tidy trailing punctuation. */
function clampSmart(v: unknown, max: number): string {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sentence > max * 0.5) return head.slice(0, sentence + 1).trim();
  const word = head.lastIndexOf(' ');
  return (word > max * 0.5 ? head.slice(0, word) : head).trim().replace(/[\s,;:.–—-]+$/, '');
}

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** One model attempt: returns a clamped Idea, or null on slow/throttle/parse failure.
 *
 * max_tokens has to cover the model's own reasoning, not just the JSON: today's
 * NVIDIA models all think out loud first, so the old 500 budget was spent on
 * "We need to produce JSON with fields..." and the answer was truncated away
 * (gpt-oss-20b returned an EMPTY content string) — every model "failed" and the
 * endpoint served static ideas. 1800 matches /api/edit and leaves ample room. */
async function tryIdeas(key: string, model: string, sys: string, usr: string, timeoutMs: number, extra: Record<string, unknown> = {}): Promise<Idea | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], temperature: 0.7, max_tokens: 1800, response_format: { type: 'json_object' }, ...extra }),
      signal: ctrl.signal,
    });
    if (!res.ok) { console.error(`[ideas] ${model} status ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`); return null; }
    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    // Log the shape we could not use: a silent null here is exactly what made the
    // 2026-09-05 outage hard to read (only the last model's timeout showed up).
    if (!parsed || !parsed.headline) {
      console.error(`[ideas] ${model} unusable output: ${JSON.stringify(String(content).slice(0, 160))}`);
      return null;
    }
    return {
      headline: clampSmart(parsed.headline, 60),
      subhead: clampSmart(parsed.subhead, 160),
      sections: Array.isArray(parsed.sections) ? parsed.sections.slice(0, 3).map((s: any) => ({ title: clampSmart(s?.title, 40), body: clampSmart(s?.body, 140) })) : [],
      cta: clampSmart(parsed.cta, 24),
    };
  } catch (e) {
    console.error(`[ideas] ${model} ${e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'exception'}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getKey(): string | undefined {
  // Prefer the RUNTIME env: on Vercel this is the project env var NVIDIA_API_KEY, so
  // the secret is configured in the dashboard and NEVER baked into the build (works
  // for prebuilt AND remote builds). In dev we fall back to import.meta.env (loaded
  // from .env) — but only inside `if (import.meta.env.DEV)`, a compile-time `false`
  // in the production build, so Vite/esbuild dead-code-eliminate the branch and the
  // key literal never lands in the deployed bundle. STATIC access is required (a
  // dynamic import.meta.env['X'] is rejected by Vite's dev module runner).
  const fromProcess = typeof process !== 'undefined' ? process.env?.NVIDIA_API_KEY : undefined;
  if (fromProcess) return fromProcess;
  try {
    if (import.meta.env.DEV) return import.meta.env.NVIDIA_API_KEY as string | undefined;
  } catch {
    /* import.meta.env absent — e.g. the tsx test harness */
  }
  return undefined;
}

export const POST: APIRoute = async ({ request }) => {
  // Same-origin guard: block requests from other websites' browsers.
  // Compare the browser Origin against the PUBLIC host (x-forwarded-host on
  // Vercel). request.url is the function's internal URL and would always
  // mismatch the public origin -> false 403 on every legit request.
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    try {
      if (host && new URL(origin).host !== host) return json({ error: 'forbidden' }, 403);
    } catch {
      /* malformed Origin header — don't hard-block legitimate traffic */
    }
  }

  // Reject oversized bodies before buffering (bounds memory/CPU abuse).
  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > 4096) return json({ error: 'payload too large' }, 413);
  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'payload too large' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const company = clamp(body?.company, 80).trim();
  const industry = clamp(body?.industry, 60).trim();
  const tone = ['professional', 'friendly', 'bold'].includes(body?.tone) ? body.tone : 'professional';
  const lang = LANG_NAMES[body?.lang] ? (body.lang as string) : 'en';
  if (!company) return json({ error: 'company required' }, 400);

  const key = getKey();
  console.log(`[ideas] keyPresent=${!!key} lang=${lang}`);
  // No key configured -> graceful static fallback (never hard-fail).
  if (!key) {
    console.error('[ideas] fallback: NVIDIA_API_KEY missing in runtime env');
    return json({ ...fallbackIdeas(industry, company, lang), source: 'fallback' });
  }

  const sys =
    'You are a website copywriter for small businesses. Reply with ONLY valid JSON of the shape ' +
    '{"headline":string,"subhead":string,"sections":[{"title":string,"body":string}],"cta":string}. ' +
    'Keep everything SHORT and COMPLETE — count characters, never exceed (anything over is cut off mid-thought): ' +
    'headline <= 55 chars; subhead = one line <= 150; exactly 3 sections where the title is a 2-4 WORD LABEL (<= 28 chars, NOT a sentence) ' +
    'and the body is ONE short COMPLETE sentence that ENDS WITH A PERIOD (<= 120 chars); cta = a short button label <= 22. ' +
    'If something will not fit, write a shorter version. ' +
    `Tone: ${tone}. ` +
    (lang === 'en' ? '' : `Write ALL copy in natural, fluent, grammatically-correct ${LANG_NAMES[lang]} with proper diacritics — like a native marketing copywriter, not a literal translation. `) +
    'No markdown, no commentary, JSON only.';
  const usr = `Business name: ${company}. Industry / what they do: ${industry || 'general small business'}. Write homepage copy.`;

  // Walk the chain; the first model that answers wins, else the static bank.
  for (const tier of CHAIN) {
    const ai = await tryIdeas(key, tier.model, sys, usr, tier.ms, tier.extra);
    if (ai) return json({ ...ai, source: 'ai' });
  }
  console.error('[ideas] fallback: every model in the chain failed (down/slow/throttled)');
  return json({ ...fallbackIdeas(industry, company, lang), source: 'fallback' });
};

// Reject non-POST verbs cleanly.
export const GET: APIRoute = () => json({ error: 'method not allowed' }, 405);
