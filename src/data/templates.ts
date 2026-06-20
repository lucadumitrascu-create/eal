/**
 * Template catalog + types for the builder.
 * Each template is a distinct design "lane" (palette + fonts informed by the
 * ui-ux-pro-max design-intelligence skill). Slot `label`s are i18n keys
 * (resolved in the editor); slot `default`s are English sample content the
 * user edits/replaces.
 */

export type SectionType = 'hero' | 'features' | 'gallery' | 'about' | 'contact' | 'cta';
export type ColorTheme = 'cyan' | 'warm' | 'indigo' | 'mono';
export type FontPair = 'modern' | 'editorial' | 'mono';
export type AnimationPreset = 'none' | 'subtle' | 'lively';

export interface ImageRef {
  presetId: string;
  label: string;
  alt: string;
}

export interface TextSlot {
  id: string;
  label: string; // i18n key
  kind: 'eyebrow' | 'short' | 'long' | 'button';
  maxLen: number;
  default: string;
}

export interface ImageSlot {
  id: string;
  label: string; // i18n key
  aspect: '16:9' | '4:3' | '1:1' | '3:4';
  default: ImageRef;
}

export interface SectionDef {
  id: string;
  type: SectionType;
  label: string; // i18n key (builder.section.*)
  enabledByDefault: boolean;
  toggleable: boolean;
  textSlots: TextSlot[];
  imageSlots: ImageSlot[];
}

export interface Template {
  id: string;
  name: string;    // i18n key
  tagline: string; // i18n key
  industryHint: string[];
  theme: ColorTheme;
  font: FontPair;
  animation: AnimationPreset;
  defaultSiteName: string;
  defaultTagline: string;
  sections: SectionDef[];
}

export interface DesignSpec {
  v: 1;
  templateId: string;
  theme: ColorTheme;
  font: FontPair;
  animation: AnimationPreset;
  meta: { siteName: string; tagline: string };
  sections: {
    id: string;
    enabled: boolean;
    text: Record<string, string>;
    images: Record<string, ImageRef>;
  }[];
}

/* ── Theme presets (applied as CSS vars on the preview wrapper) ── */
export interface ThemeVars {
  bg: string; surface: string; text: string; muted: string;
  accent: string; accentText: string; border: string;
}
export const themes: Record<ColorTheme, { label: string; swatch: string; vars: ThemeVars }> = {
  cyan:   { label: 'builder.theme.cyan',   swatch: '#0891B2', vars: { bg: '#f0fdfa', surface: '#ffffff', text: '#0c1a2a', muted: '#4b6478', accent: '#0e7490', accentText: '#ffffff', border: 'rgba(0,0,0,0.08)' } },
  warm:   { label: 'builder.theme.warm',   swatch: '#C0654A', vars: { bg: '#fdf6f2', surface: '#fffaf6', text: '#3a1d14', muted: '#8a6b5e', accent: '#b4553b', accentText: '#ffffff', border: 'rgba(120,60,40,0.14)' } },
  indigo: { label: 'builder.theme.indigo', swatch: '#6366F1', vars: { bg: '#f3f4fd', surface: '#ffffff', text: '#1f2147', muted: '#5b5f86', accent: '#4f46e5', accentText: '#ffffff', border: 'rgba(80,70,180,0.14)' } },
  mono:   { label: 'builder.theme.mono',   swatch: '#18181B', vars: { bg: '#fafafa', surface: '#ffffff', text: '#09090b', muted: '#52525b', accent: '#18181b', accentText: '#ffffff', border: 'rgba(0,0,0,0.10)' } },
};

/* ── Font presets (loaded on demand in the preview) ── */
export const fonts: Record<FontPair, { label: string; heading: string; body: string; href: string }> = {
  modern:    { label: 'builder.font.modern',    heading: "'Outfit'",          body: "'Work Sans'",     href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap' },
  editorial: { label: 'builder.font.editorial', heading: "'Playfair Display'", body: "'Karla'",         href: 'https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap' },
  mono:      { label: 'builder.font.mono',      heading: "'Archivo'",         body: "'Space Grotesk'", href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap' },
};

/* ── helpers ── */
const t = (id: string, label: string, kind: TextSlot['kind'], maxLen: number, def: string): TextSlot =>
  ({ id, label, kind, maxLen, default: def });
const im = (id: string, label: string, aspect: ImageSlot['aspect'], preset: string, lbl: string): ImageSlot =>
  ({ id, label, aspect, default: { presetId: preset, label: lbl, alt: lbl } });

const hero = (eyebrow: string, headline: string, subhead: string, cta: string, preset: string, imgLabel: string): SectionDef => ({
  id: 'hero', type: 'hero', label: 'builder.section.hero', enabledByDefault: true, toggleable: false,
  textSlots: [
    t('eyebrow', 'builder.slot.eyebrow', 'eyebrow', 40, eyebrow),
    t('headline', 'builder.slot.headline', 'short', 64, headline),
    t('subhead', 'builder.slot.subhead', 'long', 180, subhead),
    t('cta', 'builder.slot.button', 'button', 28, cta),
  ],
  imageSlots: [im('media', 'builder.slot.image', '16:9', preset, imgLabel)],
});

const features = (title: string, items: [string, string][]): SectionDef => ({
  id: 'features', type: 'features', label: 'builder.section.features', enabledByDefault: true, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    ...items.flatMap(([ti, bo], i) => [
      t(`item${i + 1}.title`, 'builder.slot.itemTitle', 'short', 40, ti),
      t(`item${i + 1}.body`, 'builder.slot.itemBody', 'long', 140, bo),
    ]),
  ],
  imageSlots: [],
});

const gallery = (title: string, imgs: [string, string][]): SectionDef => ({
  id: 'gallery', type: 'gallery', label: 'builder.section.gallery', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title)],
  imageSlots: imgs.map(([preset, lbl], i) => im(`img${i + 1}`, 'builder.slot.image', '1:1', preset, lbl)),
});

