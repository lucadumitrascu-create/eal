import { useEffect, useMemo, useReducer, useState } from 'react';
import type { DesignSpec, ColorTheme, FontPair, AnimationPreset, ImageRef } from '../../data/templates';
import { templates, templateById } from '../../data/templates';
import { defaultSpecFromTemplate, validateSpec } from '../../lib/builder/spec';
import { decodeSpec } from '../../lib/builder/encode';
import { useT } from '../../lib/builder/i18n';
import EditorPanel from './EditorPanel';
import LivePreview from './LivePreview';
import SubmitDialog from './SubmitDialog';

const DRAFT_KEY = 'eal.builder.draft';

type Action =
  | { type: 'template'; id: string }
  | { type: 'meta'; field: 'siteName' | 'tagline'; value: string }
  | { type: 'theme'; value: ColorTheme }
  | { type: 'font'; value: FontPair }
  | { type: 'anim'; value: AnimationPreset }
  | { type: 'text'; sid: string; slot: string; value: string }
  | { type: 'image'; sid: string; slot: string; value: ImageRef }
  | { type: 'toggle'; sid: string }
  | { type: 'load'; spec: DesignSpec };

function reducer(state: DesignSpec, a: Action): DesignSpec {
  switch (a.type) {
    case 'template': {
      const tpl = templateById(a.id);
      return tpl ? defaultSpecFromTemplate(tpl) : state;
    }
    case 'meta':
      return { ...state, meta: { ...state.meta, [a.field]: a.value } };
    case 'theme':
      return { ...state, theme: a.value };
    case 'font':
      return { ...state, font: a.value };
    case 'anim':
      return { ...state, animation: a.value };
    case 'text':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, text: { ...s.text, [a.slot]: a.value } } : s)) };
    case 'image':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, images: { ...s.images, [a.slot]: a.value } } : s)) };
    case 'toggle':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, enabled: !s.enabled } : s)) };
    case 'load':
      return a.spec;
    default:
      return state;
  }
}

function initSpec(decoded: DesignSpec | null): DesignSpec {
  if (decoded) return decoded;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const v = validateSpec(JSON.parse(raw));
      if (v) return v;
    }
  } catch {
    /* ignore corrupt draft */
  }
  return defaultSpecFromTemplate(templates[0]);
}

export default function BuilderApp() {
  const t = useT();
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const dParam = params.get('d');
  const isPreviewMode = params.get('mode') === 'preview';
  const decoded = useMemo(() => (dParam ? decodeSpec(dParam) : null), [dParam]);

  if (isPreviewMode) {
    if (!decoded) {
      return (
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-[var(--color-text)]">{t('builder.preview.invalidTitle')}</h2>
          <p className="mt-3 text-[var(--color-text-muted)]">{t('builder.preview.invalid')}</p>
          <a href="/builder" className="mt-6 inline-flex rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white no-underline">
            {t('builder.preview.startFresh')}
          </a>
        </div>
      );
    }
    return <ReadOnlyPreview spec={decoded} dParam={dParam!} />;
  }

  return <Editor decoded={decoded} />;
}

function ReadOnlyPreview({ spec, dParam }: { spec: DesignSpec; dParam: string }) {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          {t('builder.preview.readonly')}
        </span>
        <a href={`/builder?d=${dParam}`} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white no-underline">
          {t('builder.preview.openEditor')}
        </a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <LivePreview spec={spec} />
      </div>
    </div>
  );
}

function Editor({ decoded }: { decoded: DesignSpec | null }) {
  const t = useT();
  const [spec, dispatch] = useReducer(reducer, decoded, initSpec);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(spec));
      } catch {
        /* storage full / disabled — non-fatal */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [spec]);

  const onReset = () => {
    const tpl = templateById(spec.templateId);
    if (tpl && window.confirm(t('builder.reset.confirm'))) {
      dispatch({ type: 'load', spec: defaultSpecFromTemplate(tpl) });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          {t('builder.badge')}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1 lg:hidden">
            {(['edit', 'preview'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTab(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === m ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)]'}`}
              >
                {t(`builder.tab.${m}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            {t('builder.action.reset')}
          </button>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="rounded-lg bg-[var(--color-accent-secondary)] px-4 py-1.5 text-xs font-semibold text-[#0A0A0A] shadow-sm transition-colors hover:bg-[var(--color-accent-secondary-hover)]"
          >
            {t('builder.action.submit')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(330px,380px)_1fr]">
        <div className={`${tab === 'edit' ? 'block' : 'hidden'} lg:block`}>
          <div className="lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1.5">
            <EditorPanel
              spec={spec}
              onTemplate={(id) => dispatch({ type: 'template', id })}
              onMeta={(field, value) => dispatch({ type: 'meta', field, value })}
              onTheme={(value) => dispatch({ type: 'theme', value })}
              onFont={(value) => dispatch({ type: 'font', value })}
              onAnim={(value) => dispatch({ type: 'anim', value })}
              onText={(sid, slot, value) => dispatch({ type: 'text', sid, slot, value })}
              onImage={(sid, slot, value) => dispatch({ type: 'image', sid, slot, value })}
              onToggle={(sid) => dispatch({ type: 'toggle', sid })}
              onIdea={(slot, value) => dispatch({ type: 'text', sid: 'hero', slot, value })}
            />
          </div>
        </div>

        <div className={`${tab === 'preview' ? 'block' : 'hidden'} lg:block`}>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:sticky lg:top-24">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
              </span>
              <span className="mx-auto truncate rounded-md bg-[var(--color-bg)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
                {(spec.meta.siteName || 'your-brand').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'your-brand'}.com
              </span>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              <LivePreview spec={spec} />
            </div>
          </div>
        </div>
      </div>

      {showSubmit && (
        <SubmitDialog
          spec={spec}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => {
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {
              /* non-fatal */
            }
          }}
        />
      )}
    </div>
  );
}
