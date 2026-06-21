import { useEffect, useRef, useState } from 'react';
import type { DesignSpec } from '../../data/templates';
import { useT, useLang } from '../../lib/builder/i18n';

/** Response shape of POST /api/edit (the spec is already validated server-side). */
interface EditResponse {
  spec: DesignSpec;
  applied: unknown[];
  skipped: unknown[];
  reply: string;
  source: 'ai' | 'fallback';
  reason?: 'unconfigured' | 'upstream' | 'parse' | 'timeout' | 'error';
}

type Msg =
  | { id: number; role: 'user'; text: string }
  | {
      id: number;
      role: 'assistant';
      text: string;
      applied: number;
      skipped: number;
      before?: DesignSpec; // spec to restore on Undo
      after?: DesignSpec; // spec to re-apply on Redo
      live?: DesignSpec; // the exact spec object this turn made live (staleness anchor)
      undone?: boolean;
      offline?: boolean;
    }
  | { id: number; role: 'error'; text: string };

const MAX_MESSAGE = 600; // mirrors the endpoint's MAX_MESSAGE cap

/**
 * Conversational editing panel. The user types a plain-language request; we POST
 * the current spec + recent turns to /api/edit, which returns a NEW spec (the model
 * is untrusted — applyOps validated/skipped its ops server-side). We swap the editor
 * state to the returned spec and report what landed / was skipped.
 *
 * Undo/Redo only act on the MOST RECENT AI change, and only while the live spec is
 * still the one that change produced (`spec === turn.live`). If the user has edited
 * the canvas, reset, or switched template since, the affordance hides and the
 * handlers no-op, so a stale snapshot can never silently clobber newer work.
 */
