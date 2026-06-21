import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { DesignSpec, ColorTheme, FontPair, AnimationPreset, ImageRef, SectionDisplay, HeroPos, HeroWidth, HeroVAlign, ButtonStyle } from '../../data/templates';
import { templates, templateById, themes, fonts } from '../../data/templates';
import { defaultPresetId } from '../../data/imageLibrary';
import { defaultSpecFromTemplate, validateSpec, defById, sectionFromDef, relocalizeSpec } from '../../lib/builder/spec';
import { decodeSpec, encodeSpec } from '../../lib/builder/encode';
import { useT, useLang, currentLang, translate } from '../../lib/builder/i18n';
import LivePreview, { type EditAPI } from './LivePreview';
import TemplatePicker from './TemplatePicker';
import IdeasHelper from './IdeasHelper';
import AIEditPanel from './AIEditPanel';
import SubmitDialog from './SubmitDialog';

const THEME_ORDER: ColorTheme[] = ['cyan', 'warm', 'indigo', 'mono', 'dark', 'vivid', 'rose', 'teal', 'sky'];
const FONT_ORDER: FontPair[] = ['modern', 'editorial', 'mono', 'grotesk', 'humanist'];

const DRAFT_KEY = 'eal.builder.draft';

type Action =
  | { type: 'template'; id: string }
  | { type: 'meta'; field: 'siteName' | 'tagline'; value: string }
  | { type: 'theme'; value: ColorTheme }
  | { type: 'font'; value: FontPair }
  | { type: 'anim'; value: AnimationPreset }
  | { type: 'btn'; value: ButtonStyle }
  | { type: 'navLink'; index: number; value: string }
  | { type: 'text'; sid: string; slot: string; value: string }
  | { type: 'image'; sid: string; slot: string; value: ImageRef }
  | { type: 'toggle'; sid: string }
  | { type: 'display'; sid: string; value: SectionDisplay }
  | { type: 'pos'; sid: string; value: HeroPos }
  | { type: 'width'; sid: string; value: HeroWidth }
  | { type: 'valign'; sid: string; value: HeroVAlign }
  | { type: 'offset'; sid: string; slot: string; x: number; y: number }
  | { type: 'widthPx'; sid: string; slot: string; w: number }
  | { type: 'color'; sid: string; slot: string; value: string }
  | { type: 'addImage'; sid: string }
  | { type: 'removeImage'; sid: string; key: string }
  | { type: 'addButton'; sid: string }
  | { type: 'removeButton'; sid: string; slot: string }
  | { type: 'moveSection'; sid: string; dir: number }
  | { type: 'deleteSection'; sid: string }
  | { type: 'addSection'; id: string }
  | { type: 'load'; spec: DesignSpec };

const maxIndex = (keys: string[], re: RegExp): number =>
  keys.reduce((mx, k) => { const m = k.match(re); return m ? Math.max(mx, Number(m[1])) : mx; }, 0);

