import type { Template, DesignSpec, ColorTheme, FontPair, AnimationPreset } from '../../data/templates';
import { templateById } from '../../data/templates';

export const SPEC_VERSION = 1 as const;

const THEMES: ColorTheme[] = ['cyan', 'warm', 'indigo', 'mono', 'dark', 'vivid'];
const FONTS: FontPair[] = ['modern', 'editorial', 'mono'];
const ANIMS: AnimationPreset[] = ['none', 'subtle', 'lively'];

export function clampText(v: string, max: number): string {
  return v.length > max ? v.slice(0, max) : v;
}

export function defaultSpecFromTemplate(tpl: Template): DesignSpec {
  return {
    v: SPEC_VERSION,
    templateId: tpl.id,
    theme: tpl.theme,
    font: tpl.font,
    animation: tpl.animation,
    meta: { siteName: tpl.defaultSiteName, tagline: tpl.defaultTagline },
    sections: tpl.sections.map((s) => ({
      id: s.id,
      enabled: s.enabledByDefault,
      text: Object.fromEntries(s.textSlots.map((sl) => [sl.id, sl.default])),
      images: Object.fromEntries(s.imageSlots.map((sl) => [sl.id, { ...sl.default }])),
    })),
  };
}

/** Sanitize an untrusted spec (e.g. decoded from a preview-link URL param). */
export function validateSpec(input: unknown): DesignSpec | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const tpl = templateById(String(raw.templateId));
  if (!tpl) return null;

  const base = defaultSpecFromTemplate(tpl);
  const theme = THEMES.includes(raw.theme as ColorTheme) ? (raw.theme as ColorTheme) : base.theme;
  const font = FONTS.includes(raw.font as FontPair) ? (raw.font as FontPair) : base.font;
  const animation = ANIMS.includes(raw.animation as AnimationPreset) ? (raw.animation as AnimationPreset) : base.animation;

  const meta = raw.meta as Record<string, unknown> | undefined;
  const inSections = Array.isArray(raw.sections) ? (raw.sections as Record<string, unknown>[]) : [];

  const sections = base.sections.map((bs) => {
    const def = tpl.sections.find((s) => s.id === bs.id)!;
    const inSec = inSections.find((x) => x?.id === bs.id);
    const text = { ...bs.text };
    const inText = (inSec?.text as Record<string, unknown>) || {};
    for (const sl of def.textSlots) {
      const v = inText[sl.id];
      if (typeof v === 'string') text[sl.id] = clampText(v, sl.maxLen);
    }
    const images = { ...bs.images };
    const inImg = (inSec?.images as Record<string, Record<string, unknown>>) || {};
    for (const sl of def.imageSlots) {
      const v = inImg[sl.id];
      if (v && typeof v === 'object') {
        images[sl.id] = {
          presetId: typeof v.presetId === 'string' ? v.presetId : sl.default.presetId,
          label: clampText(String(v.label ?? sl.default.label), 60),
          alt: clampText(String(v.alt ?? sl.default.alt), 80),
        };
      }
    }
    const enabledIn = inSec?.enabled;
    const enabled = typeof enabledIn === 'boolean' ? (def.toggleable ? enabledIn : true) : bs.enabled;
    return { id: bs.id, enabled, text, images };
  });

  return {
    v: SPEC_VERSION,
    templateId: tpl.id,
    theme,
    font,
    animation,
    meta: {
      siteName: clampText(String(meta?.siteName ?? base.meta.siteName), 60),
      tagline: clampText(String(meta?.tagline ?? base.meta.tagline), 120),
    },
    sections,
  };
}
