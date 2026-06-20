import { useEffect, useReducer, useState } from 'react';
import type { DesignSpec, ColorTheme, FontPair, AnimationPreset, ImageRef } from '../../data/templates';
import { templates, templateById } from '../../data/templates';
import { defaultSpecFromTemplate, validateSpec } from '../../lib/builder/spec';
import { useT } from '../../lib/builder/i18n';
import EditorPanel from './EditorPanel';
import LivePreview from './LivePreview';

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

function initSpec(): DesignSpec {
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
  const [spec, dispatch] = useReducer(reducer, undefined, initSpec);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const t = useT();

  // Debounced draft autosave.
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
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            {t('builder.badge')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile edit/preview toggle */}
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(330px,380px)_1fr]">
        {/* Editor */}
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
            />
          </div>
        </div>

        {/* Preview */}
        <div className={`${tab === 'preview' ? 'block' : 'hidden'} lg:block`}>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:sticky lg:top-24">
            {/* Faux browser chrome */}
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
    </div>
  );
}
