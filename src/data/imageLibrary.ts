/**
 * Placeholder "image" library for the builder.
 * No uploads, no external assets, no licensing: each preset is a CSS background
 * rendered as a labelled tile in the live preview. The user picks a look and
 * types a description; EAL receives the description as the real signal.
 */
export interface ImagePreset {
  id: string;
  css: string;   // CSS background value (gradient fallback / swatch tint)
  dark: boolean; // true => overlay/label uses light text
  url?: string;  // optional real photo; when set, the tile renders the photo instead of the gradient
  label?: string; // human label for the picker
}

export const imagePresets: ImagePreset[] = [
  { id: 'sand',       css: 'linear-gradient(135deg,#fdecd2 0%,#f2c98f 100%)', dark: false },
  { id: 'terracotta', css: 'linear-gradient(135deg,#eab38c 0%,#c25e44 100%)', dark: true },
  { id: 'citrus',     css: 'linear-gradient(135deg,#fdeeb0 0%,#efb457 100%)', dark: false },
  { id: 'sage',       css: 'linear-gradient(135deg,#dfe9d6 0%,#9bb592 100%)', dark: false },
  { id: 'forest',     css: 'linear-gradient(135deg,#1f3d34 0%,#2f5f4f 100%)', dark: true },
  { id: 'ocean',      css: 'linear-gradient(135deg,#d2eef0 0%,#73b9c4 100%)', dark: false },
  { id: 'indigo',     css: 'linear-gradient(135deg,#e3e6f8 0%,#a9b0ea 100%)', dark: false },
  { id: 'slate',      css: 'linear-gradient(135deg,#3a3f55 0%,#222536 100%)', dark: true },
  { id: 'plum',       css: 'linear-gradient(160deg,#f0d9e6 0%,#c489a6 100%)', dark: false },
  { id: 'mono',       css: 'linear-gradient(135deg,#f1f1f3 0%,#c7c7cd 100%)', dark: false },
  { id: 'mesh',       css: 'radial-gradient(circle at 30% 25%,#ffd9c0,transparent 55%),radial-gradient(circle at 75% 70%,#b9d9e8,transparent 55%),linear-gradient(135deg,#f3ece6,#e6dcd2)', dark: false },
];

/* Real niche photos, curated from Unsplash (searched in-browser) and served from the
 * Unsplash CDN — fast and reliable, so each slot shows a distinct, niche-relevant image.
 * `css` stays as a tinted fallback shown while the photo loads / if it is unavailable. */
const photo = (id: string, unsplashId: string, css: string, dark = true, label = ''): ImagePreset => ({
  id, css, dark, label,
  url: `https://images.unsplash.com/photo-${unsplashId}?w=1200&q=70&auto=format&fit=crop`,
});

