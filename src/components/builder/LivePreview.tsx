import { createElement, Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DesignSpec, ImageRef, SectionDef, TextSlot, SectionDisplay, HeroPos, HeroWidth, HeroVAlign } from '../../data/templates';
import { themes, fonts, templateById, universalBlocks } from '../../data/templates';
import { allPresets, presetById } from '../../data/imageLibrary';

/** Direct-manipulation hooks: when present, the preview becomes click-to-edit. */
export interface EditAPI {
  on: boolean;
  slotMeta: (secId: string, slot: string) => { maxLen: number; kind: TextSlot['kind'] } | null;
  setText: (secId: string, slot: string, value: string) => void;
  setMeta: (field: 'siteName' | 'tagline', value: string) => void;
  setImage: (secId: string, slot: string, value: ImageRef) => void;
  toggle: (secId: string) => void;
  setDisplay: (secId: string, value: SectionDisplay) => void;
  setPos: (secId: string, value: HeroPos) => void;
  setWidth: (secId: string, value: HeroWidth) => void;
  setVAlign: (secId: string, value: HeroVAlign) => void;
  setOffset: (secId: string, slot: string, x: number, y: number) => void;
  setWidthPx: (secId: string, slot: string, w: number) => void;
  setColor: (secId: string, slot: string, value: string) => void;
  addImage: (secId: string) => void;
  removeImage: (secId: string, key: string) => void;
  addButton: (secId: string) => void;
  removeButton: (secId: string, slot: string) => void;
  moveSection: (secId: string, dir: number) => void;
  deleteSection: (secId: string) => void;
  addSection: (id: string) => void;
  setNavLink: (index: number, value: string) => void;
}

const ASPECT: Record<string, string> = { '16:9': '16 / 9', '4:3': '4 / 3', '1:1': '1 / 1', '3:4': '3 / 4' };

const POS_FROM_HERO: Record<string, HeroPos> = {
  overlay: 'full', split: 'right', minimal: 'none', centered: 'top', bold: 'top', editorial: 'left',
};

type FooterStyle = 'minimal' | 'columns' | 'cta' | 'social';
const FOOTER: Record<string, FooterStyle> = {
  restaurant: 'social', agency: 'columns', portfolio: 'minimal', ecommerce: 'cta', app: 'cta',
  fitness: 'social', beauty: 'minimal', realestate: 'columns', medical: 'columns',
};

function useFont(href: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector(`link[data-builder-font="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-builder-font', href);
    document.head.appendChild(link);
  }, [href]);
}

function Tile({ img, aspect }: { img: ImageRef; aspect: string; radius?: number }) {
  const p = presetById(img.presetId);
  const dark = p?.dark ?? false;
  if (p?.url) {
    return (
      <div className="pv-tile pv-tile-photo" style={{ aspectRatio: ASPECT[aspect] ?? '16 / 9', background: p.css }}>
        <img src={p.url} alt={img.alt || img.label || ''} loading="lazy" decoding="async" className="pv-photo" />
      </div>
    );
  }
  return (
    <div className="pv-tile" style={{ aspectRatio: ASPECT[aspect] ?? '16 / 9', background: p?.css ?? '#e8e8ea' }}>
      <span className="pv-tile-label" style={{ color: dark ? 'rgba(255,255,255,0.92)' : 'rgba(20,20,25,0.6)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
        {img.label || 'Image'}
      </span>
    </div>
  );
}

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
  </svg>
);

/** "Change image" trigger + preset/description popover. Used standalone (overlay hero) or inside a tile. */
function ImageMenu({ img, onPick, onLabel, corner = false }: { img: ImageRef; onPick: (id: string) => void; onLabel: (v: string) => void; corner?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`pv-imgmenu${corner ? ' pv-imgmenu-corner' : ''}`}>
      <button type="button" className="pv-imgedit" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <EditIcon /> Change
      </button>
      {open && (
        <div className="pv-imgpop" onClick={(e) => e.stopPropagation()}>
          <div className="pv-imgpop-grid">
            {allPresets.map((pr) => (
              <button key={pr.id} type="button" title={pr.label ?? pr.id} aria-pressed={img.presetId === pr.id}
                className={`pv-imgsw${img.presetId === pr.id ? ' on' : ''}`}
                style={pr.url ? { backgroundImage: `url(${pr.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: pr.css }}
                onClick={() => { onPick(pr.id); setOpen(false); }} />
            ))}
          </div>
          <input className="pv-imglabel" defaultValue={img.label} maxLength={60} placeholder="Describe this image…"
            onClick={(e) => e.stopPropagation()} onBlur={(e) => onLabel(e.target.value)} />
        </div>
      )}
    </span>
  );
}

