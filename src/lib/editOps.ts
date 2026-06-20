/**
 * Conversational-editing ops for the website builder — STEP 1 (no AI/network).
 *
 * The AI (step 2) will emit a PATCH: a list of typed `EditOp`s that we apply to
 * the current `DesignSpec` through this validated, immutable reducer. The op
 * vocabulary is CLOSED: it only covers things the renderer (LivePreview) can
 * actually do — no free-form HTML, no new section types, no colours outside the
 * theme enum, no image uploads (presets + descriptions only).
 *
 * Two validation layers:
 *  1. `EditOpSchema` (zod) — SHAPE only: the `op` tag + field presence/types,
 *     and `.strict()` so unknown fields are rejected (closed vocabulary).
 *  2. `validateOp(spec, op)` — SEMANTIC, spec-aware: section/slot existence,
 *     slot kind, maxLen, enum membership, toggleable, index range, preset id.
 *
 * Invalid ops are SKIPPED (never fatal) and reported. Valid-but-no-effect ops
 * (e.g. "move hero first" when it already is) are ALSO skipped with a "no
 * change" reason so they can't create empty undo/redo steps. So `applied` only
 * ever contains ops that actually changed the spec; structural identity
 * (`templateId`, `v`) is never changed by any op.
 */
import { z } from 'zod';
import { themes, fonts, templateById } from '../data/templates';
import type { ColorTheme, FontPair, AnimationPreset, DesignSpec, ImageRef } from '../data/templates';
import { presetById } from '../data/imageLibrary';

/* ── Closed value sets the renderer supports (runtime, for semantic checks) ── */
export const THEME_VALUES = Object.keys(themes) as ColorTheme[];
export const FONT_VALUES = Object.keys(fonts) as FontPair[];
export const ANIMATION_VALUES: AnimationPreset[] = ['none', 'subtle', 'lively'];

/** Lengths the spec serializer (lib/builder/spec.ts) clamps to — we reject over. */
export const META_MAX = { siteName: 60, tagline: 120 } as const;
export const IMAGE_LABEL_MAX = 60;

/* ── The closed ops vocabulary ── */
export type EditOp =
  | { op: 'setText'; sectionId: string; slotId: string; value: string }
  | { op: 'setTheme'; value: ColorTheme }
  | { op: 'setFont'; value: FontPair }
  | { op: 'setAnimation'; value: AnimationPreset }
  | { op: 'setSiteName'; value: string }
  | { op: 'setTagline'; value: string }
  | { op: 'toggleSection'; sectionId: string; enabled: boolean }
  | { op: 'reorderSection'; sectionId: string; toIndex: number }
  | { op: 'setImagePreset'; sectionId: string; slotId: string; presetId: string }
  | { op: 'setImageDesc'; sectionId: string; slotId: string; label: string };

export type EditOpType = EditOp['op'];

/* ── Zod SHAPE schema (enums/existence/ranges are validated semantically below,
      so a single bad-enum op is reported as skipped rather than failing parse). ── */
export const EditOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setText'), sectionId: z.string().min(1), slotId: z.string().min(1), value: z.string() }).strict(),
  z.object({ op: z.literal('setTheme'), value: z.string() }).strict(),
  z.object({ op: z.literal('setFont'), value: z.string() }).strict(),
  z.object({ op: z.literal('setAnimation'), value: z.string() }).strict(),
  z.object({ op: z.literal('setSiteName'), value: z.string() }).strict(),
  z.object({ op: z.literal('setTagline'), value: z.string() }).strict(),
  z.object({ op: z.literal('toggleSection'), sectionId: z.string().min(1), enabled: z.boolean() }).strict(),
  z.object({ op: z.literal('reorderSection'), sectionId: z.string().min(1), toIndex: z.number().int() }).strict(),
  z.object({ op: z.literal('setImagePreset'), sectionId: z.string().min(1), slotId: z.string().min(1), presetId: z.string().min(1) }).strict(),
  z.object({ op: z.literal('setImageDesc'), sectionId: z.string().min(1), slotId: z.string().min(1), label: z.string() }).strict(),
]);

export const EditOpsSchema = z.object({ ops: z.array(EditOpSchema) }).strict();
/** Shape-only inferred type (enum fields are plain strings until semantic check). */
export type EditOpInput = z.infer<typeof EditOpSchema>;

/* ── Semantic, spec-aware validation ── */
export type OpCheck = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): OpCheck => ({ ok: false, reason });
const OK: OpCheck = { ok: true };

