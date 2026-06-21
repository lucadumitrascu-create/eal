/**
 * Prompt construction + model-output parsing for the /api/edit endpoint (step 2).
 * Pure & network-free so it can be unit-tested. The model is UNTRUSTED — whatever
 * ops it emits are run through applyOps (the security boundary), so this only has
 * to (a) tell the model the closed vocabulary + current spec, and (b) defensively
 * extract `{ ops, reply }` from possibly-messy output.
 */
import { templateById } from '../../data/templates';
import type { DesignSpec } from '../../data/templates';
import { allPresets } from '../../data/imageLibrary';
import { THEME_VALUES, FONT_VALUES, ANIMATION_VALUES } from '../editOps';
import { defById } from '../builder/spec';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface ModelPatch {
  ops: unknown[];
  reply: string;
}

const PRESET_IDS = allPresets.map((p) => p.id);
const q = (s: unknown) => JSON.stringify(String(s ?? '').slice(0, 140)); // bounded + quoted

const SYSTEM = [
  'You are the editing engine for a website builder. Translate the user request into a PATCH:',
  'a JSON list of typed operations applied to the current design. Use ONLY these operations and the',
  'EXACT sectionId / slotId / values listed below — never invent sections, slots, themes, fonts or presets.',
  '',
  'OPERATIONS (each entry of "ops"):',
  '- {"op":"setText","sectionId":ID,"slotId":ID,"value":STRING}   // value length <= that slot\'s maxLen',
  '- {"op":"setTheme","value":THEME}',
  '- {"op":"setFont","value":FONT}',
  '- {"op":"setAnimation","value":ANIMATION}',
  '- {"op":"setSiteName","value":STRING}    // <= 60',
  '- {"op":"setTagline","value":STRING}     // <= 120',
  '- {"op":"toggleSection","sectionId":ID,"enabled":BOOL}   // only sections marked "toggleable"',
  '- {"op":"reorderSection","sectionId":ID,"toIndex":INT}   // 0-based target position',
  '- {"op":"setImagePreset","sectionId":ID,"slotId":ID,"presetId":PRESET}',
  '- {"op":"setImageDesc","sectionId":ID,"slotId":ID,"label":STRING}   // describe the picture; <= 60',
  '',
  `THEMES: ${THEME_VALUES.join(', ')}`,
  `FONTS: ${FONT_VALUES.join(', ')}`,
  `ANIMATIONS: ${ANIMATION_VALUES.join(', ')}`,
  `IMAGE PRESETS: ${PRESET_IDS.join(', ')}`,
  '',
  'Reply with ONLY valid JSON of the shape {"ops":[...],"reply":STRING}.',
  '',
  'RULES — follow them strictly:',
  '- The user may write in ANY language (English, Romanian, French, German, Spanish, Italian, ...).',
  '  Understand the request in that language, and write any new copy AND the "reply" in the SAME language.',
  '- The earlier messages are the conversation so far. The latest user message may be ANSWERING your',
  '  previous clarifying question (e.g. "all of them", "the hero one", "yes") — interpret it in that',
  '  context, then act; do not ask the same question again.',
  '- Copy every sectionId, slotId, theme, font, animation and presetId EXACTLY from the lists above.',
  '  If you are not certain an op is valid, OMIT it. Never invent or guess an id.',
  '- Make the SMALLEST set of ops that satisfies the request. Touch ONLY fields the user asked about;',
  '  never change unrelated fields, and never write the SAME value into several slots.',
  '- A clear instruction to restyle or rewrite ALL or MANY text fields in a stated tone (e.g. "make all',
  '  the copy more playful", "rewrite everything in an Italian-mafia tone") is NOT ambiguous: emit one',
  '  setText per text slot you are changing, each with NEW distinct copy in that tone within its maxLen.',
  '  For such broad rewrites, focus on the PROMINENT copy (siteName, tagline, headlines, section titles',
  '  and main bodies) and keep every value SHORT — a few words or one line. Do not pad; brevity is faster',
  '  and fits the limits. You need not touch tiny/secondary labels (prices, emails, button micro-copy).',
  '- Only when the target or the change is genuinely unclear (you cannot tell WHICH section/slot/value),',
  '  return "ops":[] and ask ONE short clarifying question in "reply" — do not guess.',
  '- If the request cannot be done with these operations at all, return "ops":[] and say so briefly.',
  '- "reply" is ONE short sentence in the user\'s language and must HONESTLY describe only what your ops do.',
  '  If "ops" is empty, do not claim you changed anything.',
  '- Respect every maxLen. Write any copy in the user\'s language.',
  '- No markdown, no code fences, no text outside the JSON.',
].join('\n');

export function buildEditMessages(spec: DesignSpec, message: string, history: ChatMessage[] = []): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'user', content: `${specSummary(spec)}\n\nUSER REQUEST: ${message}` },
  ];
}

/** Compact, model-readable view of the editable surface of the current spec. */
export function specSummary(spec: DesignSpec): string {
  const tpl = templateById(spec.templateId);
  const head =
    `CURRENT DESIGN (template "${spec.templateId}"): siteName=${q(spec.meta.siteName)}, tagline=${q(spec.meta.tagline)}, ` +
    `theme=${spec.theme}, font=${spec.font}, animation=${spec.animation}.`;
  if (!tpl) return head;

  const lines = spec.sections.map((sec, i) => {
    const def = defById(tpl, sec.id); // template sections + universal-block catalog
    if (!def) return `[${i}] ${sec.id} (unknown section)`;
    let out = `[${i}] ${sec.id} (${def.type}, ${sec.enabled ? 'enabled' : 'hidden'}, ${def.toggleable ? 'toggleable' : 'locked'})`;
    const texts = def.textSlots.map((sl) => `${sl.id}(<=${sl.maxLen})=${q(sec.text[sl.id] ?? '')}`).join(' | ');
    const imgs = def.imageSlots.map((sl) => { const r = sec.images[sl.id]; return `${sl.id}: preset=${r?.presetId ?? '?'} label=${q(r?.label ?? '')}`; }).join(' | ');
    if (texts) out += `\n    text: ${texts}`;
    if (imgs) out += `\n    image: ${imgs}`;
    return out;
  });
  return `${head}\nSECTIONS (in order):\n${lines.join('\n')}`;
}

/** Defensively pull `{ ops, reply }` out of possibly-messy model output. */
export function parseModelPatch(content: string): ModelPatch | null {
  const obj = extractJson(content);
  if (!obj || typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  const ops = Array.isArray(rec.ops) ? rec.ops : [];
  const reply = typeof rec.reply === 'string' ? rec.reply : '';
  return { ops, reply };
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function extractJson(text: string): unknown {
  const t = text.trim();
  // Fast path: response_format:json_object means the whole reply is usually JSON.
  const direct = tryParse(t);
  if (direct !== undefined) return direct;
  // Fallback for code-fenced / prose-wrapped output: take the slice from the first
  // "{" and shrink from the last "}" inward until it parses. This finds the real
  // object even when the model appends a second brace-y blob after it (a greedy
  // first-to-last-brace match would over-capture and fail).
  const start = t.indexOf('{');
  if (start < 0) return null;
  for (let end = t.lastIndexOf('}'); end > start; end = t.lastIndexOf('}', end - 1)) {
    const parsed = tryParse(t.slice(start, end + 1));
    if (parsed !== undefined) return parsed;
  }
  return null;
}