function reducer(state: DesignSpec, a: Action): DesignSpec {
  switch (a.type) {
    case 'template': {
      const tpl = templateById(a.id);
      return tpl ? defaultSpecFromTemplate(tpl, currentLang()) : state;
    }
    case 'meta':
      return { ...state, meta: { ...state.meta, [a.field]: a.value } };
    case 'theme':
      return { ...state, theme: a.value };
    case 'font':
      return { ...state, font: a.value };
    case 'anim':
      return { ...state, animation: a.value };
    case 'btn':
      return { ...state, btn: a.value };
    case 'navLink': {
      const cur = state.nav ?? ['Work', 'About', 'Contact'];
      return { ...state, nav: cur.map((l, i) => (i === a.index ? a.value : l)) };
    }
    case 'text':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, text: { ...s.text, [a.slot]: a.value } } : s)) };
    case 'image':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, images: { ...s.images, [a.slot]: a.value } } : s)) };
    case 'toggle':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, enabled: !s.enabled } : s)) };
    case 'display':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, display: a.value } : s)) };
    case 'pos':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, pos: a.value } : s)) };
    case 'width':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, width: a.value } : s)) };
    case 'valign':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, valign: a.value } : s)) };
    case 'offset':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, offsets: { ...s.offsets, [a.slot]: { x: a.x, y: a.y } } } : s)) };
    case 'widthPx':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, widths: { ...s.widths, [a.slot]: a.w } } : s)) };
    case 'color':
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid ? { ...s, colors: { ...s.colors, [a.slot]: a.value } } : s)) };
    case 'addImage': {
      const def = templateById(state.templateId)?.sections.find((s) => s.id === a.sid);
      if (!def) return state;
      const L = currentLang();
      const product = translate(L, 'builder.add.product', 'New product');
      const image = translate(L, 'builder.add.image', 'New image');
      return {
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== a.sid) return s;
          const preset = Object.values(s.images)[0]?.presetId ?? defaultPresetId;
          if (def.type === 'products') {
            const n = maxIndex(Object.keys(s.images), /^prod(\d+)\.img$/) + 1;
            return {
              ...s,
              images: { ...s.images, [`prod${n}.img`]: { presetId: preset, label: product, alt: product } },
              text: { ...s.text, [`prod${n}.name`]: product, [`prod${n}.price`]: '€0' },
            };
          }
          const n = maxIndex(Object.keys(s.images), /^img(\d+)$/) + 1;
          return { ...s, images: { ...s.images, [`img${n}`]: { presetId: preset, label: image, alt: image } } };
        }),
      };
    }
    case 'removeImage':
      return {
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== a.sid) return s;
          const images = { ...s.images };
          delete images[a.key];
          const text = { ...s.text };
          const m = a.key.match(/^prod(\d+)\.img$/);
          if (m) { delete text[`prod${m[1]}.name`]; delete text[`prod${m[1]}.price`]; }
          return { ...s, images, text };
        }),
      };
    case 'addButton': {
      const def = templateById(state.templateId)?.sections.find((s) => s.id === a.sid);
      const slot = def?.type === 'hero' ? 'cta2' : def?.type === 'cta' ? 'button2' : null;
      if (!slot) return state;
      return { ...state, sections: state.sections.map((s) => (s.id === a.sid && !(slot in s.text) ? { ...s, text: { ...s.text, [slot]: translate(currentLang(), 'builder.add.button', 'Learn more') } } : s)) };
    }
    case 'removeButton':
      return {
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== a.sid) return s;
          const text = { ...s.text };
          delete text[a.slot];
          return { ...s, text };
        }),
      };
    case 'moveSection': {
      const i = state.sections.findIndex((s) => s.id === a.sid);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= state.sections.length) return state;
      const arr = [...state.sections];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...state, sections: arr };
    }
    case 'deleteSection':
      return { ...state, sections: state.sections.filter((s) => s.id !== a.sid) };
    case 'addSection': {
      const tpl = templateById(state.templateId);
      const def = tpl ? defById(tpl, a.id) : undefined;
      if (!def || state.sections.some((s) => s.id === a.id)) return state;
      // A re-added template section keeps its own copy; a universal block uses the shared catalog.
      const ownerId = tpl!.sections.some((s) => s.id === a.id) ? tpl!.id : '__universal';
      return { ...state, sections: [...state.sections, sectionFromDef(def, currentLang(), ownerId)] };
    }
    case 'load':
      return a.spec;
    default:
      return state;
  }
}