/** Validate a (shape-valid) op against a concrete spec. Pure, no mutation. */
export function validateOp(spec: DesignSpec, op: EditOp): OpCheck {
  const tpl = templateById(spec.templateId);
  if (!tpl) return fail(`spec references unknown templateId "${spec.templateId}"`);

  switch (op.op) {
    case 'setTheme':
      return THEME_VALUES.includes(op.value) ? OK : fail(`invalid theme "${op.value}"`);
    case 'setFont':
      return FONT_VALUES.includes(op.value) ? OK : fail(`invalid font "${op.value}"`);
    case 'setAnimation':
      return ANIMATION_VALUES.includes(op.value) ? OK : fail(`invalid animation "${op.value}"`);
    case 'setSiteName':
      return op.value.length <= META_MAX.siteName ? OK : fail(`siteName length ${op.value.length} exceeds ${META_MAX.siteName}`);
    case 'setTagline':
      return op.value.length <= META_MAX.tagline ? OK : fail(`tagline length ${op.value.length} exceeds ${META_MAX.tagline}`);

    case 'setText': {
      const def = sectionDef(spec, tpl.id, op.sectionId);
      if (typeof def === 'string') return fail(def);
      const slot = def.textSlots.find((sl) => sl.id === op.slotId);
      if (!slot) return fail(`"${op.slotId}" is not a text slot of section "${op.sectionId}"`);
      if (op.value.length > slot.maxLen) return fail(`value length ${op.value.length} exceeds slot "${op.slotId}" maxLen ${slot.maxLen}`);
      return OK;
    }

    case 'setImagePreset': {
      const def = sectionDef(spec, tpl.id, op.sectionId);
      if (typeof def === 'string') return fail(def);
      if (!def.imageSlots.some((sl) => sl.id === op.slotId)) return fail(`"${op.slotId}" is not an image slot of section "${op.sectionId}"`);
      if (!presetById(op.presetId)) return fail(`unknown image preset "${op.presetId}"`);
      return OK;
    }

    case 'setImageDesc': {
      const def = sectionDef(spec, tpl.id, op.sectionId);
      if (typeof def === 'string') return fail(def);
      if (!def.imageSlots.some((sl) => sl.id === op.slotId)) return fail(`"${op.slotId}" is not an image slot of section "${op.sectionId}"`);
      if (op.label.length > IMAGE_LABEL_MAX) return fail(`image label length ${op.label.length} exceeds ${IMAGE_LABEL_MAX}`);
      return OK;
    }

    case 'toggleSection': {
      const def = sectionDef(spec, tpl.id, op.sectionId);
      if (typeof def === 'string') return fail(def);
      if (!def.toggleable) return fail(`section "${op.sectionId}" is not toggleable`);
      return OK;
    }

    case 'reorderSection': {
      const def = sectionDef(spec, tpl.id, op.sectionId);
      if (typeof def === 'string') return fail(def);
      if (op.toIndex < 0 || op.toIndex >= spec.sections.length) return fail(`toIndex ${op.toIndex} out of range 0..${spec.sections.length - 1}`);
      return OK;
    }
  }
}

/** Resolve a section that exists in BOTH the spec and its template, or a reason string. */
function sectionDef(spec: DesignSpec, tplId: string, sectionId: string) {
  if (!spec.sections.some((s) => s.id === sectionId)) return `section "${sectionId}" not in spec`;
  const def = templateById(tplId)!.sections.find((s) => s.id === sectionId);
  if (!def) return `section "${sectionId}" not in template "${tplId}"`;
  return def;
}

/** The template default image ref for a slot — used only if the spec lacks one. */
function defaultImageRef(spec: DesignSpec, sectionId: string, slotId: string): ImageRef {
  const slot = templateById(spec.templateId)?.sections.find((s) => s.id === sectionId)?.imageSlots.find((sl) => sl.id === slotId);
  return slot ? { ...slot.default } : { presetId: '', label: '', alt: '' };
}

/* ── Pure, immutable application of a single (already-validated) op.
      Returns the SAME spec reference when the op changes nothing (no-op), so
      callers can drop it from `applied` and avoid empty history steps. ── */
