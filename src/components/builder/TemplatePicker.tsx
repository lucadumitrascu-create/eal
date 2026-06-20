import type { ReactNode } from 'react';
import { templates } from '../../data/templates';
import { useT } from '../../lib/builder/i18n';

/** A representative line-icon per template (Lucide-style), instead of a colour swatch. */
const ICONS: Record<string, ReactNode> = {
  restaurant: <><path d="M3 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2" /><path d="M6 2v20" /><path d="M19 2v8a3 3 0 0 1-3 3v9" /></>,
  agency: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
  portfolio: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  ecommerce: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  app: <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></>,
  fitness: <><circle cx="5" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 12h10" /><path d="M5 9.5v5" /><path d="M19 9.5v5" /></>,
  beauty: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88" /><path d="M14.47 14.48 20 20" /><path d="M8.12 8.12 12 12" /></>,
  realestate: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  medical: <><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2z" /></>,
};
const DEFAULT_ICON = <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></>;

export default function TemplatePicker({ current, onSelect }: { current: string; onSelect: (id: string) => void }) {
  const t = useT();
  return (
    <div className="grid gap-2.5">
      {templates.map((tpl) => {
        const active = tpl.id === current;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl.id)}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              active
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-hover)]'
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                active ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
              aria-hidden="true"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[tpl.id] ?? DEFAULT_ICON}
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--color-text)]">{t(tpl.name)}</span>
              <span className="block truncate text-xs text-[var(--color-text-muted)]">{t(tpl.tagline)}</span>
            </span>
            {active && (
              <svg className="h-4 w-4 shrink-0 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