function initSpec(decoded: DesignSpec | null): DesignSpec {
  if (decoded) return decoded; // shared ?d= design — frozen in the author's language
  const lang = currentLang();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const v = validateSpec(JSON.parse(raw));
      // Re-localize the (possibly stale-language) draft on the FIRST render — no flash,
      // no immediate second relocalize from the effect.
      if (v) return relocalizeSpec(v, lang);
    }
  } catch {
    /* ignore corrupt draft */
  }
  return defaultSpecFromTemplate(templates[0], lang);
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
        <span className="text-sm font-medium text-[var(--color-text)]">
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
      }`}
    >
      {children}
    </button>
  );
}

function DesignPopover({ spec, dispatch, t, onClose }: { spec: DesignSpec; dispatch: (a: Action) => void; t: (k: string, f?: string) => string; onClose: () => void }) {
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</h4>
      {children}
    </div>
  );
  return (
    <div id="design-panel" role="dialog" aria-label={t('builder.action.design', 'Design')} className="absolute left-0 top-full z-40 mt-2 max-h-[72vh] w-[330px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
        <button type="button" onClick={onClose} aria-label={t('builder.action.close', 'Close')} className="absolute right-2 top-2 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <Group title={t('builder.panel.template')}>
          <TemplatePicker current={spec.templateId} onSelect={(id) => dispatch({ type: 'template', id })} />
        </Group>
        <Group title={t('builder.brand.theme')}>
          <div className="flex flex-wrap gap-2">
            {THEME_ORDER.map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => dispatch({ type: 'theme', value: th })}
                aria-label={t(themes[th].label)}
                className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-105 ${
                  spec.theme === th ? 'border-[var(--color-accent)]' : 'border-transparent ring-1 ring-inset ring-black/10'
                }`}
                style={{ background: themes[th].swatch }}
              />
            ))}
          </div>
        </Group>
        <Group title={t('builder.brand.font')}>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-neutral)] p-1">
            {FONT_ORDER.map((f) => (
              <Chip key={f} active={spec.font === f} onClick={() => dispatch({ type: 'font', value: f })}>{t(fonts[f].label)}</Chip>
            ))}
          </div>
        </Group>
        <Group title={t('builder.brand.animation')}>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-neutral)] p-1">
            {([['none', 'None'], ['fade', 'Fade'], ['rise', 'Rise'], ['slide', 'Slide'], ['sweep', 'Sweep'], ['zoom', 'Zoom'], ['blur', 'Blur'], ['flip', 'Flip'], ['pop', 'Pop']] as [AnimationPreset, string][]).map(([a, label]) => (
              <Chip key={a} active={spec.animation === a} onClick={() => dispatch({ type: 'anim', value: a })}>{t(`builder.anim.${a}`, label)}</Chip>
            ))}
          </div>
        </Group>
        <Group title={t('builder.brand.buttons', 'Buttons')}>
          <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-neutral)] p-1">
            {([['solid', 'Solid'], ['outline', 'Outline'], ['pill', 'Pill'], ['underline', 'Line']] as [ButtonStyle, string][]).map(([b, label]) => (
              <Chip key={b} active={spec.btn === b} onClick={() => dispatch({ type: 'btn', value: b })}>{t(`builder.btn.${b}`, label)}</Chip>
            ))}
          </div>
        </Group>
    </div>
  );
}

