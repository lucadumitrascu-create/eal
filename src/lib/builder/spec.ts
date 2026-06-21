import type { Template, DesignSpec, ColorTheme, FontPair, AnimationPreset, SectionDisplay, HeroPos, HeroWidth, HeroVAlign, ButtonStyle, ImageRef, SectionDef } from '../../data/templates';
import { templateById, universalBlocks } from '../../data/templates';
import { defaultPresetId } from '../../data/imageLibrary';
import { localizedDefault } from '../../data/templateContent';
import type { Lang } from './i18n';

/** Build a fresh section-spec object from a section definition, with its default
    copy localized to `lang` (ownerId = the templateId, or `__universal`). */
export function sectionFromDef(s: SectionDef, lang: Lang = 'en', ownerId: string = s.id): DesignSpec['sections'][number] {
  return {
    id: s.id,
    enabled: s.enabledByDefault,
    display: s.display,
    text: Object.fromEntries(s.textSlots.map((sl) => [sl.id, localizedDefault(lang, ownerId, `${s.id}.${sl.id}`, sl.default)])),
    images: Object.fromEntries(
      s.imageSlots.map((sl) => {
        const label = localizedDefault(lang, ownerId, `${s.id}.${sl.id}.label`, sl.default.label);
        return [sl.id, { presetId: sl.default.presetId, label, alt: label }];
      }),
    ),
  };
}

/** A section definition by id, from the template's own sections or the universal catalog. */
export function defById(tpl: Template, id: string): SectionDef | undefined {
  return tpl.sections.find((s) => s.id === id) ?? universalBlocks.find((s) => s.id === id);
}

export const SPEC_VERSION = 1 as const;

// Exported so the edit-ops validator (lib/editOps.ts) shares the EXACT same
// closed value sets as validateSpec — no drift between the two.
export const THEMES: ColorTheme[] = ['cyan', 'warm', 'indigo', 'mono', 'dark', 'vivid', 'rose', 'teal', 'sky'];
export const FONTS: FontPair[] = ['modern', 'editorial', 'mono', 'grotesk', 'humanist'];
export const ANIMS: AnimationPreset[] = ['none', 'fade', 'rise', 'slide', 'sweep', 'zoom', 'blur', 'flip', 'pop'];
const DISPLAYS: SectionDisplay[] = ['grid', 'carousel', 'marquee', 'masonry', 'list', 'rows', 'split', 'cards', 'numbered'];
const POS: HeroPos[] = ['right', 'left', 'full', 'fullLeft', 'fullRight', 'top', 'bannerTop', 'frame', 'none'];
const WIDTHS: HeroWidth[] = ['sm', 'md', 'lg', 'full'];
const VALIGNS: HeroVAlign[] = ['top', 'mid', 'bottom'];
const BTNS: ButtonStyle[] = ['solid', 'outline', 'pill', 'underline'];

export function clampText(v: string, max: number): string {
  return v.length > max ? v.slice(0, max) : v;
}

