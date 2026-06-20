import { templates, themes } from '../../data/templates';
import { useT } from '../../lib/builder/i18n';

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
            <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: themes[tpl.theme].swatch }} aria-hidden="true" />
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
