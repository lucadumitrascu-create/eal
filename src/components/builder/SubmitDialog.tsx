import { useEffect, useRef, useState } from 'react';
import type { DesignSpec } from '../../data/templates';
import { encodeSpec } from '../../lib/builder/encode';
import { useT, useLang } from '../../lib/builder/i18n';

const FORMSPREE = 'https://formspree.io/f/xnjgbnnr';

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]';

type Status = 'idle' | 'sending' | 'ok' | 'err';

export default function SubmitDialog({ spec, onClose, onSubmitted }: { spec: DesignSpec; onClose: () => void; onSubmitted: () => void }) {
  const t = useT();
  const lang = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(spec.meta.siteName || '');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Modal focus handling: move focus in, trap Tab, Escape to close, restore on unmount.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (firstFieldRef.current ?? panelRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);

  const previewLink = `${window.location.origin}/builder?mode=preview&d=${encodeSpec(spec)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || status === 'sending') return;
    setStatus('sending');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('email', email.trim());
    fd.append('company', company.trim());
    fd.append('note', note.trim());
    fd.append('template', spec.templateId);
    fd.append('language', lang);
    fd.append('previewLink', previewLink);
    fd.append('brief', JSON.stringify(spec, null, 2));
    fd.append('_subject', `Website mockup from ${company.trim() || name.trim()}`);
    try {
      const res = await fetch(FORMSPREE, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      if (res.ok) {
        setStatus('ok');
        onSubmitted();
      } else {
        setStatus('err');
      }
    } catch {
      setStatus('err');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('builder.submit.title')}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 shadow-2xl outline-none">
        {status === 'ok' ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text)]">{t('builder.submit.successTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('builder.submit.success')}</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white">
              {t('builder.submit.done')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text)]">{t('builder.submit.title')}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('builder.submit.desc')}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="sd-name" className="sr-only">{t('builder.submit.name')}</label>
                <input id="sd-name" ref={firstFieldRef} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder={t('builder.submit.name')} className={inputCls} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="sd-email" className="sr-only">{t('builder.submit.email')}</label>
                <input id="sd-email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={120} placeholder={t('builder.submit.email')} className={inputCls} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="sd-company" className="sr-only">{t('builder.submit.company')}</label>
                <input id="sd-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder={t('builder.submit.company')} className={inputCls} />
              </div>
              <div>
                <label htmlFor="sd-note" className="sr-only">{t('builder.submit.note')}</label>
                <textarea id="sd-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600} placeholder={t('builder.submit.note')} className={inputCls + ' resize-y'} />
              </div>
            </div>
            {status === 'err' && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">{t('builder.submit.error')}</div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
                {t('builder.submit.cancel')}
              </button>
              <button type="submit" disabled={status === 'sending'} className="flex-[1.4] rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60">
                {status === 'sending' ? t('builder.submit.sending') : t('builder.submit.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
