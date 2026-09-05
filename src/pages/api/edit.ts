import type { APIRoute } from 'astro';
import { validateSpec } from '../../lib/builder/spec';
import { applyOps, type EditOp } from '../../lib/editOps';
import { buildEditMessages, parseModelPatch, LANG_NAMES, type ChatMessage } from '../../lib/ai/editPrompt';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

// Ordered failover chain, fastest first. We walk it until a model returns a patch
// that actually applies; a timeout, an upstream error (NVIDIA answers 503 "Service
// temporarily overloaded" under load) or an all-invalid patch moves straight to the
// next model instead of burning the whole budget on one host.
//
// The models are picked by benchmarking the REAL edit prompt, never assumed alive:
// on 2026-09-05 mistralai/mistral-nemotron — the previous fast tier — stopped
// answering altogether (connections hang past 45s, no status ever returned), which
// took the assistant offline: the fast tier timed out at 20s and the single
// escalation then hit a 503, so every request fell through to the offline reply.
// gpt-oss-20b replaced it at ~1.5-3s with 3/3 applying patches; nemotron-3-super is
// a quick second opinion (~4-8s); nemotron-3-ultra (550B, ~15s) is the last resort.
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// `extra` caps the model's chain-of-thought. Every model NVIDIA still serves is a
// reasoning model, and left alone they spend the token budget thinking out loud
// ("We need to produce JSON with fields...") before the JSON — slow, and sometimes
// truncated into unusable output. The switch is vendor-specific, so it rides per
// entry. Editing needs the ops to name REAL slot ids, so gpt-oss runs at MEDIUM
// effort (7/7 prompts applied cleanly) rather than the low setting /api/ideas uses:
// low was ~2s but produced invalid or empty ops on 2 of 5 prompts.
const CHAIN: readonly { model: string; ms: number; extra: Record<string, unknown> }[] = [
  { model: 'openai/gpt-oss-20b', ms: 20000, extra: { reasoning_effort: 'medium' } },
  { model: 'nvidia/nemotron-3-super-120b-a12b', ms: 15000, extra: { chat_template_kwargs: { thinking: false } } },
  { model: 'nvidia/nemotron-3-ultra-550b-a55b', ms: 20000, extra: { chat_template_kwargs: { thinking: false } } },
];
// Whole-request budget, kept under the 60s function maxDuration so we always send
// the browser our own answer instead of letting the platform kill the function.
const DEADLINE_MS = 52000;
const MIN_TIER_MS = 6000; // never start a model we cannot give a fair shot
const MAX_BODY = 24576; // the body includes the whole DesignSpec + recent chat turns
const MAX_MESSAGE = 600;
const MAX_HISTORY = 8; // recent turns kept for multi-turn context
const MAX_TURN = 400; // per-turn content cap

/** Sanitize the client-supplied conversation history (untrusted). */
function parseHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    const role = (item as any)?.role;
    const content = (item as any)?.content;
    if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
      out.push({ role, content: content.slice(0, MAX_TURN) });
    }
  }
  return out;
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clamp = (v: unknown, n: number) => String(v ?? '').slice(0, n);

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

type ModelFail = 'timeout' | 'upstream' | 'parse' | 'error';

/**
 * Call one NVIDIA model with `attempts` tries. Each attempt has its own
 * AbortController (timeout `perAttemptMs`) so a stalled connection — incl. a hung
 * body read — is aborted, not left to the 60s wall. Retries a timeout or a 5xx
 * (transient queue/cold-start); does not retry a 4xx/parse.
 */
