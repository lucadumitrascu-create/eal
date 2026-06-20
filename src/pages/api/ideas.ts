import type { APIRoute } from 'astro';
import { fallbackIdeas } from '../../lib/ai/fallbackIdeas';

// Make ONLY this route a Vercel serverless function; the rest of the site stays static.
export const prerender = false;

const MODEL = 'meta/llama-3.1-8b-instruct';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clamp = (v: unknown, n: number) => String(v ?? '').slice(0, n);

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function getKey(): string | undefined {
  const fromImport = (import.meta as any)?.env?.NVIDIA_API_KEY;
  const fromProcess = typeof process !== 'undefined' ? process.env?.NVIDIA_API_KEY : undefined;
  return fromImport || fromProcess;
}

export const POST: APIRoute = async ({ request }) => {
  // Same-origin guard: block requests from other websites' browsers.
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
    } catch {
      return json({ error: 'forbidden' }, 403);
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
  if (!company) return json({ error: 'company required' }, 400);

  const key = getKey();
  console.log(`[ideas] keyPresent=${!!key}`);
  // No key configured -> graceful static fallback (never hard-fail).
  if (!key) {
    console.error('[ideas] fallback: NVIDIA_API_KEY missing in runtime env');
    return json({ ...fallbackIdeas(industry, company), source: 'fallback' });
  }

  const sys =
    'You are a website copywriter for small businesses. Reply with ONLY valid JSON of the shape ' +
    '{"headline":string,"subhead":string,"sections":[{"title":string,"body":string}],"cta":string}. ' +
    'Limits: headline <= 60 chars, subhead <= 160, exactly 3 sections (title <= 40, body <= 140), cta <= 24. ' +
    `Tone: ${tone}. No markdown, no commentary, JSON only.`;
  const usr = `Business name: ${company}. Industry / what they do: ${industry || 'general small business'}. Write homepage copy.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: usr },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[ideas] fallback: nvidia status ${res.status} ${errBody.slice(0, 200)}`);
      return json({ ...fallbackIdeas(industry, company), source: 'fallback' });
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    if (!parsed) {
      console.error(`[ideas] fallback: unparseable model output: ${content.slice(0, 200)}`);
      return json({ ...fallbackIdeas(industry, company), source: 'fallback' });
    }

    return json({
      headline: clamp(parsed.headline, 60),
      subhead: clamp(parsed.subhead, 160),
      sections: Array.isArray(parsed.sections)
        ? parsed.sections.slice(0, 3).map((s: any) => ({ title: clamp(s?.title, 40), body: clamp(s?.body, 140) }))
        : [],
      cta: clamp(parsed.cta, 24),
      source: 'ai',
    });
  } catch (e) {
    clearTimeout(timer);
    console.error(`[ideas] fallback: exception ${String(e)}`);
    return json({ ...fallbackIdeas(industry, company), source: 'fallback' });
  }
};

// Reject non-POST verbs cleanly.
export const GET: APIRoute = () => json({ error: 'method not allowed' }, 405);
