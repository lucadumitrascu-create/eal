/**
 * Placeholder "image" library for the builder.
 * No uploads, no external assets, no licensing: each preset is a CSS background
 * rendered as a labelled tile in the live preview. The user picks a look and
 * types a description; EAL receives the description as the real signal.
 */
export interface ImagePreset {
  id: string;
  css: string;   // CSS background value
  dark: boolean; // true => overlay/label uses light text
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

export const presetById = (id: string | null | undefined): ImagePreset | null =>
  imagePresets.find((p) => p.id === id) ?? null;

export const defaultPresetId = imagePresets[0].id;
