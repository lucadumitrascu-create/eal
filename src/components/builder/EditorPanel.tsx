import { useState } from 'react';
import type { DesignSpec, ColorTheme, FontPair, AnimationPreset, ImageRef, TextSlot, SectionDef } from '../../data/templates';
import { templateById, themes, fonts } from '../../data/templates';
import { useT } from '../../lib/builder/i18n';
import TemplatePicker from './TemplatePicker';
import { ImageSlotControl } from './ImagePicker';
import IdeasHelper from './IdeasHelper';

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]';

interface Props {
  spec: DesignSpec;
  onTemplate: (id: string) => void;
  onMeta: (field: 'siteName' | 'tagline', value: string) => void;
  onTheme: (v: ColorTheme) => void;
  onFont: (v: FontPair) => void;
  onAnim: (v: AnimationPreset) => void;
  onText: (sid: string, slot: string, value: string) => void;
  onImage: (sid: string, slot: string, value: ImageRef) => void;
  onToggle: (sid: string) => void;
  onIdea: (slot: 'headline' | 'subhead' | 'cta', value: string) => void;
}

type Tfn = (k: string, f?: string) => string;

function Field({ slot, value, onChange, t }: { slot: TextSlot; value: string; onChange: (v: string) => void; t: Tfn }) {
  const long = slot.kind === 'long';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">{t(slot.label)}</label>
        <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
          {value.length}/{slot.maxLen}
        </span>
      </div>
      {long ? (
        <textarea rows={3} value={value} maxLength={slot.maxLen} onChange={(e) => onChange(e.target.value)} className={inputCls + ' resize-y'} />
      ) : (
        <input value={value} maxLength={slot.maxLen} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            value === o.v ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-neutral)] p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</h3>
      {children}
    </div>
  );
}

function SectionItem({
  def,
  sec,
  defaultOpen,
  t,
  onText,
  onImage,
  onToggle,
}: {
  def: SectionDef;
  sec: { id: string; enabled: boolean; text: Record<string, string>; images: Record<string, ImageRef> };
  defaultOpen: boolean;
  t: Tfn;
  onText: (sid: string, slot: string, value: string) => void;
  onImage: (sid: string, slot: string, value: ImageRef) => void;
  onToggle: (sid: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-neutral)]">
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-[var(--color-text)]"
        >
          <svg className={`h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {t(def.label)}
        </button>
        {def.toggleable && (
          <button
            type="button"
            role="switch"
            aria-checked={sec.enabled}
            aria-label={`${t(def.label)} — ${t('builder.section.toggle')}`}
            onClick={() => onToggle(def.id)}
            className={`relative h-5 w-9 shrink-0 rounded-full outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${sec.enabled ? 'bg-[var(--color-accent)] ring-transparent' : 'bg-[#7e8896] ring-black/20'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sec.enabled ? 'left-[1.15rem]' : 'left-0.5'}`} />
          </button>
        )}
      </div>
      {open && (
        <div className={`space-y-3.5 px-4 pb-4 ${!sec.enabled ? 'pointer-events-none opacity-50' : ''}`}>
          {def.textSlots.map((slot) => (
            <Field key={slot.id} slot={slot} value={sec.text[slot.id] ?? ''} onChange={(v) => onText(def.id, slot.id, v)} t={t} />
          ))}
          {def.imageSlots.map((slot) => (
            <ImageSlotControl key={slot.id} label={slot.label} value={sec.images[slot.id]} onChange={(v) => onImage(def.id, slot.id, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditorPanel(props: Props) {
  const { spec, onTemplate, onMeta, onTheme, onFont, onAnim, onText, onImage, onToggle, onIdea } = props;
  const t = useT();
  const tpl = templateById(spec.templateId);

  return (
    <div className="space-y-3">
      <IdeasHelper onApply={onIdea} defaultCompany={spec.meta.siteName} />

      <Group title={t('builder.panel.template')}>
        <TemplatePicker current={spec.templateId} onSelect={onTemplate} />
      </Group>

      <Group title={t('builder.panel.brand')}>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">{t('builder.brand.siteName')}</label>
            <input value={spec.meta.siteName} maxLength={60} onChange={(e) => onMeta('siteName', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">{t('builder.brand.tagline')}</label>
            <input value={spec.meta.tagline} maxLength={120} onChange={(e) => onMeta('tagline', e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">{t('builder.brand.theme')}</label>
            <div className="flex gap-2">
              {(['cyan', 'warm', 'indigo', 'mono'] as ColorTheme[]).map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => onTheme(th)}
                  aria-label={t(themes[th].label)}
                  className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-105 ${spec.theme === th ? 'border-[var(--color-accent)]' : 'border-transparent'}`}
                  style={{ background: themes[th].swatch }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">{t('builder.brand.font')}</label>
            <Segmented<FontPair>
              value={spec.font}
              onChange={onFont}
              options={(['modern', 'editorial', 'mono'] as FontPair[]).map((f) => ({ v: f, label: t(fonts[f].label) }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-muted)]">{t('builder.brand.animation')}</label>
            <Segmented<AnimationPreset>
              value={spec.animation}
              onChange={onAnim}
              options={[
                { v: 'none', label: t('builder.anim.none') },
                { v: 'subtle', label: t('builder.anim.subtle') },
                { v: 'lively', label: t('builder.anim.lively') },
              ]}
            />
          </div>
        </div>
      </Group>

      <div className="space-y-2.5">
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{t('builder.panel.sections')}</h3>
        {tpl?.sections.map((def, idx) => {
          const sec = spec.sections.find((s) => s.id === def.id)!;
          return <SectionItem key={def.id} def={def} sec={sec} defaultOpen={idx === 0} t={t} onText={onText} onImage={onImage} onToggle={onToggle} />;
        })}
      </div>
    </div>
  );
}
