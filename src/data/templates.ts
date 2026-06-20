/**
 * Template catalog + types for the builder.
 * Each template is a distinct design "lane": a different theme + font + section
 * composition so they don't feel same-y. Slot `label`s are i18n keys (resolved
 * in the editor); slot `default`s are English sample content the user edits.
 */

export type SectionType =
  | 'hero' | 'features' | 'gallery' | 'about' | 'contact' | 'cta'
  | 'steps' | 'stats' | 'pricing' | 'products';
export type ColorTheme = 'cyan' | 'warm' | 'indigo' | 'mono' | 'dark' | 'vivid';
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
  dark:   { label: 'builder.theme.dark',   swatch: '#7c5cff', vars: { bg: '#0b0e17', surface: '#141a2b', text: '#eef1f8', muted: '#9aa6c2', accent: '#7c5cff', accentText: '#ffffff', border: 'rgba(255,255,255,0.10)' } },
  vivid:  { label: 'builder.theme.vivid',  swatch: '#ff5a3c', vars: { bg: '#fff7f4', surface: '#ffffff', text: '#1a1110', muted: '#7a6a64', accent: '#ef4b2b', accentText: '#ffffff', border: 'rgba(0,0,0,0.08)' } },
};

/* ── Font presets (loaded on demand in the preview) ── */
export const fonts: Record<FontPair, { label: string; heading: string; body: string; href: string }> = {
  modern:    { label: 'builder.font.modern',    heading: "'Outfit'",          body: "'Work Sans'",     href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap' },
  editorial: { label: 'builder.font.editorial', heading: "'Playfair Display'", body: "'Karla'",         href: 'https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap' },
  mono:      { label: 'builder.font.mono',      heading: "'Archivo'",         body: "'Space Grotesk'", href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap' },
};

/* ── slot helpers ── */
const t = (id: string, label: string, kind: TextSlot['kind'], maxLen: number, def: string): TextSlot =>
  ({ id, label, kind, maxLen, default: def });
const im = (id: string, label: string, aspect: ImageSlot['aspect'], preset: string, lbl: string): ImageSlot =>
  ({ id, label, aspect, default: { presetId: preset, label: lbl, alt: lbl } });

/* ── section builders ── */
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

const steps = (title: string, items: [string, string][]): SectionDef => ({
  id: 'steps', type: 'steps', label: 'builder.section.steps', enabledByDefault: true, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    ...items.flatMap(([ti, bo], i) => [
      t(`step${i + 1}.title`, 'builder.slot.itemTitle', 'short', 40, ti),
      t(`step${i + 1}.body`, 'builder.slot.itemBody', 'long', 130, bo),
    ]),
  ],
  imageSlots: [],
});

const stats = (items: [string, string][]): SectionDef => ({
  id: 'stats', type: 'stats', label: 'builder.section.stats', enabledByDefault: true, toggleable: true,
  textSlots: items.flatMap(([v, l], i) => [
    t(`stat${i + 1}.value`, 'builder.slot.statValue', 'short', 12, v),
    t(`stat${i + 1}.label`, 'builder.slot.statLabel', 'short', 28, l),
  ]),
  imageSlots: [],
});

const pricing = (title: string, plans: [string, string, string][]): SectionDef => ({
  id: 'pricing', type: 'pricing', label: 'builder.section.pricing', enabledByDefault: true, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    ...plans.flatMap(([n, pr, fe], i) => [
      t(`plan${i + 1}.name`, 'builder.slot.planName', 'short', 30, n),
      t(`plan${i + 1}.price`, 'builder.slot.price', 'short', 20, pr),
      t(`plan${i + 1}.features`, 'builder.slot.bodyText', 'long', 160, fe),
    ]),
  ],
  imageSlots: [],
});

