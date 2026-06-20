/**
 * Template catalog + types for the builder.
 * Each template is a distinct design lane: a different THEME + FONT + section
 * composition AND a different LAYOUT (hero style, alignment, card treatment,
 * density, banded sections) so they don't just look recolored.
 */

export type SectionType =
  | 'hero' | 'features' | 'gallery' | 'about' | 'contact' | 'cta'
  | 'steps' | 'stats' | 'pricing' | 'products';
export type ColorTheme = 'cyan' | 'warm' | 'indigo' | 'mono' | 'dark' | 'vivid' | 'rose' | 'teal' | 'sky';
export type FontPair = 'modern' | 'editorial' | 'mono';
export type AnimationPreset = 'none' | 'subtle' | 'lively';

export type HeroStyle = 'split' | 'centered' | 'overlay' | 'minimal' | 'bold' | 'editorial';
export type CardStyle = 'card' | 'plain' | 'bordered' | 'list';
export interface LayoutStyle {
  hero: HeroStyle;
  cards: CardStyle;
  align: 'left' | 'center';
  bands: boolean;          // alternate section backgrounds
  scale: 'sm' | 'md' | 'lg' | 'xl'; // headline scale
}

export interface ImageRef { presetId: string; label: string; alt: string }

export interface TextSlot {
  id: string;
  label: string;
  kind: 'eyebrow' | 'short' | 'long' | 'button';
  maxLen: number;
  default: string;
}

export interface ImageSlot {
  id: string;
  label: string;
  aspect: '16:9' | '4:3' | '1:1' | '3:4';
  default: ImageRef;
}

export interface SectionDef {
  id: string;
  type: SectionType;
  label: string;
  enabledByDefault: boolean;
  toggleable: boolean;
  textSlots: TextSlot[];
  imageSlots: ImageSlot[];
}

export interface Template {
  id: string;
  name: string;
  tagline: string;
  industryHint: string[];
  theme: ColorTheme;
  font: FontPair;
  animation: AnimationPreset;
  layout: LayoutStyle;
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
  sections: { id: string; enabled: boolean; text: Record<string, string>; images: Record<string, ImageRef> }[];
}

/* ── Theme presets ── */
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
  rose:   { label: 'builder.theme.rose',   swatch: '#d6447b', vars: { bg: '#fdf4f7', surface: '#fffafc', text: '#3a1322', muted: '#8a6273', accent: '#d6447b', accentText: '#ffffff', border: 'rgba(150,40,90,0.12)' } },
  teal:   { label: 'builder.theme.teal',   swatch: '#0d9488', vars: { bg: '#f2fbf9', surface: '#ffffff', text: '#0c2a26', muted: '#4f7a72', accent: '#0d9488', accentText: '#ffffff', border: 'rgba(13,148,136,0.14)' } },
  sky:    { label: 'builder.theme.sky',    swatch: '#2563eb', vars: { bg: '#f4f8ff', surface: '#ffffff', text: '#0f2747', muted: '#5a6b86', accent: '#2563eb', accentText: '#ffffff', border: 'rgba(37,99,235,0.12)' } },
};