export const photoPresets: ImagePreset[] = [
  // restaurant
  photo('ph-dish',      '1532117472055-4d0734b51f31', 'linear-gradient(135deg,#c25e44,#7a3322)', true,  'Signature dish'),
  photo('ph-antipasti', '1571167366136-b57e07761625', 'linear-gradient(135deg,#eab38c,#c25e44)', false, 'Antipasti'),
  photo('ph-woodfire',  '1534649643822-e7431de08af6', 'linear-gradient(135deg,#efb457,#b4553b)', true,  'Wood-fired'),
  photo('ph-dolci',     '1620475676913-9497df261cc3', 'linear-gradient(160deg,#f0d9e6,#c489a6)', false, 'Dolci'),
  photo('ph-trattoria', '1669428145308-9c45ae9897b7', 'linear-gradient(135deg,#3a2a22,#221712)', true,  'Dining room'),
  // agency / app — workspaces & screens
  photo('ph-workspace', '1497215842964-222b430dc094', 'linear-gradient(135deg,#a9b0ea,#4f46e5)', true,  'Workspace'),
  photo('ph-appdash',   '1597673030062-0a0f1a801a31', 'linear-gradient(135deg,#3a3f55,#141a2b)', true,  'App screen'),
  // portfolio
  photo('ph-proj1',     '1561070791-2526d30994b5',    'linear-gradient(135deg,#f1f1f3,#c7c7cd)', false, 'Project'),
  photo('ph-proj2',     '1572044162444-ad60f128bdea', 'linear-gradient(135deg,#3a3f55,#222536)', true,  'Identity'),
  photo('ph-proj3',     '1519408469771-2586093c3f14', 'linear-gradient(160deg,#f0d9e6,#c489a6)', false, 'Type'),
  photo('ph-proj4',     '1611241893603-3c359704e0ee', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Web'),
  photo('ph-portrait',  '1506863530036-1efeddceb993', 'linear-gradient(135deg,#e6dcd2,#c7b8a8)', false, 'Portrait'),
  // ecommerce
  photo('ph-shop',      '1554104683-c7063687d649',    'linear-gradient(135deg,#fdeeb0,#efb457)', false, 'Hero product'),
  photo('ph-tote',      '1554104707-a76b270e4bbb',    'linear-gradient(135deg,#fdecd2,#f2c98f)', false, 'Tote'),
  photo('ph-mug',       '1573770012830-7cf1777db19c', 'linear-gradient(135deg,#eab38c,#c25e44)', true,  'Mug'),
  photo('ph-apron',     '1572635148818-ef6fd45eb394', 'linear-gradient(135deg,#dfe9d6,#9bb592)', false, 'Apron'),
  photo('ph-bottle',    '1510179510324-77418b788861', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Bottle'),
  // fitness
  photo('ph-gymfloor',  '1534438327276-14e5300c3a48', 'linear-gradient(135deg,#1f3d34,#10211c)', true,  'Training floor'),
  photo('ph-rig',       '1517836357463-d25dfeac3438', 'linear-gradient(135deg,#3a3f55,#222536)', true,  'Rig & racks'),
  photo('ph-recovery',  '1526506118085-60ce8714f8c5', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Recovery'),
  photo('ph-class',     '1605296867304-46d5465a13f1', 'linear-gradient(135deg,#2f5f4f,#1f3d34)', true,  'Class'),
  // beauty
  photo('ph-salon',     '1633681926022-84c23e8cb2d6', 'linear-gradient(160deg,#f0d9e6,#c489a6)', false, 'The studio'),
  photo('ph-colour',    '1629397685944-7073f5589754', 'linear-gradient(160deg,#e8c6d8,#c489a6)', false, 'Colour'),
  photo('ph-bridal',    '1675034743339-0b0747047727', 'linear-gradient(135deg,#fdecd2,#f2c98f)', false, 'Bridal'),
  photo('ph-editorial', '1695527081848-1e46c06e6458', 'linear-gradient(135deg,#f1f1f3,#c7c7cd)', false, 'Editorial'),
  photo('ph-nails',     '1626383137804-ff908d2753a2', 'linear-gradient(160deg,#f0d9e6,#d6a6c0)', false, 'Nails'),
  photo('ph-inside',    '1619367901998-73b3a70b3898', 'linear-gradient(135deg,#f3ece6,#e6dcd2)', false, 'Inside'),
  // real estate
  photo('ph-home',      '1580587771525-78b9dba3b914', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Featured home'),
  photo('ph-loft',      '1613490493576-7fde63acd811', 'linear-gradient(135deg,#fdecd2,#f2c98f)', false, 'Loft'),
  photo('ph-townhouse', '1628012209120-d9db7abf7eab', 'linear-gradient(135deg,#dfe9d6,#9bb592)', false, 'Townhouse'),
  photo('ph-riverside', '1600596542815-ffad4c1539a9', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Riverside'),
  // medical
  photo('ph-reception', '1638202993928-7267aad84c31', 'linear-gradient(135deg,#f4f8ff,#a9c4ea)', false, 'Reception'),
  photo('ph-team',      '1612276529731-4b21494e6d71', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Our team'),
  // general — abstract / gradient / texture
  photo('ph-abs1', '1635776062360-af423602aff3', 'linear-gradient(135deg,#a9b0ea,#6d5fc4)', true,  'Abstract 1'),
  photo('ph-abs2', '1604079628040-94301bb21b91', 'linear-gradient(135deg,#f0d9e6,#c489a6)', false, 'Abstract 2'),
  photo('ph-abs3', '1579546929518-9e396f3cc809', 'linear-gradient(135deg,#efb457,#ef4b2b)', true,  'Abstract 3'),
  photo('ph-abs4', '1635776062127-d379bfcba9f8', 'linear-gradient(135deg,#73b9c4,#2f5f7a)', true,  'Abstract 4'),
  photo('ph-abs5', '1604076913837-52ab5629fba9', 'linear-gradient(135deg,#ffd9c0,#c25e44)', true,  'Abstract 5'),
  photo('ph-abs6', '1620641788421-7a1c342ea42e', 'linear-gradient(135deg,#3a3f55,#141a2b)', true,  'Abstract 6'),
  photo('ph-abs7', '1644426358812-879f02d1d867', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Abstract 7'),
  photo('ph-abs8', '1635776063043-ab23b4c226f6', 'linear-gradient(135deg,#c489a6,#7a3b5e)', true,  'Abstract 8'),
  // general — nature / landscape
  photo('ph-nat1', '1532019333101-b0f43c16a912', 'linear-gradient(135deg,#9bb592,#2f5f4f)', true,  'Nature 1'),
  photo('ph-nat2', '1523248948644-586f1ab2a83e', 'linear-gradient(135deg,#dfe9d6,#9bb592)', false, 'Nature 2'),
  photo('ph-nat3', '1705875999426-b2899c13a70c', 'linear-gradient(135deg,#d2eef0,#73b9c4)', false, 'Nature 3'),
  photo('ph-nat4', '1626169572088-5959632d71e5', 'linear-gradient(135deg,#fdeeb0,#efb457)', false, 'Nature 4'),
  photo('ph-nat5', '1614462099399-bd81bac74f16', 'linear-gradient(135deg,#3a3f55,#222536)', true,  'Nature 5'),
  photo('ph-nat6', '1524037581787-4715802662f9', 'linear-gradient(135deg,#ffd9c0,#c25e44)', true,  'Nature 6'),
];

/** Everything selectable in the builder: real photos first, abstract gradients after. */
export const allPresets: ImagePreset[] = [...photoPresets, ...imagePresets];

export const presetById = (id: string | null | undefined): ImagePreset | null =>
  allPresets.find((p) => p.id === id) ?? null;

export const defaultPresetId = imagePresets[0].id;
