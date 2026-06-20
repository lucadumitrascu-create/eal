import { useState } from 'react';
import { useT } from '../../lib/builder/i18n';
import type { Idea } from '../../lib/ai/fallbackIdeas';

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]';

type Tone = 'professional' | 'friendly' | 'bold';

export default function IdeasHelper({ onApply }: { onApply: (slot: 'headline' | 'subhead' | 'cta', value: string) => void }) {
  const t = useT();
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [offline, setOffline] = useState(false);

  const run = async () => {
    if (!company.trim() || loading) return;
    setLoading(true);
    setOffline(false);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), industry: industry.trim(), tone }),
      });
      const data = await res.json();
      setIdea(data);
      if (data?.source === 'fallback') setOffline(true);
    } catch {
      const { fallbackIdeas } = await import('../../lib/ai/fallbackIdeas');
      setIdea(fallbackIdeas(industry, company));
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({ slot, label, value }: { slot: 'headline' | 'subhead' | 'cta'; label: string; value: string }) =>
    value ? (
      <button
        type="button"
        onClick={() => onApply(slot, value)}
        className="group flex w-full items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2.5 text-left transition-colors hover:border-[var(--color-accent)]"
      >
        <span className="mt-0.5 shrink-0 rounded bg-[var(--color-accent-light)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">{label}</span>
        <span className="flex-1 text-xs leading-snug text-[var(--color-text)]">{value}</span>
        <span className="shrink-0 text-[10px] font-medium text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">{t('builder.ideas.apply')}</span>
      </button>
    ) : null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-light)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('builder.ideas.title')}</h3>
      </div>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">{t('builder.ideas.desc')}</p>

      <div className="space-y-2.5">
        <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder={t('builder.ideas.company')} className={inputCls} />
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={60} placeholder={t('builder.ideas.industry')} className={inputCls} />
        <div className="flex gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
          {(['professional', 'friendly', 'bold'] as Tone[]).map((tn) => (
            <button
              key={tn}
              type="button"
              onClick={() => setTone(tn)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${tone === tn ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              {t(`builder.ideas.tone.${tn}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !company.trim()}
          className="w-full rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {loading ? t('builder.ideas.generating') : t('builder.ideas.generate')}
        </button>
      </div>

      {idea && (
        <div className="mt-3 space-y-2">
          {offline && <p className="text-[11px] text-[var(--color-text-muted)]">{t('builder.ideas.offline')}</p>}
          <Chip slot="headline" label={t('builder.ideas.headline')} value={idea.headline} />
          <Chip slot="subhead" label={t('builder.ideas.subhead')} value={idea.subhead} />
          <Chip slot="cta" label={t('builder.ideas.cta')} value={idea.cta} />
        </div>
      )}
    </div>
  );
}