/* ── Font presets ── */
export const fonts: Record<FontPair, { label: string; heading: string; body: string; href: string }> = {
  modern:    { label: 'builder.font.modern',    heading: "'Outfit'",          body: "'Work Sans'",     href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Work+Sans:wght@400;500;600&display=swap' },
  editorial: { label: 'builder.font.editorial', heading: "'Playfair Display'", body: "'Karla'",         href: 'https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap' },
  mono:      { label: 'builder.font.mono',      heading: "'Archivo'",         body: "'Space Grotesk'", href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap' },
};

/* ── slot helpers ── */
const t = (id: string, label: string, kind: TextSlot['kind'], maxLen: number, def: string): TextSlot => ({ id, label, kind, maxLen, default: def });
const im = (id: string, label: string, aspect: ImageSlot['aspect'], preset: string, lbl: string): ImageSlot => ({ id, label, aspect, default: { presetId: preset, label: lbl, alt: lbl } });

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
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), ...items.flatMap(([ti, bo], i) => [t(`item${i + 1}.title`, 'builder.slot.itemTitle', 'short', 40, ti), t(`item${i + 1}.body`, 'builder.slot.itemBody', 'long', 140, bo)])],
  imageSlots: [],
});
const steps = (title: string, items: [string, string][]): SectionDef => ({
  id: 'steps', type: 'steps', label: 'builder.section.steps', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), ...items.flatMap(([ti, bo], i) => [t(`step${i + 1}.title`, 'builder.slot.itemTitle', 'short', 40, ti), t(`step${i + 1}.body`, 'builder.slot.itemBody', 'long', 130, bo)])],
  imageSlots: [],
});
const stats = (items: [string, string][]): SectionDef => ({
  id: 'stats', type: 'stats', label: 'builder.section.stats', enabledByDefault: true, toggleable: true,
  textSlots: items.flatMap(([v, l], i) => [t(`stat${i + 1}.value`, 'builder.slot.statValue', 'short', 12, v), t(`stat${i + 1}.label`, 'builder.slot.statLabel', 'short', 28, l)]),
  imageSlots: [],
});
const pricing = (title: string, plans: [string, string, string][]): SectionDef => ({
  id: 'pricing', type: 'pricing', label: 'builder.section.pricing', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), ...plans.flatMap(([n, pr, fe], i) => [t(`plan${i + 1}.name`, 'builder.slot.planName', 'short', 30, n), t(`plan${i + 1}.price`, 'builder.slot.price', 'short', 20, pr), t(`plan${i + 1}.features`, 'builder.slot.bodyText', 'long', 160, fe)])],
  imageSlots: [],
});
const products = (title: string, items: [string, string, string][]): SectionDef => ({
  id: 'products', type: 'products', label: 'builder.section.products', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), ...items.flatMap(([, n, pr], i) => [t(`prod${i + 1}.name`, 'builder.slot.itemTitle', 'short', 40, n), t(`prod${i + 1}.price`, 'builder.slot.price', 'short', 16, pr)])],
  imageSlots: items.map(([preset, n], i) => im(`prod${i + 1}.img`, 'builder.slot.image', '1:1', preset, n)),
});
const gallery = (title: string, imgs: [string, string][]): SectionDef => ({
  id: 'gallery', type: 'gallery', label: 'builder.section.gallery', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title)],
  imageSlots: imgs.map(([preset, lbl], i) => im(`img${i + 1}`, 'builder.slot.image', '1:1', preset, lbl)),
});
const about = (title: string, body: string, preset: string, imgLabel: string): SectionDef => ({
  id: 'about', type: 'about', label: 'builder.section.about', enabledByDefault: true, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), t('body', 'builder.slot.bodyText', 'long', 320, body)],
  imageSlots: [im('media', 'builder.slot.image', '4:3', preset, imgLabel)],
});
const contact = (title: string, body: string, email: string, phone: string): SectionDef => ({
  id: 'contact', type: 'contact', label: 'builder.section.contact', enabledByDefault: true, toggleable: false,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), t('body', 'builder.slot.bodyText', 'long', 160, body), t('email', 'builder.slot.email', 'short', 60, email), t('phone', 'builder.slot.phone', 'short', 32, phone)],
  imageSlots: [],
});
const cta = (title: string, sub: string, button: string, enabled = true): SectionDef => ({
  id: 'cta', type: 'cta', label: 'builder.section.cta', enabledByDefault: enabled, toggleable: true,
  textSlots: [t('title', 'builder.slot.sectionTitle', 'short', 60, title), t('sub', 'builder.slot.subhead', 'long', 140, sub), t('button', 'builder.slot.button', 'button', 28, button)],
  imageSlots: [],
});