async function callModel(key: string, messages: ChatMessage[], model: string, perAttemptMs: number, attempts: number, extra: Record<string, unknown> = {}): Promise<{ content: string } | { fail: ModelFail }> {
  let lastFail: ModelFail = 'error';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), perAttemptMs);
    try {
      const res = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2, // low: we want a precise, deterministic patch
          max_tokens: 1800, // room for a broad multi-slot rewrite without truncating the JSON
          response_format: { type: 'json_object' },
          ...extra,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[edit] ${model} attempt ${attempt}: nvidia ${res.status} ${errBody.slice(0, 150)}`);
        lastFail = 'upstream';
        if (res.status >= 500 && attempt < attempts) continue; // transient -> retry
        return { fail: 'upstream' };
      }
      try {
        const data = await res.json();
        return { content: data?.choices?.[0]?.message?.content ?? '' };
      } catch {
        console.error('[edit] upstream 200 with non-JSON body');
        return { fail: 'parse' };
      }
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      console.error(`[edit] ${model} attempt ${attempt}: ${aborted ? 'timeout' : 'exception'} ${String(e)}`);
      lastFail = aborted ? 'timeout' : 'error';
      if (attempt < attempts) continue; // retry a timeout / transient network error
      return { fail: lastFail };
    } finally {
      clearTimeout(timer);
    }
  }
  return { fail: lastFail };
}

/** Parse a model's content into an applied ApplyResult, or null if unusable. */
function applyContent(spec: Parameters<typeof applyOps>[0], content: string) {
  const patch = parseModelPatch(content);
  if (!patch) return null;
  return { patch, result: applyOps(spec, patch.ops as unknown as readonly EditOp[]) };
}

export const POST: APIRoute = async ({ request }) => {
  // Same-origin guard (compare browser Origin against the PUBLIC host — same as /api/ideas).
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    try {
      if (host && new URL(origin).host !== host) return json({ error: 'forbidden' }, 403);
    } catch {
      /* malformed Origin header — don't hard-block legitimate traffic */
    }
  }

  // Reject oversized bodies before buffering.
  const declaredLen = Number(request.headers.get('content-length') || 0);
  if (declaredLen > MAX_BODY) return json({ error: 'payload too large' }, 413);
  let body: any;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'payload too large' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const message = clamp(body?.message, MAX_MESSAGE).trim();
  if (!message) return json({ error: 'message required' }, 400);
  // Sanitize the client-supplied spec before using it as the edit base.
  const spec = validateSpec(body?.spec);
  if (!spec) return json({ error: 'invalid spec' }, 400);
  const history = parseHistory(body?.history);
  const lang = body?.lang && LANG_NAMES[body.lang] ? (body.lang as string) : 'en';

  const key = getKey();
  console.log(`[edit] keyPresent=${!!key} history=${history.length} lang=${lang}`);
  if (!key) {
    console.error('[edit] fallback: NVIDIA_API_KEY missing in runtime env');
    return json({ spec, applied: [], skipped: [], reply: "The AI editor isn't configured right now.", source: 'fallback', reason: 'unconfigured' });
  }

  const messages = buildEditMessages(spec, message, history, lang);
  let outcome: ReturnType<typeof applyContent> = null;
  let lastFail: ModelFail = 'error';
  const started = Date.now();

  for (const tier of CHAIN) {
    const left = DEADLINE_MS - (Date.now() - started);
    if (left < MIN_TIER_MS) break; // out of budget — answer with whatever we have
    const res = await callModel(key, messages, tier.model, Math.min(tier.ms, left), 1, tier.extra);
    if ('fail' in res) {
      lastFail = res.fail; // timeout / 503 / 4xx
      continue;
    }
    const cand = applyContent(spec, res.content);
    if (!cand) {
      lastFail = 'parse';
      continue;
    }
    // A real edit — or a genuine clarifying question (nothing applied AND nothing
    // skipped) — is the answer. Ops that ALL bounced mean the model misread the
    // spec: keep that only as a last resort and let a smarter model try.
    if (cand.result.applied.length > 0 || cand.result.skipped.length === 0) {
      outcome = cand;
      break;
    }
    outcome ??= cand;
    console.log(`[edit] ${tier.model}: all ops invalid — escalating`);
  }

  if (!outcome) {
    const reply = lastFail === 'timeout' ? 'The assistant took too long.' : lastFail === 'error' ? 'Something went wrong applying that.' : "Sorry, I couldn't reach the AI just now.";
    return json({ spec, applied: [], skipped: [], reply, source: 'fallback', reason: lastFail });
  }
  const { patch, result } = outcome;
  return json({
    spec: result.next,
    applied: result.applied,
    skipped: result.skipped,
    reply: clamp(patch.reply, 280) || 'Done.',
    source: 'ai',
  });
};

// Reject non-POST verbs cleanly.
export const GET: APIRoute = () => json({ error: 'method not allowed' }, 405);