export function defaultSpecFromTemplate(tpl: Template, lang: Lang = 'en'): DesignSpec {
  return {
    v: SPEC_VERSION,
    templateId: tpl.id,
    theme: tpl.theme,
    font: tpl.font,
    animation: tpl.animation,
    meta: {
      siteName: localizedDefault(lang, tpl.id, '__siteName', tpl.defaultSiteName),
      tagline: localizedDefault(lang, tpl.id, '__tagline', tpl.defaultTagline),
    },
    sections: tpl.sections.map((s) => sectionFromDef(s, lang, tpl.id)),
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
  const btn = BTNS.includes(raw.btn as ButtonStyle) ? (raw.btn as ButtonStyle) : undefined;
  const nav = Array.isArray(raw.nav) ? raw.nav.filter((x): x is string => typeof x === 'string').slice(0, 6).map((x) => clampText(x, 24)) : undefined;

  const meta = raw.meta as Record<string, unknown> | undefined;
  const inSections = Array.isArray(raw.sections) ? (raw.sections as Record<string, unknown>[]) : [];

  // Drive by the incoming order/set (so reorder + deletes persist); fall back to template order.
  const baseById = new Map(base.sections.map((b) => [b.id, b]));
  const source: Record<string, unknown>[] = inSections.length ? inSections : (base.sections as unknown as Record<string, unknown>[]);
  const seen = new Set<string>();
  const sections = source
    .map((inSec) => {
      const id = String(inSec?.id ?? '');
      const def = defById(tpl, id);
      if (!def || seen.has(id)) return null;
      const bs = baseById.get(id) ?? sectionFromDef(def);
      seen.add(id);

      const inText = (inSec.text as Record<string, unknown>) || {};
      const text: Record<string, string> = {};
      for (const [k, v] of Object.entries(inText)) {
        if (typeof v !== 'string') continue;
        const sl = def.textSlots.find((s) => s.id === k);
        text[k] = clampText(v, sl?.maxLen ?? 200);
      }
      if (Object.keys(text).length === 0) Object.assign(text, bs.text);

      const inImg = (inSec.images as Record<string, Record<string, unknown>>) || {};
      const images: Record<string, ImageRef> = {};
      for (const [k, v] of Object.entries(inImg)) {
        if (!v || typeof v !== 'object') continue;
        images[k] = {
          presetId: typeof v.presetId === 'string' ? v.presetId : defaultPresetId,
          label: clampText(String(v.label ?? ''), 60),
          alt: clampText(String(v.alt ?? v.label ?? ''), 80),
        };
      }
      if (!('images' in inSec)) Object.assign(images, bs.images);

      const inDisplay = inSec.display as SectionDisplay | undefined;
      const display = DISPLAYS.includes(inDisplay as SectionDisplay) ? inDisplay : bs.display;
      const inPos = inSec.pos as HeroPos | undefined;
      const pos = POS.includes(inPos as HeroPos) ? inPos : bs.pos;
      const inWidth = inSec.width as HeroWidth | undefined;
      const width = WIDTHS.includes(inWidth as HeroWidth) ? inWidth : bs.width;
      const inVAlign = inSec.valign as HeroVAlign | undefined;
      const valign = VALIGNS.includes(inVAlign as HeroVAlign) ? inVAlign : bs.valign;

      const inOff = inSec.offsets as Record<string, { x: unknown; y: unknown }> | undefined;
      let offsets: Record<string, { x: number; y: number }> | undefined;
      if (inOff && typeof inOff === 'object') {
        const o: Record<string, { x: number; y: number }> = {};
        const cl = (n: number) => Math.max(-800, Math.min(800, Math.round(n)));
        for (const [k, v] of Object.entries(inOff)) {
          if (!v || typeof v !== 'object') continue;
          const x = Number(v.x), y = Number(v.y);
          if (Number.isFinite(x) && Number.isFinite(y)) o[k] = { x: cl(x), y: cl(y) };
        }
        if (Object.keys(o).length) offsets = o;
      }
      offsets = offsets ?? bs.offsets;

      const inW = inSec.widths as Record<string, unknown> | undefined;
      let widths: Record<string, number> | undefined;
      if (inW && typeof inW === 'object') {
        const wm: Record<string, number> = {};
        for (const [k, v] of Object.entries(inW)) {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) wm[k] = Math.max(60, Math.min(1600, Math.round(n)));
        }
        if (Object.keys(wm).length) widths = wm;
      }
      widths = widths ?? bs.widths;

      const inColors = inSec.colors as Record<string, unknown> | undefined;
      let colors: Record<string, string> | undefined;
      if (inColors && typeof inColors === 'object') {
        const cm: Record<string, string> = {};
        for (const [k, v] of Object.entries(inColors)) {
          if (typeof v === 'string' && /^(#[0-9a-fA-F]{3,8}|rgb)/.test(v)) cm[k] = v.slice(0, 30);
        }
        if (Object.keys(cm).length) colors = cm;
      }
      colors = colors ?? bs.colors;

      const enabledIn = inSec.enabled;
      const enabled = typeof enabledIn === 'boolean' ? (def.toggleable ? enabledIn : true) : bs.enabled;
      return { id, enabled, display, pos, width, valign, offsets, widths, colors, text, images };
    })
    .filter(Boolean) as DesignSpec['sections'];
  if (sections.length === 0) return base;

  return {
    v: SPEC_VERSION,
    templateId: tpl.id,
    theme,
    font,
    animation,
    btn,
    nav,
    meta: {
      siteName: clampText(String(meta?.siteName ?? base.meta.siteName), 60),
      tagline: clampText(String(meta?.tagline ?? base.meta.tagline), 120),
    },
    sections,
  };
}

const ALL_LANGS: Lang[] = ['en', 'ro', 'de', 'fr', 'es', 'it'];
const canon = (s: DesignSpec | null) => JSON.stringify(validateSpec(s));

/** True if `spec` is still an UNEDITED template default (in any of the 6 languages).
    Used to decide whether it's safe to re-localize on a site-language change —
    edited content is never matched, so the user's work is never clobbered. */
export function isPristineDefault(spec: DesignSpec): boolean {
  const tpl = templateById(spec.templateId);
  if (!tpl) return false;
  const cur = canon(spec);
  return ALL_LANGS.some((l) => canon(defaultSpecFromTemplate(tpl, l)) === cur);
}
