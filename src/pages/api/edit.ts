import type { APIRoute } from 'astro';
import { validateSpec } from '../../lib/builder/spec';
import { applyOps, type EditOp } from '../../lib/editOps';
import { buildEditMessages, parseModelPatch, type ChatMessage } from '../../lib/ai/editPrompt';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

// Model choice is RELIABILITY over raw smarts: the 70B on NVIDIA's free tier has
// wildly variable queue latency (a 3-word request would randomly take >45s), so
// even with retries it timed out constantly. The 8B answers in ~1-5s and is served
// far more reliably; the strict prompt + server-side applyOps validation keep its
// output safe and on-vocabulary. Bump to meta/llama-3.3-70b-instruct or
// nvidia/llama-3.1-nemotron-70b-instruct here if you later move off the free tier.
const MODEL = 'meta/llama-3.1-8b-instruct';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const ATTEMPTS = 2; // one automatic retry — absorbs a single slow/queued/5xx attempt
const PER_ATTEMPT_MS = 20000; // 2 x 20s < the 60s function maxDuration
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

type ModelFail = 'timeout' | 'upstream' | 'parse' | 'error';

/**
 * Call NVIDIA with one automatic retry. Each attempt has its own AbortController so
 * a stalled connection (incl. a hung body read) is aborted, not left to the 60s wall.
 * Retries a timeout or a 5xx (transient queue/cold-start); does not retry a 4xx/parse.
 */
async function callModel(key: string, messages: ChatMessage[]): Promise<{ content: string } | { fail: ModelFail }> {
  let lastFail: ModelFail = 'error';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PER_ATTEMPT_MS);
    try {
      const res = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.2, // low: we want a precise, deterministic patch
          max_tokens: 1800, // room for a broad multi-slot rewrite without truncating the JSON
          response_format: { type: 'json_object' },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[edit] attempt ${attempt}: nvidia ${res.status} ${errBody.slice(0, 150)}`);
        lastFail = 'upstream';
        if (res.status >= 500 && attempt < ATTEMPTS) continue; // transient -> retry
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
      console.error(`[edit] attempt ${attempt}: ${aborted ? 'timeout' : 'exception'} ${String(e)}`);
      lastFail = aborted ? 'timeout' : 'error';
      if (attempt < ATTEMPTS) continue; // retry a timeout / transient network error
      return { fail: lastFail };
    } finally {
      clearTimeout(timer);
    }
  }
  return { fail: lastFail };
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

  const key = getKey();
  console.log(`[edit] keyPresent=${!!key} history=${history.length}`);
  if (!key) {
    console.error('[edit] fallback: NVIDIA_API_KEY missing in runtime env');
    return json({ spec, applied: [], skipped: [], reply: "The AI editor isn't configured right now.", source: 'fallback', reason: 'unconfigured' });
  }

  const out = await callModel(key, buildEditMessages(spec, message, history));
  if ('fail' in out) {
    const reply = out.fail === 'timeout' ? 'The assistant took too long.' : out.fail === 'error' ? 'Something went wrong applying that.' : "Sorry, I couldn't reach the AI just now.";
    return json({ spec, applied: [], skipped: [], reply, source: 'fallback', reason: out.fail });
  }

  const patch = parseModelPatch(out.content);
  if (!patch) {
    console.error(`[edit] fallback: unparseable model output: ${out.content.slice(0, 200)}`);
    return json({ spec, applied: [], skipped: [], reply: "I couldn't understand that — try rephrasing?", source: 'fallback', reason: 'parse' });
  }

  // The model is UNTRUSTED: applyOps validates every op and skips the bad ones.
  const result = applyOps(spec, patch.ops as unknown as readonly EditOp[]);
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