function applyOne(spec: DesignSpec, op: EditOp): DesignSpec {
  switch (op.op) {
    case 'setTheme':
      return spec.theme === op.value ? spec : { ...spec, theme: op.value };
    case 'setFont':
      return spec.font === op.value ? spec : { ...spec, font: op.value };
    case 'setAnimation':
      return spec.animation === op.value ? spec : { ...spec, animation: op.value };
    case 'setSiteName':
      return spec.meta.siteName === op.value ? spec : { ...spec, meta: { ...spec.meta, siteName: op.value } };
    case 'setTagline':
      return spec.meta.tagline === op.value ? spec : { ...spec, meta: { ...spec.meta, tagline: op.value } };

    case 'setText': {
      const sec = spec.sections.find((s) => s.id === op.sectionId);
      if (!sec || sec.text[op.slotId] === op.value) return spec;
      return { ...spec, sections: spec.sections.map((s) => (s.id === op.sectionId ? { ...s, text: { ...s.text, [op.slotId]: op.value } } : s)) };
    }

    case 'setImagePreset': {
      const sec = spec.sections.find((s) => s.id === op.sectionId);
      if (!sec) return spec;
      const cur = sec.images[op.slotId] ?? defaultImageRef(spec, op.sectionId, op.slotId);
      if (cur.presetId === op.presetId && sec.images[op.slotId]) return spec;
      return { ...spec, sections: spec.sections.map((s) => (s.id === op.sectionId ? { ...s, images: { ...s.images, [op.slotId]: { ...cur, presetId: op.presetId } } } : s)) };
    }

    case 'setImageDesc': {
      const sec = spec.sections.find((s) => s.id === op.sectionId);
      if (!sec) return spec;
      const cur = sec.images[op.slotId] ?? defaultImageRef(spec, op.sectionId, op.slotId);
      if (cur.label === op.label && cur.alt === op.label && sec.images[op.slotId]) return spec;
      return { ...spec, sections: spec.sections.map((s) => (s.id === op.sectionId ? { ...s, images: { ...s.images, [op.slotId]: { ...cur, label: op.label, alt: op.label } } } : s)) };
    }

    case 'toggleSection': {
      const sec = spec.sections.find((s) => s.id === op.sectionId);
      if (!sec || sec.enabled === op.enabled) return spec;
      return { ...spec, sections: spec.sections.map((s) => (s.id === op.sectionId ? { ...s, enabled: op.enabled } : s)) };
    }

    case 'reorderSection': {
      const from = spec.sections.findIndex((s) => s.id === op.sectionId);
      if (from < 0 || from === op.toIndex) return spec;
      const arr = spec.sections.slice();
      const [moved] = arr.splice(from, 1);
      arr.splice(op.toIndex, 0, moved);
      return { ...spec, sections: arr };
    }
  }
}

/* ── The reducer ── */
export interface SkippedOp {
  op: unknown;
  reason: string;
}
export interface ApplyResult {
  next: DesignSpec;
  applied: EditOp[];
  skipped: SkippedOp[];
}

/**
 * Apply a batch of ops to a spec. Pure & immutable — never mutates `spec`.
 * Each op is shape-validated (zod) then semantically validated against the
 * *evolving* spec (ops apply in order). Invalid ops and valid-but-no-effect ops
 * are skipped + reported; only ops that actually change the spec land in
 * `applied`.
 */
export function applyOps(spec: DesignSpec, ops: readonly EditOp[]): ApplyResult {
  let next = spec;
  const applied: EditOp[] = [];
  const skipped: SkippedOp[] = [];

  for (const raw of ops) {
    const parsed = EditOpSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push({ op: raw, reason: `malformed op: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}` });
      continue;
    }
    const op = parsed.data as EditOp; // enum soundness enforced by validateOp below
    const check = validateOp(next, op);
    if (!check.ok) {
      skipped.push({ op, reason: check.reason });
      continue;
    }
    const after = applyOne(next, op);
    if (after === next) {
      skipped.push({ op, reason: 'no change (spec already in that state)' });
      continue;
    }
    next = after;
    applied.push(op);
  }

  return { next, applied, skipped };
}

/**
 * Convenience entry point for untrusted input (e.g. the step-2 /api/edit body):
 * validates the `{ ops: [...] }` envelope once, then applies. On a malformed
 * envelope returns the spec unchanged with a single skipped entry.
 */
export function applyOpsFromUnknown(spec: DesignSpec, raw: unknown): ApplyResult {
  const parsed = EditOpsSchema.safeParse(raw);
  if (!parsed.success) {
    return { next: spec, applied: [], skipped: [{ op: raw, reason: `malformed ops payload: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}` }] };
  }
  return applyOps(spec, parsed.data.ops as EditOp[]);
}