function Editor({ decoded }: { decoded: DesignSpec | null }) {
  const t = useT();
  const lang = useLang();
  const [spec, dispatch] = useReducer(reducer, decoded, initSpec);
  const [showSubmit, setShowSubmit] = useState(false);
  const [panel, setPanel] = useState<null | 'design' | 'ideas' | 'ai'>(null);

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

  // Keep the template content in the site's language: when the language changes (or
  // on mount with a stale-language draft), re-localize PER SLOT — untouched default
  // copy follows the language; fields the user actually edited are left untouched.
  const specRef = useRef(spec);
  specRef.current = spec;
  const prevLang = useRef(lang);
  useEffect(() => {
    const from = prevLang.current;
    prevLang.current = lang;
    if (decoded) return; // a shared ?d= design stays frozen in the author's language
    // On a deliberate switch we know the source language (precise, collision-safe);
    // on mount (from === lang) fall back to matching any language.
    const next = relocalizeSpec(specRef.current, lang, from === lang ? undefined : from);
    if (JSON.stringify(next) !== JSON.stringify(specRef.current)) dispatch({ type: 'load', spec: next });
  }, [lang]);

  // Escape closes any open toolbar popover (design / ideas / assistant) and returns
  // focus to the trigger that opened it (keyboard / screen-reader users).
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const trigger = triggers.current[panel];
      setPanel(null);
      trigger?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  const tpl = templateById(spec.templateId);
  const edit: EditAPI = {
    on: true,
    slotMeta: (secId, slot) => {
      const def = tpl?.sections.find((s) => s.id === secId);
      const sl = def?.textSlots.find((x) => x.id === slot);
      return sl ? { maxLen: sl.maxLen, kind: sl.kind } : null;
    },
    setText: (sid, slot, value) => dispatch({ type: 'text', sid, slot, value }),
    setMeta: (field, value) => dispatch({ type: 'meta', field, value }),
    setImage: (sid, slot, value) => dispatch({ type: 'image', sid, slot, value }),
    toggle: (sid) => dispatch({ type: 'toggle', sid }),
    setDisplay: (sid, value) => dispatch({ type: 'display', sid, value }),
    setPos: (sid, value) => dispatch({ type: 'pos', sid, value }),
    setWidth: (sid, value) => dispatch({ type: 'width', sid, value }),
    setVAlign: (sid, value) => dispatch({ type: 'valign', sid, value }),
    setOffset: (sid, slot, x, y) => dispatch({ type: 'offset', sid, slot, x, y }),
    setWidthPx: (sid, slot, w) => dispatch({ type: 'widthPx', sid, slot, w }),
    setColor: (sid, slot, value) => dispatch({ type: 'color', sid, slot, value }),
    addImage: (sid) => dispatch({ type: 'addImage', sid }),
    removeImage: (sid, key) => dispatch({ type: 'removeImage', sid, key }),
    addButton: (sid) => dispatch({ type: 'addButton', sid }),
    removeButton: (sid, slot) => dispatch({ type: 'removeButton', sid, slot }),
    moveSection: (sid, dir) => dispatch({ type: 'moveSection', sid, dir }),
    deleteSection: (sid) => dispatch({ type: 'deleteSection', sid }),
    addSection: (id) => dispatch({ type: 'addSection', id }),
    setNavLink: (index, value) => dispatch({ type: 'navLink', index, value }),
  };

  const onReset = () => {
    if (tpl && window.confirm(t('builder.reset.confirm'))) {
      dispatch({ type: 'load', spec: defaultSpecFromTemplate(tpl, currentLang()) });
    }
  };

  const domain = (spec.meta.siteName || 'your-brand').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'your-brand';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* Top toolbar — the only chrome; everything else is edited on the canvas.
          Wraps to two rows on narrow phones so nothing overflows off-screen. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            ref={(el) => { triggers.current.design = el; }}
            onClick={() => setPanel((p) => (p === 'design' ? null : 'design'))}
            aria-expanded={panel === 'design'}
            aria-haspopup="dialog"
            aria-controls="design-panel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-border-hover)]"
          >
            <svg className="h-4 w-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M4 6h10M4 12h7M4 18h13" /><circle cx="18" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="19" cy="18" r="2" />
            </svg>
            {t('builder.action.design', 'Design')}
            <svg className={`h-3.5 w-3.5 transition-transform ${panel === 'design' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            ref={(el) => { triggers.current.ideas = el; }}
            onClick={() => setPanel((p) => (p === 'ideas' ? null : 'ideas'))}
            aria-expanded={panel === 'ideas'}
            aria-haspopup="dialog"
            aria-controls="ideas-panel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.5.5 1 1.2 1 2h6c0-.8.5-1.5 1-2A6 6 0 0 0 12 3z" />
            </svg>
            {t('builder.action.ideas', 'Ideas')}
          </button>
          <button
            type="button"
            ref={(el) => { triggers.current.ai = el; }}
            onClick={() => setPanel((p) => (p === 'ai' ? null : 'ai'))}
            aria-expanded={panel === 'ai'}
            aria-haspopup="dialog"
            aria-controls="ai-panel"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l1.2 3L9 7.2 6.2 8.4 5 11.4 3.8 8.4 1 7.2 3.8 6 5 3zM15 8l1.8 4.2L21 14l-4.2 1.8L15 20l-1.8-4.2L9 14l4.2-1.8L15 8z" />
            </svg>
            {t('builder.action.ai', 'Assistant')}
          </button>
          {panel === 'design' && <DesignPopover spec={spec} dispatch={dispatch} t={t} onClose={() => setPanel(null)} />}
          {panel === 'ideas' && (
            <div id="ideas-panel" role="dialog" aria-label={t('builder.action.ideas', 'Ideas')} className="absolute left-0 top-full z-40 mt-2 w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
                <button type="button" onClick={() => setPanel(null)} aria-label={t('builder.action.close', 'Close')} className="absolute right-2 top-2 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
                <IdeasHelper
                  onApply={(slot, value) => {
                    const hero = tpl && spec.sections.find((s) => defById(tpl, s.id)?.type === 'hero');
                    if (hero) dispatch({ type: 'text', sid: hero.id, slot, value });
                  }}
                  onApplyAll={(idea, company) => {
                    if (company) dispatch({ type: 'meta', field: 'siteName', value: company });
                    // Resolve targets by section TYPE (ids vary; some templates lack features)
                    // and only set slots that actually exist, so copy lands predictably.
                    const setText = (sid: string, slot: string, value: string) => {
                      const def = tpl ? defById(tpl, sid) : undefined;
                      if (def?.textSlots.some((sl) => sl.id === slot)) dispatch({ type: 'text', sid, slot, value });
                    };
                    const hero = tpl && spec.sections.find((s) => defById(tpl, s.id)?.type === 'hero');
                    if (hero) { setText(hero.id, 'headline', idea.headline); setText(hero.id, 'subhead', idea.subhead); setText(hero.id, 'cta', idea.cta); }
                    const feat = tpl && spec.sections.find((s) => defById(tpl, s.id)?.type === 'features');
                    if (feat) idea.sections?.forEach((s, i) => { setText(feat.id, `item${i + 1}.title`, s.title); setText(feat.id, `item${i + 1}.body`, s.body); });
                    setPanel(null);
                  }}
                  defaultCompany={spec.meta.siteName}
                />
            </div>
          )}
          {/* Non-modal: kept mounted (visibility toggled) so the conversation + undo
              snapshots survive closing/reopening — and so you can scroll/edit the
              canvas while it's open. Close via the toggle button or Escape. */}
          <div id="ai-panel" role="dialog" aria-labelledby="ai-panel-title" className={`absolute left-0 top-full z-40 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[0_24px_70px_rgba(0,0,0,0.20)] ${panel === 'ai' ? '' : 'hidden'}`}>
            <AIEditPanel
              spec={spec}
              active={panel === 'ai'}
              onClose={() => setPanel(null)}
              onApply={(next) => {
                const v = validateSpec(next);
                if (v) dispatch({ type: 'load', spec: v });
                return v; // the spec actually loaded (panel uses it as the staleness anchor)
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/builder?d=${encodeSpec(spec)}&mode=preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] no-underline transition-colors hover:text-[var(--color-text)]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
            </svg>
            {t('builder.action.preview', 'Preview')}
          </a>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            {t('builder.action.reset')}
          </button>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="rounded-lg bg-[var(--color-accent-secondary)] px-4 py-2 text-xs font-semibold text-[#0A0A0A] shadow-sm transition-colors hover:bg-[var(--color-accent-secondary-hover)]"
          >
            {t('builder.action.submit')}
          </button>
        </div>
      </div>

      <p className="mb-3 text-center text-xs text-[var(--color-text-muted)]">
        {t('builder.canvas.hint', 'Click any text or image on the page to edit it. Use Design to change the look.')}
      </p>

      {/* The canvas IS the editor — click text/images directly */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-neutral)] px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
          </span>
          <span className="mx-auto truncate rounded-md bg-[var(--color-bg)] px-3 py-1 text-xs text-[var(--color-text-muted)]">{domain}.com</span>
        </div>
        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">
          <LivePreview spec={spec} edit={edit} />
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