/* ── Templates — distinct theme + font + LAYOUT + composition ── */
export const templates: Template[] = [
  {
    id: 'restaurant', name: 'builder.tpl.restaurant.name', tagline: 'builder.tpl.restaurant.tagline',
    industryHint: ['restaurant', 'cafe', 'food', 'hospitality', 'bakery'],
    theme: 'warm', font: 'editorial', animation: 'lively',
    layout: { hero: 'overlay', cards: 'plain', align: 'center', bands: true, scale: 'lg' },
    defaultSiteName: 'Trattoria Sole', defaultTagline: 'Cucina italiana',
    sections: [
      hero('Since 1998', 'Taste the tradition', 'Fresh pasta made by hand every morning, in the heart of the old town.', 'Reserve a table', 'terracotta', 'Signature dish'),
      features('Why guests love us', [['Made fresh daily', 'No freezers, no shortcuts — only what the market gives us each morning.'], ['Family recipes', "Three generations of Nonna's recipes, unchanged and unhurried."], ['Warm hospitality', "You arrive a guest and leave family."]]),
      gallery('From our kitchen', [['sand', 'Antipasti'], ['citrus', 'Wood-fired'], ['plum', 'Dolci']]),
      about('Our story', 'What started as a tiny corner kitchen is now the table the whole street gathers around. Same hands, same fire, same love.', 'mesh', 'Our dining room'),
      contact('Visit us', 'Open Tue–Sun, 12:00–23:00', 'ciao@trattoriasole.it', '+39 02 1234 567'),
    ],
  },
  {
    id: 'agency', name: 'builder.tpl.agency.name', tagline: 'builder.tpl.agency.tagline',
    industryHint: ['agency', 'studio', 'consultancy', 'marketing', 'design'],
    theme: 'indigo', font: 'modern', animation: 'subtle',
    layout: { hero: 'split', cards: 'card', align: 'left', bands: false, scale: 'md' },
    defaultSiteName: 'Northwind', defaultTagline: 'A product studio',
    sections: [
      hero('Product studio', 'Launch faster, with less', 'We design and build web products that feel effortless — from first sketch to production.', 'Start a project', 'indigo', 'Product dashboard'),
      steps('How we work', [['Discover', 'A sharp workshop turns a fuzzy idea into a clear plan.'], ['Design & build', 'One senior team takes it from wireframe to production.'], ['Launch & grow', 'We stay on after launch — measure, refine, repeat.']]),
      stats([['120+', 'Projects shipped'], ['9 yrs', 'In business'], ['4.9/5', 'Client rating']]),
      features('What we do', [['Strategy', 'We turn fuzzy ideas into a sharp, buildable plan.'], ['Design', 'Interfaces people understand on the very first try.'], ['Engineering', "Clean, fast code that won't haunt you later."]]),
      contact("Let's build", 'Tell us what you are making.', 'hello@northwind.studio', ''),
      cta('Have a project in mind?', 'We reply within a day.', 'Get in touch'),
    ],
  },
  {
    id: 'portfolio', name: 'builder.tpl.portfolio.name', tagline: 'builder.tpl.portfolio.tagline',
    industryHint: ['portfolio', 'designer', 'photographer', 'creative', 'freelancer', 'artist'],
    theme: 'mono', font: 'mono', animation: 'subtle',
    layout: { hero: 'minimal', cards: 'list', align: 'left', bands: false, scale: 'xl' },
    defaultSiteName: 'Maya Ito', defaultTagline: 'Designer & art director',
    sections: [
      hero('Portfolio', 'Maya Ito — design & art direction', 'Independent designer crafting brands and interfaces with a quiet, deliberate hand.', 'View work', 'mono', 'Selected project'),
      gallery('Selected work', [['mono', 'Aroma — packaging'], ['slate', 'Field — identity'], ['plum', 'Lumen — app'], ['ocean', 'Praxis — web']]),
      about('About', "I've spent ten years helping founders and studios look as good as the work they do. Currently open to a few select projects.", 'mesh', 'Studio portrait'),
      contact('Get in touch', 'Open for freelance and collaborations.', 'studio@mayaito.com', ''),
    ],
  },
  {
    id: 'ecommerce', name: 'builder.tpl.ecommerce.name', tagline: 'builder.tpl.ecommerce.tagline',
    industryHint: ['ecommerce', 'shop', 'store', 'brand', 'retail', 'boutique', 'product'],
    theme: 'vivid', font: 'modern', animation: 'lively',
    layout: { hero: 'centered', cards: 'card', align: 'center', bands: true, scale: 'md' },
    defaultSiteName: 'Maker & Co', defaultTagline: 'Goods worth keeping',
    sections: [
      hero('New season', 'Things made to last', 'A tight, well-chosen range of everyday goods — designed once, made properly, shipped fast.', 'Shop the range', 'citrus', 'Hero product'),
      products('Best sellers', [['sand', 'The Daily Tote', '€48'], ['terracotta', 'Ceramic Mug', '€22'], ['sage', 'Linen Apron', '€36'], ['ocean', 'Travel Bottle', '€28']]),
      features('Why shop with us', [['Free delivery', 'Dispatched within a day, tracked to your door.'], ['30-day returns', 'Changed your mind? No fuss, send it back.'], ['Made responsibly', 'Small batches, real materials, fair makers.']]),
      pricing('Memberships', [['Guest', '€0', 'Standard checkout, tracked delivery, easy returns.'], ['Insider', '€9/yr', 'Free shipping, early drops, 10% off everything.'], ['Pro', '€29/yr', 'Everything in Insider plus priority support and gifts.']]),
      cta('Ready to shop?', 'New pieces drop every month.', 'Browse the shop'),
    ],
  },
  {
    id: 'app', name: 'builder.tpl.app.name', tagline: 'builder.tpl.app.tagline',
    industryHint: ['app', 'tool', 'crypto', 'trading', 'fintech', 'startup', 'platform'],
    theme: 'dark', font: 'modern', animation: 'lively',
    layout: { hero: 'bold', cards: 'card', align: 'center', bands: true, scale: 'xl' },
    defaultSiteName: 'Voltline', defaultTagline: 'Tools for serious traders',
    sections: [
      hero('Now live', 'Trade smarter, not harder', 'Professional-grade tools built for people who do this every day. One payment, lifetime access.', 'Get started', 'slate', 'App dashboard'),
      features('Built for power users', [['Lightning fast', 'Sub-second execution and a UI that never gets in your way.'], ['All in one place', 'Charts, alerts, automation and analytics, unified.'], ['Yours forever', 'No subscriptions. Pay once, keep every update.']]),
      steps('How it works', [['Connect', 'Link your account in two clicks — read-only, secure.'], ['Configure', 'Set your strategy with sane defaults and full control.'], ['Run', 'Let it work while you watch the numbers move.']]),
      pricing('One simple price', [['Starter', '$0', 'Core tools, manual mode, community support.'], ['Pro', '$199 once', 'Everything unlocked, lifetime access, priority help.']]),
      stats([['12k+', 'Active users'], ['$0', 'Monthly fees'], ['24/7', 'Uptime']]),
      cta('Ready to level up?', 'Join thousands of traders already on board.', 'Launch the app'),
    ],
  },
  {
    id: 'fitness', name: 'builder.tpl.fitness.name', tagline: 'builder.tpl.fitness.tagline',
    industryHint: ['gym', 'fitness', 'studio', 'yoga', 'coach', 'wellness', 'crossfit'],
    theme: 'cyan', font: 'modern', animation: 'lively',
    layout: { hero: 'overlay', cards: 'card', align: 'left', bands: false, scale: 'xl' },
    defaultSiteName: 'Forge Gym', defaultTagline: 'Train with intent',
    sections: [
      hero('Now enrolling', 'Stronger every week', 'Coached strength and conditioning in a community that actually shows up. First class is on us.', 'Book a free class', 'forest', 'Training floor'),
      stats([['2.5k+', 'Members'], ['40+', 'Classes / week'], ['12', 'Expert coaches']]),
      features('Programs', [['Strength', 'Barbell-focused coaching to build real, lasting power.'], ['Conditioning', 'High-energy sessions that leave you better than yesterday.'], ['Mobility', 'Move well, recover faster, train for the long game.']]),
      pricing('Memberships', [['Drop-in', '€15', 'One class, no commitment, all welcome.'], ['Unlimited', '€69/mo', 'Every class, open gym access, free assessments.'], ['Coached', '€129/mo', 'Unlimited plus a personal coach and plan.']]),
      gallery('Inside the box', [['slate', 'The floor'], ['forest', 'Rig & racks'], ['ocean', 'Recovery zone']]),
      contact('Come train', 'Open Mon–Sat, 6:00–21:00', 'hello@forgegym.com', '+1 555 0192'),
    ],
  },
  {
    id: 'beauty', name: 'builder.tpl.beauty.name', tagline: 'builder.tpl.beauty.tagline',
    industryHint: ['beauty', 'salon', 'spa', 'hair', 'nails', 'makeup', 'wellness'],
    theme: 'rose', font: 'editorial', animation: 'subtle',
    layout: { hero: 'editorial', cards: 'plain', align: 'center', bands: true, scale: 'lg' },
    defaultSiteName: 'Lumière Studio', defaultTagline: 'Hair & beauty',
    sections: [
      hero('Est. 2014', 'Look like yourself, only lovelier', 'A calm, modern salon for hair, skin and nails — unhurried, attentive, and quietly luxurious.', 'Book an appointment', 'plum', 'The studio'),
      features('What we offer', [['Hair', 'Cuts, colour and care by stylists who actually listen.'], ['Skin', 'Facials and treatments tailored to your skin, not a script.'], ['Nails', 'Meticulous manicures in a space made for slowing down.']]),
      gallery('The look book', [['plum', 'Colour work'], ['sand', 'Bridal'], ['mesh', 'Editorial'], ['mono', 'Everyday']]),
      pricing('Treatments', [['Cut & finish', 'from €45', 'Consultation, wash, cut and style.'], ['Colour', 'from €80', 'Full colour, gloss and a nourishing treatment.'], ['Spa facial', 'from €65', 'A 60-minute reset for tired skin.']]),
      about('Our space', 'A light-filled room, good coffee, and a team that treats every appointment like the highlight of your week.', 'plum', 'Inside Lumière'),
      contact('Visit us', 'Tue–Sat, 9:00–19:00', 'hello@lumierestudio.com', '+1 555 0147'),
    ],
  },
  {
    id: 'realestate', name: 'builder.tpl.realestate.name', tagline: 'builder.tpl.realestate.tagline',
    industryHint: ['real estate', 'property', 'realtor', 'homes', 'agency', 'rentals'],
    theme: 'teal', font: 'modern', animation: 'subtle',
    layout: { hero: 'split', cards: 'bordered', align: 'left', bands: false, scale: 'md' },
    defaultSiteName: 'Casa Nova', defaultTagline: 'Find your place',
    sections: [
      hero('Now listing', 'Homes you will actually love', 'Hand-picked properties and honest advice from a team that knows the neighbourhood inside out.', 'Browse listings', 'ocean', 'Featured home'),
      products('Featured listings', [['sand', 'Sunlit 2-bed loft', '€320,000'], ['sage', 'Garden townhouse', '€485,000'], ['ocean', 'Riverside apartment', '€275,000']]),
      features('Why work with us', [['Local experts', 'We live here too — we know what each street is really like.'], ['Honest advice', 'No pressure, no jargon, just straight answers.'], ['Smooth process', 'We handle the paperwork so you can focus on moving.']]),
      steps('Buying with us', [['Tell us your brief', 'Budget, area, must-haves — we listen first.'], ['View the shortlist', 'Only homes that actually fit, no time wasted.'], ['Make it yours', 'We negotiate and guide you to the keys.']]),
      stats([['600+', 'Homes sold'], ['21 days', 'Avg. time to offer'], ['98%', 'Asking achieved']]),
      contact('Talk to an agent', 'Mon–Sat, 9:00–18:00', 'hello@casanova.com', '+1 555 0173'),
    ],
  },
  {
    id: 'medical', name: 'builder.tpl.medical.name', tagline: 'builder.tpl.medical.tagline',
    industryHint: ['medical', 'clinic', 'dental', 'doctor', 'health', 'therapy', 'care'],
    theme: 'sky', font: 'modern', animation: 'subtle',
    layout: { hero: 'centered', cards: 'bordered', align: 'center', bands: false, scale: 'sm' },
    defaultSiteName: 'Vita Clinic', defaultTagline: 'Care you can trust',
    sections: [
      hero('Accepting new patients', 'Health care that listens', 'Modern, unhurried care from a team that treats you like a person, not a chart. Same-week appointments.', 'Book an appointment', 'ocean', 'Reception'),
      features('Our services', [['Primary care', 'Check-ups, screening and everyday health, all in one place.'], ['Specialists', 'On-site experts and fast, coordinated referrals.'], ['Diagnostics', 'Lab and imaging with results explained clearly.']]),
      steps('How it works', [['Book online', 'Pick a time that works in under a minute.'], ['Meet your doctor', 'Unhurried visits, real conversations.'], ['Stay on track', 'Follow-ups and reminders so nothing slips.']]),
      stats([['25k+', 'Patients cared for'], ['Same week', 'Appointments'], ['4.9/5', 'Patient rating']]),
      about('About the clinic', 'A calm, modern practice built around one idea: care should feel personal, clear and unrushed.', 'mesh', 'Our team'),
      contact('Get in touch', 'Mon–Fri, 8:00–18:00', 'care@vitaclinic.com', '+1 555 0110'),
    ],
  },
];

export const templateById = (id: string): Template | undefined => templates.find((x) => x.id === id);
