import { useEffect, useState } from 'react';

/**
 * Builder island root (Phase 1 stub).
 * Renders client-only (browser APIs are safe here). Reads ?mode / ?d from the
 * URL; Phase 2+ adds the template picker, editor, live preview and submit flow.
 */
export default function BuilderApp() {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'preview') setMode('preview');
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        Beta · {mode === 'preview' ? 'Preview' : 'Editor'}
      </span>

      <h1 className="mt-6 font-['Outfit'] text-4xl font-bold leading-[1.1] text-[var(--color-text)] sm:text-5xl">
        Build a mockup of your <span className="gradient-text-cyan">future website</span>
      </h1>

      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
        Pick a template, edit the text, swap the images, and preview it live — then
        send it to us and we'll bring it to life. No account, no AI guessing. You stay in control.
      </p>

      <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-border-hover)] bg-[var(--color-surface-cyan)] p-10">
        <p className="text-[var(--color-text-muted)]">
          The editor is being assembled. Check back shortly.
        </p>
        <a
          href="/#contact"
          className="mt-6 inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] no-underline transition-colors hover:border-[var(--color-border-hover)]"
        >
          Or tell us your idea directly
        </a>
      </div>
    </div>
  );
}