function AddSection({ options, onAdd }: { options: { id: string; label: string }[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;
  return (
    <div className="pv-addsec" contentEditable={false}>
      <button type="button" className="pv-addsec-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>+ Add section</button>
      {open && (
        <div className="pv-addsec-menu">
          {options.map((o) => (
            <button key={o.id} type="button" onClick={() => { onAdd(o.id); setOpen(false); }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeroCtl({ pos, onPos }: { pos: HeroPos; onPos: (v: HeroPos) => void }) {
  const [open, setOpen] = useState(false);
  const opts: [HeroPos, string][] = [
    ['right', 'Img →'], ['left', '← Img'], ['full', 'Full bg'], ['fullLeft', 'Full L'], ['fullRight', 'Full R'],
    ['top', 'Banner ↓'], ['bannerTop', 'Banner ↑'], ['frame', 'Framed'], ['none', 'Text only'],
  ];
  return (
    <div className="pv-heroctl" contentEditable={false}>
      <button type="button" className="pv-heroctl-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Hero layout {open ? '▲' : '▾'}</button>
      {open && (
        <div className="pv-heroctl-grid">
          {opts.map(([v, label]) => (
            <button key={v} type="button" className={`pv-dispbtn${pos === v ? ' on' : ''}`} onClick={() => onPos(v)}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableTile({ img, aspect, onPick, onLabel, onRemove }: { img: ImageRef; aspect: string; onPick: (id: string) => void; onLabel: (v: string) => void; onRemove?: () => void }) {
  return (
    <div className="pv-imgwrap">
      <Tile img={img} aspect={aspect} />
      <ImageMenu img={img} onPick={onPick} onLabel={onLabel} />
      {onRemove && (
        <button type="button" className="pv-rmbtn" aria-label="Remove image" onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
      )}
    </div>
  );
}

type Sec = { id: string; enabled: boolean; display?: SectionDisplay; pos?: HeroPos; width?: HeroWidth; valign?: HeroVAlign; text: Record<string, string>; images: Record<string, ImageRef> };
const T = (sec: Sec, id: string) => sec.text[id] ?? '';
const idxs = (sec: Sec, prefix: string): number[] => {
  const s = new Set<number>();
  for (const k of [...Object.keys(sec.text), ...Object.keys(sec.images)]) {
    const m = k.match(new RegExp(`^${prefix}(\\d+)\\.`));
    if (m) s.add(Number(m[1]));
  }
  return [...s].sort((a, b) => a - b);
};

export default function LivePreview({ spec, edit }: { spec: DesignSpec; edit?: EditAPI }) {
  const tpl = templateById(spec.templateId);
  const theme = themes[spec.theme].vars;
  const font = fonts[spec.font];
  useFont(font.href);
  const [selected, setSelected] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<{ secId: string; slot: string; x: number; y: number } | null>(null);
  if (!tpl) return null;
  const L = tpl.layout;
  const defs: Record<string, SectionDef> = Object.fromEntries([...universalBlocks, ...tpl.sections].map((s) => [s.id, s]));
  const editing = !!edit?.on;
  const isSel = (id: string) => editing && selected === id;

  // Scroll-reveal: arm hidden states, then reveal each section as it enters the scroll viewport.
  // (Section-level only, so dynamically added tiles/buttons are never left hidden.)
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionKey = spec.sections.map((s) => `${s.id}:${s.enabled ? 1 : 0}`).join(',');
  useEffect(() => {
    const root = rootRef.current;
    if (!root || editing) return; // no scroll-reveal work while editing — sections stay visible
    root.classList.add('pv-armed');
    const all = () => root.querySelectorAll('.pv-reveal').forEach((el) => el.classList.add('pv-in'));
    if (typeof window === 'undefined' || spec.animation === 'none' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      all();
      return;
    }
    // Find the scrolling ancestor; reveal sections via scroll + geometry (robust even where
    // IntersectionObserver/compositor callbacks are unreliable).
    let sc: HTMLElement | null = root.parentElement;
    while (sc) { const o = getComputedStyle(sc).overflowY; if (o === 'auto' || o === 'scroll') break; sc = sc.parentElement; }
    let last = 0;
    const reveal = () => {
      const vb = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
      const vt = sc ? sc.getBoundingClientRect().top : 0;
      root.querySelectorAll<HTMLElement>('.pv-reveal:not(.pv-in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vb - 48 && r.bottom > vt) el.classList.add('pv-in');
      });
    };
    const onScroll = () => { const now = Date.now ? Date.now() : 0; if (now - last < 50) return; last = now; reveal(); };
    const target: HTMLElement | Window = sc ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    reveal();
    const fb = window.setTimeout(reveal, 800);
    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.clearTimeout(fb);
    };
  }, [spec.templateId, spec.animation, editing, sectionKey]);

  // Editable context kept in a ref so the STABLE Ed component below always reads fresh values
  // without changing identity. (Defining Ed inline gives a new function type every render, which
  // makes React remount every contentEditable on any state change -> lost focus / click lag.)
  const edCtxRef = useRef({ editing, selected, edit, spec, setColorTarget });
  edCtxRef.current = { editing, selected, edit, spec, setColorTarget };

  const Ed = useRef(function Ed({ value, as, className, secId, slot, metaField, ph, commit, mx }: {
    value: string; as: string; className?: string;
    secId?: string; slot?: string; metaField?: 'siteName' | 'tagline'; ph?: string;
    commit?: (v: string) => void; mx?: number;
  }) {
    const { editing, selected, edit, spec, setColorTarget } = edCtxRef.current;
    if (!editing) return createElement(as, { className }, value);
    const meta = secId && slot ? edit!.slotMeta(secId, slot) : null;
    const multiline = meta?.kind === 'long';
    const max = mx ?? (metaField ? (metaField === 'siteName' ? 60 : 120) : meta?.maxLen ?? 200);
    const sec = secId ? spec.sections.find((s) => s.id === secId) : undefined;
    const off = sec && slot ? sec.offsets?.[slot] : undefined;
    const wPx = sec && slot ? sec.widths?.[slot] : undefined;
    const col = sec && slot ? sec.colors?.[slot] : undefined;
    const canDrag = !!(secId && slot) && selected === secId;
    const style: Record<string, string> = {};
    if (off) style.transform = `translate(${off.x}px, ${off.y}px)`;
    if (wPx) { style.maxWidth = `${wPx}px`; style.width = `${wPx}px`; }
    if (col) { if ((className ?? '').includes('pv-btn')) { style.background = col; style.borderColor = col; } else style.color = col; }
    const startInteract = (e: any) => {
      const elem = e.currentTarget as HTMLElement;
      const rect = elem.getBoundingClientRect();
      const mode: 'resize' | 'move' = e.clientX > rect.right - 16 ? 'resize' : 'move';
      const sx = e.clientX, sy = e.clientY, ox = off?.x ?? 0, oy = off?.y ?? 0;
      const startW = wPx ?? rect.width;
      const container = (elem.closest('.pv-editsec') as HTMLElement) ?? elem.parentElement!;
      let moved = false, finalX = ox, finalY = oy, finalW = startW;
      let vG: HTMLElement | null = null, hG: HTMLElement | null = null;
      const guide = (vert: boolean) => { const g = document.createElement('div'); g.style.cssText = `position:fixed;z-index:99999;pointer-events:none;background:#e0218a;box-shadow:0 0 0 .5px rgba(224,33,138,.4);display:none;${vert ? 'width:2px;' : 'height:2px;'}`; document.body.appendChild(g); return g; };
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        ev.preventDefault();
        if (mode === 'resize') { finalW = Math.max(60, startW + dx); elem.style.maxWidth = `${finalW}px`; elem.style.width = `${finalW}px`; return; }
        elem.style.cursor = 'grabbing';
        let nx = ox + dx, ny = oy + dy;
        elem.style.transform = `translate(${nx}px, ${ny}px)`;
        const er = elem.getBoundingClientRect(), cr = container.getBoundingClientRect();
        const SNAP = 7;
        const ccx = cr.left + cr.width / 2, ccy = cr.top + cr.height / 2;
        const ecx = er.left + er.width / 2, ecy = er.top + er.height / 2;
        if (!vG) vG = guide(true);
        if (!hG) hG = guide(false);
        if (Math.abs(ecx - ccx) < SNAP) { nx += ccx - ecx; vG.style.left = `${ccx}px`; vG.style.top = `${cr.top}px`; vG.style.height = `${cr.height}px`; vG.style.display = 'block'; } else vG.style.display = 'none';
        if (Math.abs(ecy - ccy) < SNAP) { ny += ccy - ecy; hG.style.top = `${ccy}px`; hG.style.left = `${cr.left}px`; hG.style.width = `${cr.width}px`; hG.style.display = 'block'; } else hG.style.display = 'none';
        elem.style.transform = `translate(${nx}px, ${ny}px)`;
        finalX = nx; finalY = ny;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        elem.style.cursor = '';
        vG?.remove();
        hG?.remove();
        if (!moved) return;
        if (mode === 'resize') edit!.setWidthPx(secId!, slot!, finalW);
        else edit!.setOffset(secId!, slot!, finalX, finalY);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    return createElement(as, {
      className: `${className ?? ''} pv-ed${canDrag ? ' pv-draggable' : ''}`.trim(),
      contentEditable: true, suppressContentEditableWarning: true, spellCheck: false, role: 'textbox',
      'data-ph': ph ?? '',
      style: Object.keys(style).length ? style : undefined,
      onClick: secId && slot ? (e: any) => { const r = e.currentTarget.getBoundingClientRect(); setColorTarget({ secId, slot, x: r.left, y: r.top }); } : undefined,
      onPointerDown: canDrag ? startInteract : undefined,
      onPointerMove: canDrag ? (e: any) => { if (e.buttons) return; const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.cursor = e.clientX > r.right - 16 ? 'ew-resize' : 'move'; } : undefined,
      onKeyDown: (e: any) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
        else if (e.key === 'Escape') { e.currentTarget.textContent = value; e.currentTarget.blur(); }
      },
      onBlur: (e: any) => {
        const txt = (e.currentTarget.textContent ?? '').slice(0, max).trim();
        if (txt === value) { e.currentTarget.textContent = value; return; }
        if (commit) commit(txt);
        else if (metaField) edit!.setMeta(metaField, txt);
        else if (secId && slot) edit!.setText(secId, slot, txt);
      },
    }, value);
  }).current;

  /** Image leaf: plain tile (read) or tile + change menu (+ optional remove) when editing. */
  function imgNode(secId: string, slot: string, ref: ImageRef | undefined, aspect: string, key?: string, onRemove?: () => void) {
    if (!ref) return null;
    if (!editing) return <Tile key={key} img={ref} aspect={aspect} />;
    return <EditableTile key={key} img={ref} aspect={aspect} onRemove={onRemove}
      onPick={(id) => edit!.setImage(secId, slot, { ...ref, presetId: id })}
      onLabel={(v) => edit!.setImage(secId, slot, { ...ref, label: v, alt: v })} />;
  }

  /** Display switcher + add-tile + buttons row — only rendered while editing. */
  function dispSwitch(sec: Sec) {
    if (!editing) return null;
    const cur = sec.display ?? 'grid';
    const opt = (v: SectionDisplay, label: string) => (
      <button key={v} type="button" className={`pv-dispbtn${cur === v ? ' on' : ''}`} onClick={() => edit!.setDisplay(sec.id, v)}>{label}</button>
    );
    return <div className="pv-dispswitch" contentEditable={false}>{opt('grid', 'Grid')}{opt('carousel', 'Carousel')}{opt('marquee', 'Band')}{opt('masonry', 'Masonry')}{opt('list', 'List')}</div>;
  }

  function addTile(secId: string) {
    if (!editing) return null;
    return <button type="button" className="pv-addtile" aria-label="Add image" onClick={() => edit!.addImage(secId)}>+</button>;
  }

  function buttons(sec: Sec, slots: string[], primaryClass = 'pv-btn') {
    const present = slots.filter((s) => s in sec.text);
    return (
      <div className="pv-btnrow">
        {present.map((slot, idx) => (
          <span className="pv-btnwrap" key={slot}>
            <Ed as="span" className={idx > 0 ? 'pv-btn pv-btn-ghost' : primaryClass} secId={sec.id} slot={slot} value={T(sec, slot)} ph="Button" />
            {editing && <button type="button" className="pv-rmbtn pv-rmbtn-inline" aria-label="Remove button" onClick={() => edit!.removeButton(sec.id, slot)}>×</button>}
          </span>
        ))}
        {editing && present.length < slots.length && (
          <button type="button" className="pv-addbtn" onClick={() => edit!.addButton(sec.id)}>+ Button</button>
        )}
      </div>
    );
  }

  /** gallery / products with a per-section display (grid / carousel / marquee). */
  function collection(sec: Sec, kind: 'gallery' | 'products') {
    const display: SectionDisplay = sec.display ?? 'grid';
    const titleEl = <Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Section title" />;
    const galTile = (k: string) => imgNode(sec.id, k, sec.images[k], '1:1', k, () => edit!.removeImage(sec.id, k));
    const prodCard = (i: number) => (
      <div className="pv-product" key={`p${i}`}>
        {imgNode(sec.id, `prod${i}.img`, sec.images[`prod${i}.img`], '1:1', `pi${i}`, () => edit!.removeImage(sec.id, `prod${i}.img`))}
        <div className="pv-product-row">
          <Ed as="span" className="pv-product-name" secId={sec.id} slot={`prod${i}.name`} value={T(sec, `prod${i}.name`)} ph="Product" />
          <Ed as="span" className="pv-product-price" secId={sec.id} slot={`prod${i}.price`} value={T(sec, `prod${i}.price`)} ph="€0" />
        </div>
      </div>
    );
    const items = kind === 'gallery' ? Object.keys(sec.images).map(galTile) : idxs(sec, 'prod').map(prodCard);
    const base = kind === 'gallery' ? 'pv-gallery' : 'pv-products';

    if (display === 'marquee' && !editing) {
      return (<>{titleEl}<div className="pv-marquee"><div className="pv-marquee-track">{items}{items.map((n, idx) => <span className="pv-mq-dup" aria-hidden="true" key={`dup${idx}`}>{n}</span>)}</div></div></>);
    }
    let cls: string = base;
    if (display === 'carousel' || (display === 'marquee' && editing)) cls = 'pv-carousel';
    else if (display === 'masonry') cls = 'pv-masonry';
    else if (display === 'list') cls = 'pv-collist';
    return (<>{titleEl}<div className={cls}>{items}{addTile(sec.id)}</div>{dispSwitch(sec)}</>);
  }

  const rootStyle = {
    '--p-bg': theme.bg, '--p-surface': theme.surface, '--p-text': theme.text, '--p-muted': theme.muted,
    '--p-accent': theme.accent, '--p-accent-text': theme.accentText, '--p-border': theme.border,
    '--p-head': `${font.heading}, system-ui, sans-serif`, '--p-body': `${font.body}, system-ui, sans-serif`,
    background: theme.bg, color: theme.text, fontFamily: 'var(--p-body)',
  } as CSSProperties;

  const animClass = spec.animation === 'none' ? 'pv-anim-none' : `pv-anim-${spec.animation}`;
  const rootClass = [
    'pv-root',
    `pv-align-${L.align}`,
    `pv-scale-${L.scale}`,
    `pv-cards-${L.cards}`,
    `pv-nav-${L.nav}`,
    `pv-feat-${L.feature}`,
    `pv-radius-${L.radius}`,
    `pv-type-${L.type}`,
    `pv-btn-${spec.btn ?? L.btn}`,
    `pv-density-${L.density}`,
    L.bands ? 'pv-bands' : '',
    animClass,
  ].join(' ');

  function heroBlock(sec: Sec) {
    const eyebrow = T(sec, 'eyebrow'), headline = T(sec, 'headline'), subhead = T(sec, 'subhead');
    const media = sec.images.media;
    const hp = media ? presetById(media.presetId) : null;
    const copy = (light = false) => (
      <>
        {(eyebrow || editing) && <Ed key="eb" as="p" className={`pv-eyebrow${light ? ' pv-light' : ''}`} secId={sec.id} slot="eyebrow" value={eyebrow} ph="Eyebrow" />}
        <Ed key="h" as="h2" className="pv-h1" secId={sec.id} slot="headline" value={headline} ph="Headline" />
        <Ed key="sh" as="p" className={`pv-lead${light ? ' pv-light' : ''}`} secId={sec.id} slot="subhead" value={subhead} ph="Short description" />
        <Fragment key="b">{buttons(sec, ['cta', 'cta2'])}</Fragment>
      </>
    );
    const pos: HeroPos = sec.pos ?? POS_FROM_HERO[L.hero] ?? 'right';
    const w: HeroWidth = sec.width ?? (pos.startsWith('full') || pos === 'top' || pos === 'bannerTop' ? 'lg' : 'md');
    const va: HeroVAlign = sec.valign ?? 'mid';
    const wcls = `pv-w-${w} pv-v-${va}`;
    const sw = heroSwitch(sec, pos);
    const tile = (aspect: string) => (media ? imgNode(sec.id, 'media', media, aspect) : null);
    const ovMenu = editing && media ? (
      <ImageMenu img={media} corner
        onPick={(id) => edit!.setImage(sec.id, 'media', { ...media, presetId: id })}
        onLabel={(v) => edit!.setImage(sec.id, 'media', { ...media, label: v, alt: v })} />
    ) : null;

    if (pos === 'full' || pos === 'fullLeft' || pos === 'fullRight') {
      const al = pos === 'fullLeft' ? 'pv-ov-left' : pos === 'fullRight' ? 'pv-ov-right' : 'pv-ov-center';
      return (
        <div className={`pv-hero-overlay ${wcls} ${al}`} style={hp?.url ? { backgroundImage: `url(${hp.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: hp?.css ?? '#222' }}>
          <div className="pv-hero-scrim" />
          <div className="pv-hero-ov-copy">{copy(true)}</div>
          {sw}{ovMenu}
        </div>
      );
    }
    if (pos === 'none') {
      return <div className={`pv-hero-minimal ${wcls}`}>{copy()}{sw}</div>;
    }
    if (pos === 'top') {
      return (
        <div className={`pv-hero-centered ${wcls}`}>
          {copy()}
          {media && <div className="pv-hero-banner">{tile('16:9')}</div>}
          {sw}
        </div>
      );
    }
    if (pos === 'bannerTop') {
      return (
        <div className={`pv-hero-centered pv-hero-bannertop ${wcls}`}>
          {media && <div className="pv-hero-banner">{tile('16:9')}</div>}
          {copy()}
          {sw}
        </div>
      );
    }
    if (pos === 'frame') {
      return (
        <div className={`pv-hero-split pv-hero-framewrap ${wcls}`}>
          <div className="pv-hero-copy">{copy()}{sw}</div>
          {media && <div className="pv-hero-media pv-hero-frame">{tile('4:3')}</div>}
        </div>
      );
    }
    if (pos === 'left') {
      return (
        <div className={`pv-hero-split pv-hero-imgleft ${wcls}`}>
          {media && <div className="pv-hero-media">{tile('16:9')}</div>}
          <div className="pv-hero-copy">{copy()}{sw}</div>
        </div>
      );
    }
    return (
      <div className={`pv-hero-split ${wcls}`}>
        <div className="pv-hero-copy">{copy()}{sw}</div>
        {media && <div className="pv-hero-media">{tile('16:9')}</div>}
      </div>
    );
  }

  function heroSwitch(sec: Sec, pos: HeroPos) {
    if (!editing) return null;
    return <HeroCtl pos={pos} onPos={(v) => edit!.setPos(sec.id, v)} />;
  }

  function featSwitch(sec: Sec, feat: string) {
    if (!editing) return null;
    const opt = (v: SectionDisplay, label: string) => (
      <button key={v} type="button" className={`pv-dispbtn${feat === v ? ' on' : ''}`} onClick={() => edit!.setDisplay(sec.id, v)}>{label}</button>
    );
    return <div className="pv-dispswitch" contentEditable={false}>{opt('grid', 'Grid')}{opt('rows', 'Rows')}{opt('split', 'Split')}{opt('cards', 'Cards')}{opt('numbered', 'Numbered')}</div>;
  }

  // features + steps share one renderer; the section's display (else template default) picks the arrangement
  function itemSection(sec: Sec, prefix: 'item' | 'step') {
    const title = T(sec, 'title');
    const items = idxs(sec, prefix);
    const feat = (['grid', 'rows', 'split', 'cards', 'numbered'] as SectionDisplay[]).includes(sec.display as SectionDisplay) ? (sec.display as string) : L.feature;
    const num = (n: number) => (prefix === 'step' || feat !== 'grid' ? String(n + 1).padStart(2, '0') : '');
    const row = (i: number, n: number) => (
      <div className="pv-frow" key={i}>
        <span className="pv-fnum">{num(n)}</span>
        <div className="pv-frow-main">
          <Ed as="h4" className="pv-h4" secId={sec.id} slot={`${prefix}${i}.title`} value={T(sec, `${prefix}${i}.title`)} ph="Title" />
          <Ed as="p" className="pv-muted" secId={sec.id} slot={`${prefix}${i}.body`} value={T(sec, `${prefix}${i}.body`)} ph="Description" />
        </div>
      </div>
    );
    const titleEl = <Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={title} ph="Section title" />;
    if (feat === 'split') {
      return (
        <>
        <div className="pv-fsplit">
          <div className="pv-fsplit-head">{titleEl}</div>
          <div className="pv-fsplit-list">{items.map((i, n) => row(i, n))}</div>
        </div>
        {featSwitch(sec, feat)}</>
      );
    }
    if (feat === 'rows' || feat === 'numbered') {
      return (<>{titleEl}<div className={`pv-rows${feat === 'numbered' ? ' pv-rows-num' : ''}`}>{items.map((i, n) => row(i, n))}</div>{featSwitch(sec, feat)}</>);
    }
    // grid (default) / cards
    return (<>{titleEl}<div className={`pv-grid3${feat === 'cards' ? ' pv-feat-cards' : ''}`}>{items.map((i, n) => (
      prefix === 'step'
        ? <div className="pv-step" key={i}><span className="pv-stepnum">{n + 1}</span><Ed as="h4" className="pv-h4" secId={sec.id} slot={`step${i}.title`} value={T(sec, `step${i}.title`)} ph="Title" /><Ed as="p" className="pv-muted" secId={sec.id} slot={`step${i}.body`} value={T(sec, `step${i}.body`)} ph="Description" /></div>
        : <div className="pv-card" key={i}><span className="pv-dot" /><Ed as="h4" className="pv-h4" secId={sec.id} slot={`item${i}.title`} value={T(sec, `item${i}.title`)} ph="Title" /><Ed as="p" className="pv-muted" secId={sec.id} slot={`item${i}.body`} value={T(sec, `item${i}.body`)} ph="Description" /></div>
    ))}</div>{featSwitch(sec, feat)}</>);
  }

  function body(sec: Sec, type: SectionDef['type']) {
    switch (type) {
      case 'features':
        return itemSection(sec, 'item');
      case 'steps':
        return itemSection(sec, 'step');
      case 'stats':
        return (<div className="pv-stats">{idxs(sec, 'stat').map((i) => (
          <div className="pv-stat" key={i}><Ed as="span" className="pv-statv" secId={sec.id} slot={`stat${i}.value`} value={T(sec, `stat${i}.value`)} ph="00" /><Ed as="span" className="pv-statl" secId={sec.id} slot={`stat${i}.label`} value={T(sec, `stat${i}.label`)} ph="Label" /></div>
        ))}</div>);
      case 'pricing': {
        const plans = idxs(sec, 'plan');
        return (<><Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Section title" /><div className="pv-grid3">{plans.map((i, n) => (
          <div className={`pv-plan${n === plans.length - 1 ? ' pv-plan-hi' : ''}`} key={i}><Ed as="span" className="pv-plan-name" secId={sec.id} slot={`plan${i}.name`} value={T(sec, `plan${i}.name`)} ph="Plan" /><Ed as="span" className="pv-plan-price" secId={sec.id} slot={`plan${i}.price`} value={T(sec, `plan${i}.price`)} ph="Price" /><Ed as="p" className="pv-muted" secId={sec.id} slot={`plan${i}.features`} value={T(sec, `plan${i}.features`)} ph="What's included" /></div>
        ))}</div></>);
      }
      case 'products':
        return collection(sec, 'products');
      case 'gallery':
        return collection(sec, 'gallery');
      case 'about':
        return (<div className="pv-about">{sec.images.media && <div className="pv-about-media">{imgNode(sec.id, 'media', sec.images.media, '4:3')}</div>}<div className="pv-about-copy"><Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Section title" /><Ed as="p" className="pv-lead" secId={sec.id} slot="body" value={T(sec, 'body')} ph="Tell your story" /></div></div>);
      case 'cta':
        return (<div className="pv-ctaband"><Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Call to action" /><Ed as="p" className="pv-ctasub" secId={sec.id} slot="sub" value={T(sec, 'sub')} ph="Supporting line" />{buttons(sec, ['button', 'button2'], 'pv-btn pv-btn-invert')}</div>);
      case 'contact':
        return (<div className="pv-contact"><Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Section title" /><Ed as="p" className="pv-lead" secId={sec.id} slot="body" value={T(sec, 'body')} ph="Hours / message" /><div className="pv-contact-row">{(T(sec, 'email') || editing) && <Ed as="span" className="pv-pill" secId={sec.id} slot="email" value={T(sec, 'email')} ph="email@…" />}{(T(sec, 'phone') || editing) && <Ed as="span" className="pv-pill" secId={sec.id} slot="phone" value={T(sec, 'phone')} ph="Phone" />}</div></div>);
      case 'logos': {
        const keys = Object.keys(sec.text).filter((k) => /^logo\d+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
        const chip = (k: string) => <span className="pv-logo" key={k}><Ed as="span" className="pv-logo-t" secId={sec.id} slot={k} value={T(sec, k)} ph="Brand" /></span>;
        const title = (T(sec, 'title') || editing) ? <Ed as="p" className="pv-logos-title" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Trusted by" /> : null;
        if ((sec.display ?? 'marquee') === 'marquee' && !editing) {
          const chips = keys.map(chip);
          return (<>{title}<div className="pv-marquee"><div className="pv-marquee-track pv-logos-track">{chips}{chips.map((c, i) => <span className="pv-mq-dup" aria-hidden="true" key={`d${i}`}>{c}</span>)}</div></div></>);
        }
        return (<>{title}{dispSwitch(sec)}<div className="pv-logos">{keys.map(chip)}</div></>);
      }
      case 'quote':
        return (<blockquote className="pv-quote"><Ed as="p" className="pv-quote-t" secId={sec.id} slot="quote" value={T(sec, 'quote')} ph="Their words…" /><Ed as="footer" className="pv-quote-a" secId={sec.id} slot="author" value={T(sec, 'author')} ph="Name, role" /></blockquote>);
      case 'faq': {
        const qs = Object.keys(sec.text).filter((k) => /^q\d+$/.test(k)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
        return (<><Ed as="h3" className="pv-h2" secId={sec.id} slot="title" value={T(sec, 'title')} ph="Section title" /><div className="pv-faq">{qs.map((k) => { const n = k.slice(1); return (
          <div className="pv-faq-item" key={k}><Ed as="h4" className="pv-faq-q" secId={sec.id} slot={`q${n}`} value={T(sec, `q${n}`)} ph="Question" /><Ed as="p" className="pv-muted" secId={sec.id} slot={`a${n}`} value={T(sec, `a${n}`)} ph="Answer" /></div>
        ); })}</div></>);
      }
      default:
        return null;
    }
  }

  function navBlock() {
    const tag = spec.meta.tagline;
    const brand = <Ed as="span" className="pv-brand" metaField="siteName" value={editing ? spec.meta.siteName : spec.meta.siteName || 'Your Brand'} ph="Brand name" />;
    if (L.nav === 'links') {
      const links = spec.nav ?? ['Work', 'About', 'Contact'];
      return (
        <header className="pv-nav">
          {brand}
          <nav className="pv-navlinks">{links.map((l, i) => <Ed key={i} as="span" value={l} commit={(v) => edit!.setNavLink(i, v)} mx={24} ph="Link" />)}</nav>
        </header>
      );
    }
    if (L.nav === 'minimal') {
      return <header className="pv-nav">{brand}</header>;
    }
    return (
      <header className="pv-nav">
        {brand}
        {(tag || editing) && <Ed as="span" className="pv-tagline" metaField="tagline" value={tag} ph="Tagline" />}
      </header>
    );
  }

  function secTools(sec: Sec, def: SectionDef, idx: number, off: boolean) {
    if (!editing) return null;
    const total = spec.sections.length;
    return (
      <div className="pv-sectools" contentEditable={false}>
        <button type="button" className="pv-stbtn" disabled={idx === 0} title="Move up" onClick={() => edit!.moveSection(sec.id, -1)}>↑</button>
        <button type="button" className="pv-stbtn" disabled={idx === total - 1} title="Move down" onClick={() => edit!.moveSection(sec.id, 1)}>↓</button>
        {def.toggleable && <button type="button" className="pv-stbtn" title={off ? 'Show' : 'Hide'} onClick={() => edit!.toggle(sec.id)}>{off ? 'Show' : 'Hide'}</button>}
        {def.toggleable && <button type="button" className="pv-stbtn pv-stbtn-del" title="Delete section" onClick={() => edit!.deleteSection(sec.id)}>Delete</button>}
      </div>
    );
  }

  function footerBlock() {
    const name = spec.meta.siteName || 'Your Brand';
    const f = FOOTER[spec.templateId] ?? 'minimal';
    if (f === 'columns') {
      return (
        <footer className="pv-footer pv-footer-cols">
          <div className="pv-foot-brand"><span className="pv-brand">{name}</span><span className="pv-tagline">{spec.meta.tagline}</span></div>
          <div className="pv-foot-links"><span>Explore</span><span>About</span><span>Services</span><span>Contact</span></div>
          <div className="pv-foot-copy">© {name}</div>
        </footer>
      );
    }
    if (f === 'cta') {
      return (
        <footer className="pv-footer pv-footer-cta">
          <div className="pv-footcta"><span className="pv-footcta-h">Ready when you are</span><span className="pv-btn">Get in touch</span></div>
          <div className="pv-foot-copy">© {name}</div>
        </footer>
      );
    }
    if (f === 'social') {
      return (
        <footer className="pv-footer pv-footer-social">
          <span className="pv-brand">{name}</span>
          <div className="pv-foot-soc"><span>IG</span><span>FB</span><span>X</span></div>
          <div className="pv-foot-copy">© {name}</div>
        </footer>
      );
    }
    return <footer className="pv-footer">© {name}</footer>;
  }

  const COLORS = [theme.text, theme.accent, theme.muted, '#ffffff', '#0f1115', '#e11d48', '#ea580c', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#ca8a04'];

  let order = 0;
  let bandIdx = 0;
  return (
    <div className={rootClass} style={rootStyle} ref={rootRef} onClick={() => { if (editing) { setSelected(null); setColorTarget(null); } }}>
      <style>{PV_CSS}</style>
      {editing && colorTarget && (
        <div className="pv-colorbar" style={{ left: colorTarget.x, top: Math.max(8, colorTarget.y - 42) }} onClick={(e) => e.stopPropagation()}>
          {COLORS.map((c) => (
            <button key={c} type="button" className="pv-colorsw" style={{ background: c }} title={c} onMouseDown={(e) => e.preventDefault()} onClick={() => edit!.setColor(colorTarget.secId, colorTarget.slot, c)} />
          ))}
          <button type="button" className="pv-colorsw pv-colorsw-reset" title="Reset" onMouseDown={(e) => e.preventDefault()} onClick={() => edit!.setColor(colorTarget.secId, colorTarget.slot, '')}>⌫</button>
          <button type="button" className="pv-colorsw pv-colorsw-close" title="Close" onMouseDown={(e) => e.preventDefault()} onClick={() => setColorTarget(null)}>×</button>
        </div>
      )}
      {navBlock()}

      {spec.sections.map((sec, idx) => {
        const def = defs[sec.id];
        if (!def) return null;
        if (!sec.enabled && !editing) return null;
        const off = !sec.enabled;
        const tools = secTools(sec, def, idx, off);
        const cls = `${editing ? 'pv-editsec ' : ''}${off ? 'pv-secoff ' : ''}`;
        const onSel = editing ? (e: React.MouseEvent) => { e.stopPropagation(); setSelected(sec.id); } : undefined;
        const selCls = isSel(sec.id) ? ' pv-selected' : '';
        const rev = editing ? '' : ' pv-reveal'; // reveal-on-scroll only on the published site; in the editor sections stay visible
        if (def.type === 'hero') {
          return <div className={`${cls}pv-herowrap${rev}${selCls}`} key={sec.id} onClick={onSel}>{heroBlock(sec)}{tools}</div>;
        }
        const band = L.bands && !off && bandIdx++ % 2 === 0;
        return (
          <section className={`${cls}pv-sec${rev}${band ? ' pv-band' : ''}${selCls}`} style={{ ['--i' as string]: order++ }} key={sec.id} onClick={onSel}>
            {body(sec, def.type)}{tools}
          </section>
        );
      })}
      {editing && (
        <AddSection
          options={(() => {
            const present = new Set(spec.sections.map((s) => s.id));
            const seen = new Set<string>();
            return [...tpl.sections, ...universalBlocks]
              .filter((d) => !present.has(d.id) && !seen.has(d.id) && (seen.add(d.id), true))
              .map((d) => ({ id: d.id, label: d.type === 'faq' ? 'FAQ' : d.type.charAt(0).toUpperCase() + d.type.slice(1) }));
          })()}
          onAdd={(id) => edit!.addSection(id)}
        />
      )}

      {footerBlock()}
    </div>
  );
}

const PV_CSS = `
.pv-root { --pv-pad: clamp(20px, 4vw, 56px); --h1: clamp(30px,5vw,48px); line-height: 1.5; }
.pv-root * { box-sizing: border-box; }
.pv-scale-sm { --h1: clamp(24px,3.6vw,38px); }
.pv-scale-md { --h1: clamp(28px,4.6vw,46px); }
.pv-scale-lg { --h1: clamp(32px,5.6vw,54px); }
.pv-scale-xl { --h1: clamp(38px,7vw,66px); }
.pv-nav { display:flex; align-items:baseline; justify-content:space-between; gap:12px; padding:16px var(--pv-pad); border-bottom:1px solid var(--p-border); background:var(--p-surface); }
.pv-brand { font-family:var(--p-head); font-weight:700; font-size:18px; color:var(--p-text); }
.pv-tagline { color:var(--p-muted); font-size:13px; }
.pv-sec { padding: clamp(34px,6vw,72px) var(--pv-pad); }
.pv-band { background: var(--p-surface); }
.pv-herowrap { padding: clamp(28px,5vw,64px) var(--pv-pad); }
.pv-eyebrow { text-transform:uppercase; letter-spacing:.14em; font-size:12px; font-weight:600; color:var(--p-accent); margin:0 0 14px; }
.pv-light { color:rgba(255,255,255,0.9) !important; }
.pv-h1 { font-family:var(--p-head); font-weight:700; font-size:var(--h1); line-height:1.06; margin:0; letter-spacing:-0.015em; text-wrap:balance; color:var(--p-text); }
.pv-h2 { font-family:var(--p-head); font-weight:700; font-size:clamp(22px,3.2vw,34px); margin:0 0 26px; letter-spacing:-0.01em; text-wrap:balance; }
.pv-h4 { font-family:var(--p-head); font-weight:600; font-size:18px; margin:14px 0 6px; }
.pv-lead { color:var(--p-muted); font-size:clamp(15px,1.4vw,18px); margin:18px 0 0; max-width:60ch; line-height:1.6; }
.pv-muted { color:var(--p-muted); font-size:15px; margin:0; line-height:1.55; }
.pv-btn { display:inline-flex; align-items:center; margin-top:26px; padding:12px 22px; border-radius:12px; background:var(--p-accent); color:var(--p-accent-text); font-weight:600; font-size:15px; }
.pv-btn-invert { background:var(--p-surface); color:var(--p-text); }
.pv-btn-ghost { background:transparent; color:var(--p-text); border:1.5px solid var(--p-border); }
.pv-pill-accent { display:inline-block; padding:6px 14px; border-radius:999px; background:var(--p-accent); color:var(--p-accent-text); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; margin-bottom:18px; }

/* hero: split */
.pv-hero-split { display:grid; gap:clamp(24px,4vw,48px); align-items:center; }
@media (min-width:760px){ .pv-hero-split { grid-template-columns:1.05fr 0.95fr; } }
.pv-hero-media :where(.pv-tile){ width:100%; }
/* hero: centered */
.pv-hero-centered { text-align:center; }
.pv-hero-centered .pv-lead { margin-left:auto; margin-right:auto; }
.pv-hero-banner { margin-top:34px; }
/* hero: overlay */
.pv-hero-overlay { position:relative; min-height:clamp(280px,40vw,420px); border-radius:20px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.pv-hero-scrim { position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6)); }
.pv-hero-ov-copy { position:relative; text-align:center; padding:clamp(24px,4vw,48px); max-width:680px; }
.pv-hero-overlay .pv-h1 { color:#fff; }
/* hero: minimal */
.pv-hero-minimal { max-width:var(--hw,46ch); }
.pv-hero-minimal .pv-h1 { letter-spacing:-0.03em; }
/* hero text width control */
.pv-w-sm { --hw:30ch; } .pv-w-md { --hw:46ch; } .pv-w-lg { --hw:64ch; } .pv-w-full { --hw:100%; }
.pv-hero-copy .pv-h1, .pv-hero-copy .pv-lead { max-width:var(--hw,none); }
.pv-hero-centered .pv-h1, .pv-hero-centered .pv-lead { max-width:var(--hw,none); margin-left:auto; margin-right:auto; }
.pv-hero-ov-copy .pv-h1, .pv-hero-ov-copy .pv-lead { max-width:var(--hw,none); margin-left:auto; margin-right:auto; }
.pv-heroctl { position:absolute; top:10px; left:10px; z-index:6; display:flex; flex-direction:column; gap:5px; align-items:flex-start; }
.pv-heroctl-toggle { padding:5px 12px; border-radius:8px; border:1px solid var(--p-border); background:var(--p-surface); color:var(--p-text); font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 6px 18px -8px rgba(0,0,0,0.4); }
.pv-heroctl-rows { display:flex; flex-direction:column; gap:5px; margin-top:5px; }
.pv-heroctl-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; margin-top:5px; padding:3px; border:1px solid var(--p-border); border-radius:10px; background:var(--p-surface); width:max-content; box-shadow:0 8px 22px -10px rgba(0,0,0,0.4); }
/* full-bg copy alignment */
.pv-hero-overlay.pv-ov-left { justify-content:flex-start; }
.pv-hero-overlay.pv-ov-right { justify-content:flex-end; }
.pv-ov-left .pv-hero-ov-copy { text-align:left; }
.pv-ov-right .pv-hero-ov-copy { text-align:right; }
.pv-ov-left .pv-hero-ov-copy .pv-h1, .pv-ov-left .pv-hero-ov-copy .pv-lead { margin-left:0; margin-right:auto; }
.pv-ov-right .pv-hero-ov-copy .pv-h1, .pv-ov-right .pv-hero-ov-copy .pv-lead { margin-right:0; margin-left:auto; }
/* banner above copy */
.pv-hero-bannertop .pv-hero-banner { margin-top:0; margin-bottom:34px; }
/* framed image */
.pv-hero-frame { padding:14px; border:1px solid var(--p-border); border-radius:calc(var(--pv-r) + 8px); background:var(--p-surface); box-shadow:0 22px 50px -26px rgba(0,0,0,0.5); }
.pv-draggable { cursor:move; touch-action:none; }
.pv-draggable:hover { box-shadow:0 0 0 2px color-mix(in srgb, var(--p-accent) 40%, transparent); }
.pv-colorbar { position:fixed; z-index:99998; display:flex; flex-wrap:wrap; gap:4px; max-width:204px; padding:5px; border-radius:10px; background:#fff; box-shadow:0 12px 34px -10px rgba(0,0,0,0.45); border:1px solid rgba(0,0,0,0.08); }
.pv-colorsw { width:20px; height:20px; border-radius:50%; border:1px solid rgba(0,0,0,0.15); cursor:pointer; padding:0; }
.pv-colorsw-reset { background:#fff; font-size:11px; color:#666; display:inline-flex; align-items:center; justify-content:center; }
.pv-colorsw-close { background:#1a1a1a; color:#fff; font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center; border-color:#1a1a1a; }
/* hero text vertical placement (mainly the full / overlay hero) */
.pv-hero-overlay.pv-v-top { align-items:flex-start; }
.pv-hero-overlay.pv-v-mid { align-items:center; }
.pv-hero-overlay.pv-v-bottom { align-items:flex-end; }
.pv-hero-overlay.pv-v-top .pv-hero-ov-copy, .pv-hero-overlay.pv-v-bottom .pv-hero-ov-copy { padding-top:clamp(24px,5vw,56px); padding-bottom:clamp(24px,5vw,56px); }
/* hero: bold */
.pv-hero-bold { text-align:center; }
.pv-hero-bold-copy { max-width:760px; margin:0 auto; }
.pv-hero-bold .pv-lead { margin-left:auto; margin-right:auto; }
.pv-hero-bold-media { margin-top:38px; }
/* hero: editorial */
.pv-hero-editorial { display:grid; gap:clamp(24px,4vw,44px); align-items:center; }
@media (min-width:760px){ .pv-hero-editorial { grid-template-columns:1.2fr 0.8fr; } }
.pv-hero-ed-media { max-width:300px; margin:0 auto; }

/* grids + cards */
.pv-grid3 { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); }
.pv-card { background:var(--p-surface); border:1px solid var(--p-border); border-radius:16px; padding:24px; }
.pv-cards-plain .pv-card { background:transparent; border:none; padding:6px 4px; }
.pv-cards-bordered .pv-card { background:transparent; }
.pv-dot { display:block; width:10px; height:10px; border-radius:50%; background:var(--p-accent); }
.pv-cards-list .pv-card { border:none; border-bottom:1px solid var(--p-border); border-radius:0; padding:18px 0; background:transparent; }

.pv-step { background:var(--p-surface); border:1px solid var(--p-border); border-radius:16px; padding:24px; }
.pv-stepnum { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:50%; background:var(--p-accent); color:var(--p-accent-text); font-family:var(--p-head); font-weight:700; font-size:15px; }
.pv-stats { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); text-align:center; }
.pv-stat { background:var(--p-surface); border:1px solid var(--p-border); border-radius:16px; padding:22px 16px; }
.pv-statv { display:block; font-family:var(--p-head); font-weight:700; font-size:clamp(26px,4vw,40px); color:var(--p-text); line-height:1; }
.pv-statl { display:block; margin-top:8px; color:var(--p-muted); font-size:13px; text-transform:uppercase; letter-spacing:.08em; }
.pv-plan { background:var(--p-surface); border:1px solid var(--p-border); border-radius:16px; padding:24px; display:flex; flex-direction:column; gap:6px; }
.pv-plan-hi { border-color:var(--p-accent); box-shadow:0 0 0 1px var(--p-accent); }
.pv-plan-name { font-family:var(--p-head); font-weight:600; font-size:16px; color:var(--p-text); }
.pv-plan-price { font-family:var(--p-head); font-weight:700; font-size:clamp(24px,3vw,32px); color:var(--p-text); }
.pv-plan .pv-muted { margin-top:8px; }
.pv-products { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
.pv-product-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; }
.pv-product-name { font-weight:500; font-size:14px; color:var(--p-text); }
.pv-product-price { font-family:var(--p-head); font-weight:700; font-size:15px; color:var(--p-accent); }
.pv-gallery { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
/* extra gallery/feature layout modes */
.pv-masonry { columns:3 170px; column-gap:14px; }
.pv-masonry > * { break-inside:avoid; margin-bottom:14px; display:block; }
.pv-collist { display:flex; flex-direction:column; gap:16px; }
.pv-rows-num .pv-fnum { font-size:clamp(28px,4.4vw,50px); color:var(--p-accent); font-weight:800; line-height:1; }
.pv-feat-cards .pv-card, .pv-feat-cards .pv-step { background:var(--p-surface); border:1px solid var(--p-border); border-radius:var(--pv-r); padding:24px; box-shadow:0 16px 34px -22px rgba(0,0,0,0.5); }
.pv-about { display:grid; gap:clamp(24px,4vw,48px); align-items:center; }
@media (min-width:760px){ .pv-about { grid-template-columns:0.9fr 1.1fr; } }
.pv-ctaband { background:var(--p-accent); border-radius:22px; padding:clamp(28px,4vw,48px); text-align:center; }
.pv-contact { text-align:center; }
.pv-contact .pv-lead { margin-left:auto; margin-right:auto; }
.pv-contact-row { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-top:24px; }
.pv-pill { padding:10px 18px; border:1px solid var(--p-border); border-radius:999px; background:var(--p-surface); font-size:14px; color:var(--p-text); }
/* logos band */
.pv-logos-title { text-align:center; color:var(--p-muted); font-size:13px; text-transform:uppercase; letter-spacing:.14em; margin:0 0 22px; }
.pv-logos { display:flex; flex-wrap:wrap; gap:14px 30px; align-items:center; justify-content:center; }
.pv-logos-track { align-items:center; }
.pv-logo-t { font-family:var(--p-head); font-weight:700; font-size:clamp(16px,2.2vw,22px); color:var(--p-muted); opacity:.7; letter-spacing:-0.01em; }
/* quote */
.pv-quote { margin:0 auto; text-align:center; max-width:760px; }
.pv-quote-t { font-family:var(--p-head); font-weight:600; font-size:clamp(20px,3.4vw,32px); line-height:1.3; color:var(--p-text); letter-spacing:-0.015em; text-wrap:balance; margin:0; }
.pv-quote-a { margin:22px 0 0; color:var(--p-muted); font-size:14px; font-weight:500; }
/* faq */
.pv-faq { display:flex; flex-direction:column; max-width:760px; }
.pv-faq-item { padding:20px 0; border-top:1px solid var(--p-border); }
.pv-faq-item:first-child { border-top:none; }
.pv-faq-q { font-family:var(--p-head); font-weight:600; font-size:17px; margin:0 0 8px; color:var(--p-text); }
.pv-footer { padding:26px var(--pv-pad); border-top:1px solid var(--p-border); color:var(--p-muted); font-size:13px; background:var(--p-surface); }
.pv-footer-cols { display:grid; gap:20px; }
@media(min-width:680px){ .pv-footer-cols { grid-template-columns:1.5fr 1fr auto; align-items:start; padding-top:40px; padding-bottom:40px; } }
.pv-foot-brand { display:flex; flex-direction:column; gap:5px; }
.pv-foot-links { display:flex; flex-wrap:wrap; gap:18px; }
.pv-foot-links span { color:var(--p-muted); font-size:13px; }
.pv-foot-copy { color:var(--p-muted); font-size:12px; }
.pv-footer-cta { display:flex; flex-direction:column; gap:22px; padding-top:40px; padding-bottom:34px; }
.pv-footcta { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:18px; }
.pv-footcta-h { font-family:var(--p-head); font-weight:700; font-size:clamp(20px,3vw,32px); letter-spacing:-0.01em; color:var(--p-text); }
.pv-footer-cta .pv-btn { margin-top:0; }
.pv-footer-social { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; padding-top:38px; padding-bottom:30px; }
.pv-foot-soc { display:flex; gap:10px; }
.pv-foot-soc span { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--p-border); border-radius:50%; font-size:11px; font-weight:600; color:var(--p-text); }
.pv-tile { position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid rgba(0,0,0,0.05); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18); }
.pv-tile-label { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:500; padding:0 12px; text-align:center; }
.pv-tile-photo { width:100%; }
.pv-photo { width:100%; height:100%; object-fit:cover; display:block; }

/* alignment */
.pv-align-center .pv-sec { text-align:center; }
.pv-align-center .pv-h2 { margin-left:auto; margin-right:auto; }
.pv-align-center .pv-lead, .pv-align-center .pv-muted { margin-left:auto; margin-right:auto; }
.pv-align-center .pv-card, .pv-align-center .pv-step { text-align:center; }
.pv-align-center .pv-dot { margin-left:auto; margin-right:auto; }
.pv-align-center .pv-stepnum { margin-left:auto; margin-right:auto; }

/* anim */
/* scroll-reveal entrance — JS arms (.pv-armed) then adds .pv-in as each section scrolls in */
.pv-armed .pv-reveal { opacity:0; transition:opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1), filter .8s ease; }
.pv-armed .pv-reveal.pv-in { opacity:1; transform:none; filter:none; }
.pv-anim-fade.pv-armed .pv-reveal:not(.pv-in)  { transform:none; }
.pv-anim-rise.pv-armed .pv-reveal:not(.pv-in)  { transform:translateY(34px); }
.pv-anim-slide.pv-armed .pv-reveal:not(.pv-in) { transform:translateX(-46px); }
.pv-anim-zoom.pv-armed .pv-reveal:not(.pv-in)  { transform:scale(.9); }
.pv-anim-blur.pv-armed .pv-reveal:not(.pv-in)  { filter:blur(16px); transform:translateY(16px); }
.pv-anim-sweep.pv-armed .pv-reveal:not(.pv-in) { transform:translateX(46px); }
.pv-anim-flip.pv-armed .pv-reveal { transform-origin:top center; }
.pv-anim-flip.pv-armed .pv-reveal:not(.pv-in)  { transform:perspective(900px) rotateX(12deg) translateY(22px); }
.pv-anim-pop.pv-armed .pv-reveal:not(.pv-in)   { transform:scale(.82); }
.pv-anim-none.pv-armed .pv-reveal { opacity:1; transform:none; filter:none; transition:none; }
@media (prefers-reduced-motion: reduce){
  .pv-armed .pv-reveal { opacity:1 !important; transform:none !important; filter:none !important; transition:none; }
}

/* ════════ per-template layout language ════════ */

/* corner language — one set of radii drives the whole template */
.pv-root { --pv-r:14px; --pv-rbtn:12px; --pv-rtile:14px; }
.pv-radius-sharp { --pv-r:3px;  --pv-rbtn:3px;   --pv-rtile:3px; }
.pv-radius-soft  { --pv-r:14px; --pv-rbtn:12px;  --pv-rtile:14px; }
.pv-radius-round { --pv-r:22px; --pv-rbtn:999px; --pv-rtile:20px; }
.pv-card, .pv-step, .pv-stat, .pv-plan { border-radius:var(--pv-r); }
.pv-tile { border-radius:var(--pv-rtile); }
.pv-btn { border-radius:var(--pv-rbtn); }
.pv-hero-overlay { border-radius:var(--pv-r); }
.pv-ctaband { border-radius:calc(var(--pv-r) + 6px); }

/* editorial rows (feature: rows) — breaks the 3-up grid into a numbered list */
.pv-rows { display:flex; flex-direction:column; }
.pv-frow { display:grid; grid-template-columns:auto 1fr; gap:clamp(16px,3vw,40px); align-items:start; padding:clamp(20px,2.6vw,30px) 0; border-top:1px solid var(--p-border); }
.pv-rows .pv-frow:first-child { border-top:none; }
.pv-fnum { font-family:var(--p-head); font-weight:700; font-size:clamp(19px,2.4vw,28px); line-height:1.1; color:var(--p-accent); font-variant-numeric:tabular-nums; min-width:1.5em; }
.pv-fnum:empty { display:none; }
.pv-frow-main .pv-h4 { margin-top:0; }
.pv-frow-main .pv-muted { max-width:62ch; }

/* split feature (feature: split) — sticky section title beside a list */
.pv-fsplit { display:grid; gap:clamp(20px,4vw,52px); }
@media (min-width:760px){ .pv-fsplit { grid-template-columns:0.8fr 1.2fr; align-items:start; } .pv-fsplit-head { position:sticky; top:16px; } }
.pv-fsplit-head .pv-h2 { margin-bottom:0; }
.pv-fsplit-list { display:flex; flex-direction:column; }
.pv-fsplit-list .pv-frow { padding:clamp(16px,2vw,24px) 0; }
.pv-fsplit-list .pv-frow:first-child { border-top:none; }
/* rows always read left, even in centered templates */
.pv-align-center .pv-frow, .pv-align-center .pv-fsplit-list { text-align:left; }
.pv-align-center .pv-frow-main .pv-muted { margin-left:0; margin-right:0; }

/* card variants */
.pv-cards-ticket .pv-card, .pv-cards-ticket .pv-step { border:1px solid var(--p-border); box-shadow:0 18px 36px -24px rgba(0,0,0,0.55); }
.pv-cards-numbered .pv-fnum { font-size:clamp(26px,3.6vw,46px); color:var(--p-muted); font-weight:700; }

/* nav variants — the header is the first read; differentiate it hard */
.pv-nav-left .pv-nav { justify-content:flex-start; gap:16px; align-items:baseline; }
.pv-nav-spread .pv-nav { justify-content:space-between; }
.pv-nav-center .pv-nav { flex-direction:column; align-items:center; gap:3px; text-align:center; }
.pv-nav-serif .pv-nav { flex-direction:column; align-items:center; gap:6px; padding-top:22px; padding-bottom:18px; }
.pv-nav-serif .pv-brand { font-size:clamp(20px,2.6vw,28px); letter-spacing:0.04em; font-weight:600; }
.pv-nav-serif .pv-tagline { text-transform:uppercase; letter-spacing:0.22em; font-size:11px; }
.pv-nav-minimal .pv-nav { justify-content:flex-start; }
.pv-nav-minimal .pv-brand { font-size:14px; letter-spacing:0.2em; text-transform:uppercase; font-weight:600; }
.pv-navlinks { display:flex; gap:clamp(14px,2vw,26px); }
.pv-navlinks span { color:var(--p-muted); font-size:13px; font-weight:500; }
@media (max-width:560px){ .pv-navlinks { display:none; } }

/* heading personality */
.pv-type-condensed .pv-h1, .pv-type-condensed .pv-h2 { text-transform:uppercase; letter-spacing:-0.005em; font-weight:800; line-height:1.03; }
.pv-type-condensed .pv-eyebrow, .pv-type-condensed .pv-statl { font-weight:700; }
.pv-type-condensed .pv-statv { font-weight:800; }
.pv-type-serifDisplay .pv-h1 { font-weight:700; letter-spacing:-0.02em; }
.pv-type-serifDisplay .pv-h2 { font-weight:600; }

/* button variants */
.pv-btn-pill .pv-btn { border-radius:999px; }
.pv-btn-outline .pv-btn:not(.pv-btn-invert) { background:transparent; color:var(--p-accent); border:1.5px solid var(--p-accent); }
.pv-btn-underline .pv-btn:not(.pv-btn-invert) { background:transparent; color:var(--p-text); border:none; border-bottom:2px solid var(--p-accent); border-radius:0; padding:6px 0; margin-top:24px; }

/* density rhythm */
.pv-density-tight .pv-sec { padding-top:clamp(26px,4vw,46px); padding-bottom:clamp(26px,4vw,46px); }
.pv-density-airy .pv-sec { padding-top:clamp(46px,8vw,104px); padding-bottom:clamp(46px,8vw,104px); }
.pv-density-airy .pv-herowrap { padding-top:clamp(40px,7vw,90px); padding-bottom:clamp(40px,7vw,90px); }

/* cta band keeps accent-on-accent legibility (h2/sub no longer inline-styled) */
.pv-ctaband .pv-h2 { color:var(--p-accent-text); margin-bottom:0; }
.pv-ctasub { color:var(--p-accent-text); opacity:0.92; margin:6px 0 0; }

/* ════════ edit mode (click-to-edit canvas) ════════ */
.pv-ed { outline:none; cursor:text; border-radius:4px; transition:box-shadow .12s ease, background .12s ease; }
.pv-ed:hover { box-shadow:0 0 0 2px color-mix(in srgb, var(--p-accent) 32%, transparent); }
.pv-ed:focus { box-shadow:0 0 0 2px var(--p-accent); background:color-mix(in srgb, var(--p-accent) 9%, transparent); }
.pv-ed:empty::before { content:attr(data-ph); opacity:.5; font-style:italic; }
.pv-imgwrap { position:relative; }
.pv-imgwrap > .pv-imgmenu { position:absolute; top:8px; right:8px; z-index:5; }
.pv-imgmenu-corner { position:absolute; top:10px; right:10px; z-index:5; }
.pv-imgedit { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px; border:none; background:rgba(15,17,23,0.82); color:#fff; font-size:12px; font-weight:600; cursor:pointer; }
.pv-imgedit:hover { background:rgba(15,17,23,0.95); }
.pv-imgpop { position:absolute; top:calc(100% + 6px); right:0; width:232px; padding:10px; border-radius:12px; background:#fff; box-shadow:0 18px 50px -12px rgba(0,0,0,0.45); border:1px solid rgba(0,0,0,0.08); z-index:8; }
.pv-imgpop-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
.pv-imgsw { height:26px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); cursor:pointer; padding:0; }
.pv-imgsw.on { outline:2px solid var(--p-accent); outline-offset:1px; }
.pv-imglabel { margin-top:8px; width:100%; border:1px solid rgba(0,0,0,0.12); border-radius:8px; padding:7px 9px; font-size:12px; color:#111; outline:none; }
.pv-imglabel:focus { border-color:var(--p-accent); }
.pv-editsec { position:relative; }
.pv-sectools { position:absolute; top:8px; right:8px; z-index:7; display:inline-flex; gap:3px; padding:3px; border-radius:9px; border:1px solid var(--p-border); background:var(--p-surface); box-shadow:0 6px 18px -8px rgba(0,0,0,0.4); }
.pv-stbtn { min-width:26px; height:26px; padding:0 7px; border:none; border-radius:6px; background:transparent; color:var(--p-text); font-size:12px; font-weight:600; cursor:pointer; }
.pv-stbtn:hover { background:color-mix(in srgb, var(--p-accent) 14%, transparent); }
.pv-stbtn:disabled { opacity:.3; cursor:default; }
.pv-stbtn-del:hover { background:#d33; color:#fff; }
.pv-secoff { opacity:.4; }
/* selection: click a section to reveal its controls */
.pv-editsec { cursor:default; transition:box-shadow .12s; }
.pv-editsec:not(.pv-selected):hover { box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--p-accent) 24%, transparent); }
.pv-editsec.pv-selected { box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--p-accent) 48%, transparent); }
/* controls live in the DOM always (stable structure → no remount/lag); shown only for the selected section */
.pv-editsec:not(.pv-selected) .pv-sectools,
.pv-editsec:not(.pv-selected) .pv-dispswitch,
.pv-editsec:not(.pv-selected) .pv-heroctl,
.pv-editsec:not(.pv-selected) .pv-addtile,
.pv-editsec:not(.pv-selected) .pv-imgmenu,
.pv-editsec:not(.pv-selected) .pv-rmbtn,
.pv-editsec:not(.pv-selected) .pv-addbtn { display:none !important; }
.pv-addsec { display:flex; flex-direction:column; align-items:center; gap:8px; padding:22px var(--pv-pad); }
.pv-addsec-btn { padding:10px 18px; border:1.5px dashed var(--p-border); border-radius:10px; background:transparent; color:var(--p-muted); font-size:13px; font-weight:600; cursor:pointer; }
.pv-addsec-btn:hover { border-color:var(--p-accent); color:var(--p-accent); }
.pv-addsec-menu { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; max-width:420px; }
.pv-addsec-menu button { padding:7px 13px; border:1px solid var(--p-border); border-radius:8px; background:var(--p-surface); color:var(--p-text); font-size:12px; font-weight:500; cursor:pointer; }
.pv-addsec-menu button:hover { border-color:var(--p-accent); color:var(--p-accent); }

/* ════════ display modes: carousel + marquee (band) ════════ */
.pv-carousel { display:flex; gap:14px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:10px; -webkit-overflow-scrolling:touch; }
.pv-carousel::-webkit-scrollbar { height:6px; }
.pv-carousel::-webkit-scrollbar-thumb { background:var(--p-border); border-radius:3px; }
.pv-carousel > * { flex:0 0 auto; width:clamp(190px,44%,280px); scroll-snap-align:start; }
.pv-marquee { overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); }
.pv-marquee-track { display:flex; gap:14px; width:max-content; animation:pvMarquee 32s linear infinite; }
.pv-marquee:hover .pv-marquee-track { animation-play-state:paused; }
.pv-marquee-track > *, .pv-marquee-track .pv-mq-dup { flex:0 0 auto; width:clamp(170px,26vw,230px); }
.pv-mq-dup { display:block; }
@keyframes pvMarquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@media (prefers-reduced-motion: reduce){ .pv-marquee-track { animation:none; } .pv-marquee { overflow-x:auto; } }

/* add / remove / display controls */
.pv-rmbtn { position:absolute; top:8px; left:8px; z-index:6; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border:none; border-radius:50%; background:rgba(15,17,23,0.82); color:#fff; font-size:16px; line-height:1; cursor:pointer; }
.pv-rmbtn:hover { background:#d33; }
.pv-rmbtn-inline { position:static; width:20px; height:20px; margin-left:6px; font-size:14px; vertical-align:middle; }
.pv-addtile { flex:0 0 auto; min-width:96px; align-self:stretch; min-height:96px; display:inline-flex; align-items:center; justify-content:center; border:2px dashed var(--p-border); border-radius:var(--pv-r); background:transparent; color:var(--p-muted); font-size:26px; cursor:pointer; transition:border-color .12s,color .12s; }
.pv-addtile:hover { border-color:var(--p-accent); color:var(--p-accent); }
.pv-btnrow { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
.pv-btnwrap { display:inline-flex; align-items:center; }
.pv-addbtn { padding:9px 16px; border:1.5px dashed var(--p-border); border-radius:var(--pv-rbtn); background:transparent; color:var(--p-muted); font-size:13px; font-weight:600; cursor:pointer; margin-top:26px; }
.pv-addbtn:hover { border-color:var(--p-accent); color:var(--p-accent); }
.pv-dispswitch { display:inline-flex; gap:2px; margin:0 0 16px; padding:3px; border:1px solid var(--p-border); border-radius:10px; background:var(--p-surface); }
.pv-dispbtn { padding:5px 12px; border:none; border-radius:7px; background:transparent; color:var(--p-muted); font-size:12px; font-weight:600; cursor:pointer; }
.pv-dispbtn.on { background:var(--p-accent); color:var(--p-accent-text); }
.pv-heroswitch { position:absolute; top:10px; left:10px; z-index:6; margin:0; box-shadow:0 6px 18px -8px rgba(0,0,0,0.4); }
.pv-hero-imgleft .pv-hero-media { order:-1; }
@media (min-width:760px){ .pv-hero-imgleft { grid-template-columns:0.95fr 1.05fr; } }
`;