const about = (title: string, body: string, preset: string, imgLabel: string): SectionDef => ({
  id: 'about', type: 'about', label: 'builder.section.about', enabledByDefault: true, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    t('body', 'builder.slot.bodyText', 'long', 320, body),
  ],
  imageSlots: [im('media', 'builder.slot.image', '4:3', preset, imgLabel)],
});

const contact = (title: string, body: string, email: string, phone: string): SectionDef => ({
  id: 'contact', type: 'contact', label: 'builder.section.contact', enabledByDefault: true, toggleable: false,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    t('body', 'builder.slot.bodyText', 'long', 160, body),
    t('email', 'builder.slot.email', 'short', 60, email),
    t('phone', 'builder.slot.phone', 'short', 32, phone),
  ],
  imageSlots: [],
});

const cta = (title: string, sub: string, button: string, enabled = true): SectionDef => ({
  id: 'cta', type: 'cta', label: 'builder.section.cta', enabledByDefault: enabled, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    t('sub', 'builder.slot.subhead', 'long', 140, sub),
    t('button', 'builder.slot.button', 'button', 28, button),
  ],
  imageSlots: [],
});

/* ── Templates ── */
export const templates: Template[] = [
  {
    id: 'restaurant',
    name: 'builder.tpl.restaurant.name',
    tagline: 'builder.tpl.restaurant.tagline',
    industryHint: ['restaurant', 'cafe', 'food', 'hospitality', 'bakery'],
    theme: 'warm', font: 'editorial', animation: 'lively',
    defaultSiteName: 'Trattoria Sole', defaultTagline: 'Cucina italiana',
    sections: [
      hero('Since 1998', 'Taste the tradition', 'Fresh pasta made by hand every morning, in the heart of the old town.', 'Reserve a table', 'terracotta', 'Signature pasta dish'),
      features('Why guests love us', [
        ['Made fresh daily', 'No freezers, no shortcuts — only what the market gives us each morning.'],
        ['Family recipes', "Three generations of Nonna's recipes, unchanged and unhurried."],
        ['Warm hospitality', "You arrive a guest and leave family. That's the whole idea."],
      ]),
      gallery('From our kitchen', [['sand', 'Antipasti'], ['citrus', 'Wood-fired'], ['plum', 'Dolci']]),
      about('Our story', 'What started as a tiny corner kitchen is now the table the whole street gathers around. Same hands, same fire, same love.', 'mesh', 'Our dining room'),
      contact('Visit us', 'Open Tue–Sun, 12:00–23:00', 'ciao@trattoriasole.it', '+39 02 1234 567'),
      cta('Hungry yet?', 'Book your table in under a minute.', 'Reserve now'),
    ],
  },
  {
    id: 'agency',
    name: 'builder.tpl.agency.name',
    tagline: 'builder.tpl.agency.tagline',
    industryHint: ['agency', 'saas', 'software', 'startup', 'studio', 'tech'],
    theme: 'indigo', font: 'modern', animation: 'subtle',
    defaultSiteName: 'Northwind', defaultTagline: 'Software that ships',
    sections: [
      hero('Product studio', 'Launch faster, with less', 'We design and build web apps that feel effortless — from first sketch to production.', 'Start a project', 'indigo', 'Product dashboard'),
      features('What we do', [
        ['Strategy', 'We turn fuzzy ideas into a sharp, buildable plan.'],
        ['Design', 'Interfaces people understand on the very first try.'],
        ['Engineering', "Clean, fast code that won't haunt you in six months."],
      ]),
      gallery('Recent work', [['ocean', 'Fintech app'], ['indigo', 'Booking platform'], ['mono', 'Analytics suite']]),
      about('How we work', 'Small team, senior people, no handoffs. You talk to the people doing the work, every single week.', 'slate', 'The team at work'),
      contact("Let's build", 'Tell us what you are making.', 'hello@northwind.studio', ''),
      cta('Have a project in mind?', 'We reply within a day.', 'Get in touch'),
    ],
  },
  {
    id: 'portfolio',
    name: 'builder.tpl.portfolio.name',
    tagline: 'builder.tpl.portfolio.tagline',
    industryHint: ['portfolio', 'designer', 'photographer', 'creative', 'freelancer', 'artist'],
    theme: 'mono', font: 'mono', animation: 'subtle',
    defaultSiteName: 'Maya Ito', defaultTagline: 'Designer & art director',
    sections: [
      hero('Portfolio', 'Maya Ito', 'Independent designer crafting brands and interfaces with a quiet, deliberate hand.', 'View work', 'mono', 'Selected project cover'),
      features('What I do', [
        ['Brand identity', 'Marks, systems and guidelines that age well.'],
        ['Web & UI', 'Editorial, accessible interfaces with real craft.'],
        ['Art direction', 'A cohesive visual world across every touchpoint.'],
      ]),
      gallery('Selected work', [['mono', 'Aroma — packaging'], ['slate', 'Field — identity'], ['plum', 'Lumen — app'], ['ocean', 'Praxis — web']]),
      about('About', "I've spent ten years helping founders and studios look as good as the work they do. Currently open to a few select projects.", 'mesh', 'Studio portrait'),
      contact('Get in touch', 'Open for freelance and collaborations.', 'studio@mayaito.com', ''),
      cta('Like what you see?', "Let's make something together.", 'Email me', false),
    ],
  },
];

export const templateById = (id: string): Template | undefined => templates.find((x) => x.id === id);
