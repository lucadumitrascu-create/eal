/**
 * Localized default COPY for the builder templates (and universal blocks), so a
 * Romanian/German/... visitor sees a template pre-filled in their language instead
 * of English. Keys are `<ownerId>.<sectionId>.<slotId>` (ownerId = templateId, or
 * `__universal` for add-on blocks), plus `<templateId>.__siteName` / `.__tagline`.
 * English is the source of truth (the strings live in templates.ts) — this only
 * holds the ro/de/fr/es/it overlays; any missing key falls back to English.
 */
import type { Lang } from '../lib/builder/i18n';
import content from './templateContent.json';

type Dict = Record<string, string>;
const CONTENT = content as Partial<Record<Lang, Dict>>;

/** The localized default for a slot, or the English `fallback` when absent. */
export function localizedDefault(lang: Lang, ownerId: string, path: string, fallback: string): string {
  if (lang === 'en') return fallback;
  return CONTENT[lang]?.[`${ownerId}.${path}`] ?? fallback;
}
