import type { APIRoute } from 'astro';
import { fallbackIdeas, type Idea } from '../../lib/ai/fallbackIdeas';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

// Quality-first cascade: try the big, fluent model (best grammar); if it's slow or
// throttled on the free tier, fall to the fast 8B (still business-SPECIFIC copy);
// only then the hand-written static bank. So the user rarely sees generic offline copy.
const MODEL_SMART = 'meta/llama-3.3-70b-instruct';
const MODEL_FAST = 'meta/llama-3.1-8b-instruct';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
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

/** One model attempt: returns a clamped Idea, or null on slow/throttle/parse failure. */
async function tryIdeas(key: string, model: string, sys: string, usr: string, timeoutMs: number): Promise<Idea | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], temperature: 0.7, max_tokens: 500 }),
      signal: ctrl.signal,
    });
    if (!res.ok) { console.error(`[ideas] ${model} status ${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`); return null; }
    const data = await res.json().catch(() => null);
    const parsed = extractJson(data?.choices?.[0]?.message?.content ?? '');
    if (!parsed || !parsed.headline) return null;
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
  let fromImport: string | undefined;
  try {
    // STATIC member access so Vite can inline it at build/dev time. A dynamic form
    // like (import.meta as any).env.X is rejected by Vite's dev module runner.
    fromImport = import.meta.env.NVIDIA_API_KEY as string | undefined;
  } catch {
    fromImport = undefined; // e.g. the tsx test harness, where import.meta.env is absent
  }
  const fromProcess = typeof process !== 'undefined' ? process.env?.NVIDIA_API_KEY : undefined;
  return fromImport || fromProcess;
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
    'STRICT length limits — count characters and write COMPLETE sentences that FIT (never exceed, so nothing is cut off): ' +
    'headline <= 55, subhead <= 150, exactly 3 sections (title <= 36, body = ONE short complete sentence <= 130), cta <= 22. ' +
    `Tone: ${tone}. ` +
    (lang === 'en' ? '' : `Write ALL copy in natural, fluent, grammatically-correct ${LANG_NAMES[lang]} with proper diacritics — like a native marketing copywriter, not a literal translation. `) +
    'No markdown, no commentary, JSON only.';
  const usr = `Business name: ${company}. Industry / what they do: ${industry || 'general small business'}. Write homepage copy.`;

  // 70B (best grammar, ~20s) -> 8B (fast, still specific, ~10s) -> static bank.
  const ai = (await tryIdeas(key, MODEL_SMART, sys, usr, 20000)) ?? (await tryIdeas(key, MODEL_FAST, sys, usr, 10000));
  if (ai) return json({ ...ai, source: 'ai' });
  console.error('[ideas] fallback: both models failed (slow/throttled)');
  return json({ ...fallbackIdeas(industry, company, lang), source: 'fallback' });
};

// Reject non-POST verbs cleanly.
export const GET: APIRoute = () => json({ error: 'method not allowed' }, 405);