export default function AIEditPanel({
  spec,
  active,
  onApply,
  onClose,
}: {
  spec: DesignSpec;
  active: boolean;
  onApply: (next: DesignSpec) => DesignSpec | null; // returns the spec actually loaded
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const tn = (key: string, n: number) => t(key).replace('{n}', String(n));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false); // becomes true after a few seconds of waiting
  const idRef = useRef(0);
  const nextId = () => (idRef.current += 1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Always points at the CURRENT spec, so a resolving request / an undo can tell
  // whether the base it was computed from is still live.
  const specRef = useRef(spec);
  specRef.current = spec;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  // After a few seconds of waiting, reassure the user that a big change is in progress.
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(id);
  }, [busy]);

  const run = async () => {
    const message = input.trim();
    if (!message || busy) return;
    const sent = spec; // base we edit + the undo target for this turn
    // Recent turns for multi-turn context — exclude reverted changes and offline
    // chatter so the model isn't told about edits that are no longer in the spec.
    const history = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.undone && !m.offline))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: message }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, spec: sent, history, lang }),
      });
      const data = (await res.json().catch(() => null)) as EditResponse | null;
      if (!res.ok || !data || !data.spec) {
        setMessages((m) => [...m, { id: nextId(), role: 'error', text: t('builder.ai.error') }]);
        return;
      }
      const appliedN = Array.isArray(data.applied) ? data.applied.length : 0;
      const skippedN = Array.isArray(data.skipped) ? data.skipped.length : 0;
      // The base changed under us while the request was in flight (undo / canvas edit
      // after closing the panel) — the returned spec is stale; don't clobber.
      if (appliedN > 0 && specRef.current !== sent) {
        setMessages((m) => [...m, { id: nextId(), role: 'assistant', text: t('builder.ai.stale'), applied: 0, skipped: 0 }]);
        return;
      }
      const live = appliedN > 0 ? onApply(data.spec) ?? undefined : undefined;
      // Endpoint fallback replies are English-only, and the model sometimes claims
      // success when nothing landed — pick honest, localized text in those cases.
      const text =
        data.source === 'fallback'
          ? t(data.reason === 'timeout' ? 'builder.ai.timeout' : 'builder.ai.error')
          : appliedN === 0 && skippedN > 0
            ? t('builder.ai.failed')
            : data.reply || (appliedN > 0 ? t('builder.ai.done') : t('builder.ai.nochange'));
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text,
          applied: appliedN,
          skipped: skippedN,
          before: appliedN > 0 ? sent : undefined,
          after: appliedN > 0 ? data.spec : undefined,
          live,
          offline: data.source === 'fallback',
        },
      ]);
    } catch {
      setMessages((m) => [...m, { id: nextId(), role: 'error', text: t('builder.ai.error') }]);
    } finally {
      setBusy(false);
    }
  };

  const undo = (m: Extract<Msg, { role: 'assistant' }>) => {
    if (busy || !m.before || specRef.current !== m.live) return; // stale -> never clobber newer work
    const live = onApply(m.before) ?? undefined;
    setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, undone: true, live } : x)));
  };
  const redo = (m: Extract<Msg, { role: 'assistant' }>) => {
    if (busy || !m.after || specRef.current !== m.live) return;
    const live = onApply(m.after) ?? undefined;
    setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, undone: false, live } : x)));
  };

  // Only the LAST assistant turn is reversible (and only if it actually changed the
  // spec). A later no-op/clarifying turn retires an older turn's undo/redo.
  const lastAssistant = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return messages[i] as Extract<Msg, { role: 'assistant' }>;
    return null;
  })();
  const changeId = lastAssistant && lastAssistant.before ? lastAssistant.id : null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      // First Escape blurs the composer (so it doesn't surprise-close the panel
      // mid-type); a second Escape, now outside the field, closes it via the window handler.
      e.stopPropagation();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex max-h-[72vh] flex-col">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <svg className="h-4 w-4 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l1.2 3L9 7.2 6.2 8.4 5 11.4 3.8 8.4 1 7.2 3.8 6 5 3zM15 8l1.8 4.2L21 14l-4.2 1.8L15 20l-1.8-4.2L9 14l4.2-1.8L15 8z" />
        </svg>
        <h3 id="ai-panel-title" className="flex-1 text-sm font-semibold text-[var(--color-text)]">{t('builder.ai.title')}</h3>
        <button type="button" onClick={onClose} aria-label={t('builder.action.close', 'Close')} className="-mr-1 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{t('builder.ai.desc')}</p>
            <div className="flex flex-wrap gap-1.5">
              {['builder.ai.ex1', 'builder.ai.ex2', 'builder.ai.ex3'].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => { setInput(t(ex)); inputRef.current?.focus(); }}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                >
                  {t(ex)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[var(--color-accent)] px-3 py-2 text-xs leading-snug text-white">{m.text}</p>
              </div>
            );
          }
          if (m.role === 'error') {
            return (
              <p key={m.id} role="alert" className="flex items-start gap-1.5 text-xs text-[var(--color-danger,#dc2626)]">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9l-8 13.9A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.2l-8-13.9a2 2 0 0 0-3.4 0z" />
                </svg>
                <span>{m.text}</span>
              </p>
            );
          }
          const isActive = m.id === changeId && specRef.current === m.live;
          return (
            <div key={m.id} className="flex flex-col items-start gap-1">
              <p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-[var(--color-surface-neutral)] px-3 py-2 text-xs leading-snug text-[var(--color-text)]">{m.text}</p>
              <div className="flex flex-wrap items-center gap-1.5 pl-1">
                {m.applied > 0 && (
                  <span className="rounded bg-[var(--color-accent-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">{tn('builder.ai.applied', m.applied)}</span>
                )}
                {m.skipped > 0 && m.applied > 0 && (
                  <span className="text-[10px] text-[var(--color-text-muted)]">{tn('builder.ai.skipped', m.skipped)}</span>
                )}
                {m.offline && <span className="text-[10px] text-[var(--color-text-muted)]">{t('builder.ai.offline')}</span>}
                {isActive && !busy && !m.undone && (
                  <button type="button" onClick={() => undo(m)} className="text-[10px] font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline">{t('builder.ai.undo')}</button>
                )}
                {isActive && !busy && m.undone && (
                  <button type="button" onClick={() => redo(m)} className="text-[10px] font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline">{t('builder.ai.redo')}</button>
                )}
                {m.undone && !isActive && <span className="text-[10px] text-[var(--color-text-muted)]">{t('builder.ai.undone')}</span>}
              </div>
            </div>
          );
        })}

        {busy && (
          <p className="animate-pulse text-xs text-[var(--color-text-muted)]" aria-live="polite">{slow ? t('builder.ai.slow') : t('builder.ai.sending')}</p>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-[var(--color-border)] p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_MESSAGE}
          rows={2}
          aria-label={t('builder.ai.title')}
          placeholder={t('builder.ai.placeholder')}
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">{input.length > MAX_MESSAGE - 80 ? `${input.length}/${MAX_MESSAGE}` : t('builder.ai.hint')}</span>
          <button
            type="button"
            onClick={run}
            disabled={busy || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {busy ? t('builder.ai.sending') : t('builder.ai.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