const products = (title: string, items: [string, string, string][]): SectionDef => ({
  id: 'products', type: 'products', label: 'builder.section.products', enabledByDefault: true, toggleable: true,
  textSlots: [
    t('title', 'builder.slot.sectionTitle', 'short', 60, title),
    ...items.flatMap(([, n, pr], i) => [
      t(`prod${i + 1}.name`, 'builder.slot.itemTitle', 'short', 40, n),
      t(`prod${i + 1}.price`, 'builder.slot.price', 'short', 16, pr),
    ]),
  ],
  imageSlots: items.map(([preset, n], i) => im(`prod${i + 1}.img`, 'builder.slot.image', '1:1', preset, n)),
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

/* ── Templates — each a distinct theme + font + section composition ── */
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
    ],
  },
  {
    id: 'agency',
    name: 'builder.tpl.agency.name',
    tagline: 'builder.tpl.agency.tagline',
    industryHint: ['agency', 'studio', 'consultancy', 'marketing', 'design'],
    theme: 'indigo', font: 'modern', animation: 'subtle',
    defaultSiteName: 'Northwind', defaultTagline: 'A product studio',
    sections: [
      hero('Product studio', 'Launch faster, with less', 'We design and build web products that feel effortless — from first sketch to production.', 'Start a project', 'indigo', 'Product dashboard'),
      steps('How we work', [
        ['Discover', 'A short, sharp workshop turns a fuzzy idea into a clear plan.'],
        ['Design & build', 'One senior team takes it from wireframe to production.'],
        ['Launch & grow', 'We stay on after launch — measure, refine, repeat.'],
      ]),
      stats([['120+', 'Projects shipped'], ['9 yrs', 'In business'], ['4.9/5', 'Client rating']]),
      features('What we do', [
        ['Strategy', 'We turn fuzzy ideas into a sharp, buildable plan.'],
        ['Design', 'Interfaces people understand on the very first try.'],
        ['Engineering', "Clean, fast code that won't haunt you in six months."],
      ]),
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
      gallery('Selected work', [['mono', 'Aroma — packaging'], ['slate', 'Field — identity'], ['plum', 'Lumen — app'], ['ocean', 'Praxis — web']]),
      about('About', "I've spent ten years helping founders and studios look as good as the work they do. Currently open to a few select projects.", 'mesh', 'Studio portrait'),
      contact('Get in touch', 'Open for freelance and collaborations.', 'studio@mayaito.com', ''),
    ],
  },
  {
    id: 'ecommerce',
    name: 'builder.tpl.ecommerce.name',
    tagline: 'builder.tpl.ecommerce.tagline',
    industryHint: ['ecommerce', 'shop', 'store', 'brand', 'retail', 'boutique', 'product'],
    theme: 'vivid', font: 'modern', animation: 'lively',
    defaultSiteName: 'Maker & Co', defaultTagline: 'Goods worth keeping',
    sections: [
      hero('New season', 'Things made to last', 'A tight, well-chosen range of everyday goods — designed once, made properly, shipped fast.', 'Shop the range', 'citrus', 'Hero product shot'),
      products('Best sellers', [
        ['sand', 'The Daily Tote', '€48'],
        ['terracotta', 'Ceramic Mug', '€22'],
        ['sage', 'Linen Apron', '€36'],
        ['ocean', 'Travel Bottle', '€28'],
      ]),
      features('Why shop with us', [
        ['Free delivery', 'Dispatched within a day, tracked to your door.'],
        ['30-day returns', 'Changed your mind? No fuss, send it back.'],
        ['Made responsibly', 'Small batches, real materials, fair makers.'],
      ]),
      pricing('Memberships', [
        ['Guest', '€0', 'Standard checkout, tracked delivery, easy returns.'],
        ['Insider', '€9/yr', 'Free shipping, early drops, 10% off everything.'],
        ['Pro', '€29/yr', 'Everything in Insider plus priority support and gifts.'],
      ]),
      cta('Ready to shop?', 'New pieces drop every month.', 'Browse the shop'),
    ],
  },
  {
    id: 'app',
    name: 'builder.tpl.app.name',
    tagline: 'builder.tpl.app.tagline',
    industryHint: ['app', 'tool', 'crypto', 'trading', 'fintech', 'startup', 'platform'],
    theme: 'dark', font: 'modern', animation: 'lively',
    defaultSiteName: 'Voltline', defaultTagline: 'Tools for serious traders',
    sections: [
      hero('Now live', 'Trade smarter, not harder', 'Professional-grade tools built for people who do this every day. One payment, lifetime access.', 'Get started', 'slate', 'App dashboard'),
      features('Built for power users', [
        ['Lightning fast', 'Sub-second execution and a UI that never gets in your way.'],
        ['Everything in one place', 'Charts, alerts, automation and analytics, unified.'],
        ['Yours forever', 'No subscriptions. Pay once, keep every future update.'],
      ]),
      steps('How it works', [
        ['Connect', 'Link your account in two clicks — read-only, secure.'],
        ['Configure', 'Set your strategy with sane defaults and full control.'],
        ['Run', 'Let it work while you watch the numbers move.'],
      ]),
      pricing('One simple price', [
        ['Starter', '$0', 'Core tools, manual mode, community support.'],
        ['Pro', '$199 once', 'Everything unlocked, lifetime access, priority help.'],
      ]),
      stats([['12k+', 'Active users'], ['$0', 'Monthly fees'], ['24/7', 'Uptime']]),
      cta('Ready to level up?', 'Join thousands of traders already on board.', 'Launch the app'),
    ],
  },
  {
    id: 'fitness',
    name: 'builder.tpl.fitness.name',
    tagline: 'builder.tpl.fitness.tagline',
    industryHint: ['gym', 'fitness', 'studio', 'yoga', 'coach', 'wellness', 'crossfit'],
    theme: 'cyan', font: 'modern', animation: 'lively',
    defaultSiteName: 'Forge Gym', defaultTagline: 'Train with intent',
    sections: [
      hero('Now enrolling', 'Stronger every week', 'Coached strength and conditioning in a community that actually shows up. First class is on us.', 'Book a free class', 'forest', 'Training floor'),
      stats([['2.5k+', 'Members'], ['40+', 'Classes / week'], ['12', 'Expert coaches']]),
      features('Programs', [
        ['Strength', 'Barbell-focused coaching to build real, lasting power.'],
        ['Conditioning', 'High-energy sessions that leave you better than yesterday.'],
        ['Mobility', 'Move well, recover faster, train for the long game.'],
      ]),
      pricing('Memberships', [
        ['Drop-in', '€15', 'One class, no commitment, all welcome.'],
        ['Unlimited', '€69/mo', 'Every class, open gym access, free assessments.'],
        ['Coached', '€129/mo', 'Unlimited plus a personal coach and plan.'],
      ]),
      gallery('Inside the box', [['slate', 'The floor'], ['forest', 'Rig & racks'], ['ocean', 'Recovery zone']]),
      contact('Come train', 'Open Mon–Sat, 6:00–21:00', 'hello@forgegym.com', '+1 555 0192'),
    ],
  },
];

export const templateById = (id: string): Template | undefined => templates.find((x) => x.id === id);
