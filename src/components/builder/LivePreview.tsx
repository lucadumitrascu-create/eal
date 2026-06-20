import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { DesignSpec, ImageRef } from '../../data/templates';
import { themes, fonts, templateById } from '../../data/templates';
import { presetById } from '../../data/imageLibrary';

const ASPECT: Record<string, string> = { '16:9': '16 / 9', '4:3': '4 / 3', '1:1': '1 / 1', '3:4': '3 / 4' };

/** Ensure a font stylesheet is in <head> exactly once. */
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

function Tile({ img, aspect, radius = 14 }: { img: ImageRef; aspect: string; radius?: number }) {
  const p = presetById(img.presetId);
  const dark = p?.dark ?? false;
  return (
    <div className="pv-tile" style={{ aspectRatio: ASPECT[aspect] ?? '16 / 9', background: p?.css ?? '#e8e8ea', borderRadius: radius }}>
      <span className="pv-tile-label" style={{ color: dark ? 'rgba(255,255,255,0.92)' : 'rgba(20,20,25,0.6)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        {img.label || 'Image'}
      </span>
    </div>
  );
}

const T = (sec: { text: Record<string, string> }, id: string) => sec.text[id] ?? '';

export default function LivePreview({ spec }: { spec: DesignSpec }) {
  const tpl = templateById(spec.templateId);
  const theme = themes[spec.theme].vars;
  const font = fonts[spec.font];
  useFont(font.href);
  if (!tpl) return null;

  const byId = (id: string) => spec.sections.find((s) => s.id === id);

  const rootStyle = {
    '--p-bg': theme.bg, '--p-surface': theme.surface, '--p-text': theme.text, '--p-muted': theme.muted,
    '--p-accent': theme.accent, '--p-accent-text': theme.accentText, '--p-border': theme.border,
    '--p-head': `${font.heading}, system-ui, sans-serif`, '--p-body': `${font.body}, system-ui, sans-serif`,
    background: theme.bg, color: theme.text, fontFamily: 'var(--p-body)',
  } as CSSProperties;

  const animClass = spec.animation === 'none' ? 'pv-anim-none' : `pv-anim-${spec.animation}`;
  let order = 0;
  const Sec = ({ children }: { children: React.ReactNode }) => (
    <section className="pv-sec" style={{ ['--i' as string]: order++ }}>{children}</section>
  );

  const heroSec = byId('hero');
  const feat = byId('features');
  const gal = byId('gallery');
  const ab = byId('about');
  const con = byId('contact');
  const ct = byId('cta');

  return (
    <div className={`pv-root ${animClass}`} style={rootStyle}>
      <style>{PV_CSS}</style>

      {/* faux site nav */}
      <header className="pv-nav">
        <span className="pv-brand">{spec.meta.siteName || 'Your Brand'}</span>
        <span className="pv-tagline">{spec.meta.tagline}</span>
      </header>

      {heroSec?.enabled && (
        <Sec>
          <div className="pv-hero">
            <div className="pv-hero-copy">
              {T(heroSec, 'eyebrow') && <p className="pv-eyebrow">{T(heroSec, 'eyebrow')}</p>}
              <h2 className="pv-h1">{T(heroSec, 'headline')}</h2>
              <p className="pv-lead">{T(heroSec, 'subhead')}</p>
              {T(heroSec, 'cta') && <span className="pv-btn">{T(heroSec, 'cta')}</span>}
            </div>
            {heroSec.images.media && <div className="pv-hero-media"><Tile img={heroSec.images.media} aspect="16:9" radius={18} /></div>}
          </div>
        </Sec>
      )}

      {feat?.enabled && (
        <Sec>
          <h3 className="pv-h2">{T(feat, 'title')}</h3>
          <div className="pv-grid3">
            {[1, 2, 3].map((i) => (
              <div className="pv-card" key={i}>
                <span className="pv-dot" />
                <h4 className="pv-h4">{T(feat, `item${i}.title`)}</h4>
                <p className="pv-muted">{T(feat, `item${i}.body`)}</p>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {gal?.enabled && (
        <Sec>
          <h3 className="pv-h2">{T(gal, 'title')}</h3>
          <div className="pv-gallery">
            {Object.keys(gal.images).map((k) => <Tile key={k} img={gal.images[k]} aspect="1:1" />)}
          </div>
        </Sec>
      )}

      {ab?.enabled && (
        <Sec>
          <div className="pv-about">
            {ab.images.media && <div className="pv-about-media"><Tile img={ab.images.media} aspect="4:3" /></div>}
            <div className="pv-about-copy">
              <h3 className="pv-h2">{T(ab, 'title')}</h3>
              <p className="pv-lead">{T(ab, 'body')}</p>
            </div>
          </div>
        </Sec>
      )}

      {ct?.enabled && (
        <Sec>
          <div className="pv-ctaband">
            <h3 className="pv-h2" style={{ color: 'var(--p-accent-text)' }}>{T(ct, 'title')}</h3>
            <p style={{ color: 'var(--p-accent-text)', opacity: 0.9, margin: '6px 0 0' }}>{T(ct, 'sub')}</p>
            {T(ct, 'button') && <span className="pv-btn pv-btn-invert">{T(ct, 'button')}</span>}
          </div>
        </Sec>
      )}

      {con?.enabled && (
        <Sec>
          <div className="pv-contact">
            <h3 className="pv-h2">{T(con, 'title')}</h3>
            <p className="pv-lead">{T(con, 'body')}</p>
            <div className="pv-contact-row">
              {T(con, 'email') && <span className="pv-pill">{T(con, 'email')}</span>}
              {T(con, 'phone') && <span className="pv-pill">{T(con, 'phone')}</span>}
            </div>
          </div>
        </Sec>
      )}

      <footer className="pv-footer">© {spec.meta.siteName || 'Your Brand'}</footer>
    </div>
  );
}

const PV_CSS = `
.pv-root { --pv-pad: clamp(20px, 4vw, 56px); line-height: 1.5; }
.pv-root * { box-sizing: border-box; }
.pv-nav { display:flex; align-items:baseline; justify-content:space-between; gap:12px;
  padding: 16px var(--pv-pad); border-bottom:1px solid var(--p-border); background: var(--p-surface); }
.pv-brand { font-family: var(--p-head); font-weight:700; font-size:18px; }
.pv-tagline { color: var(--p-muted); font-size:13px; }
.pv-sec { padding: clamp(36px,6vw,76px) var(--pv-pad); }
.pv-eyebrow { text-transform:uppercase; letter-spacing:.14em; font-size:12px; font-weight:600; color: var(--p-accent); margin:0 0 14px; }
.pv-h1 { font-family: var(--p-head); font-weight:700; font-size: clamp(30px,5vw,52px); line-height:1.08; margin:0; letter-spacing:-0.01em; text-wrap:balance; }
.pv-h2 { font-family: var(--p-head); font-weight:700; font-size: clamp(22px,3.2vw,34px); margin:0 0 26px; letter-spacing:-0.01em; text-wrap:balance; }
.pv-h4 { font-family: var(--p-head); font-weight:600; font-size:18px; margin:14px 0 6px; }
.pv-lead { color: var(--p-muted); font-size: clamp(15px,1.4vw,18px); margin:18px 0 0; max-width:62ch; line-height:1.6; }
.pv-muted { color: var(--p-muted); font-size:15px; margin:0; line-height:1.55; }
.pv-btn { display:inline-flex; align-items:center; margin-top:26px; padding:12px 22px; border-radius:12px;
  background: var(--p-accent); color: var(--p-accent-text); font-weight:600; font-size:15px; }
.pv-btn-invert { background: var(--p-surface); color: var(--p-text); }
.pv-hero { display:grid; gap: clamp(24px,4vw,48px); align-items:center; }
@media (min-width:760px){ .pv-hero { grid-template-columns: 1.05fr 0.95fr; } }
.pv-hero-media :where(.pv-tile){ width:100%; }
.pv-grid3 { display:grid; gap:18px; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); }
.pv-card { background: var(--p-surface); border:1px solid var(--p-border); border-radius:16px; padding:24px; }
.pv-dot { display:block; width:10px; height:10px; border-radius:50%; background: var(--p-accent); }
.pv-gallery { display:grid; gap:14px; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); }
.pv-about { display:grid; gap: clamp(24px,4vw,48px); align-items:center; }
@media (min-width:760px){ .pv-about { grid-template-columns: 0.9fr 1.1fr; } }
.pv-ctaband { background: var(--p-accent); border-radius:22px; padding: clamp(28px,4vw,48px); text-align:center; }
.pv-contact { text-align:center; }
.pv-contact .pv-lead { margin-left:auto; margin-right:auto; }
.pv-contact-row { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-top:24px; }
.pv-pill { padding:10px 18px; border:1px solid var(--p-border); border-radius:999px; background: var(--p-surface); font-size:14px; }
.pv-footer { padding: 26px var(--pv-pad); border-top:1px solid var(--p-border); color: var(--p-muted); font-size:13px; background: var(--p-surface); }
.pv-tile { position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden;
  border:1px solid rgba(0,0,0,0.05); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
.pv-tile-label { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:500; padding:0 12px; text-align:center; }
.pv-anim-subtle .pv-sec, .pv-anim-lively .pv-sec { opacity:0; animation: pvUp .7s cubic-bezier(.16,1,.3,1) forwards; animation-delay: calc(var(--i) * .08s); }
.pv-anim-lively .pv-sec { animation-name: pvUpScale; }
@keyframes pvUp { from{opacity:0; transform:translateY(22px);} to{opacity:1; transform:none;} }
@keyframes pvUpScale { from{opacity:0; transform:translateY(26px) scale(.985);} to{opacity:1; transform:none;} }
@media (prefers-reduced-motion: reduce){ .pv-anim-subtle .pv-sec, .pv-anim-lively .pv-sec { opacity:1; animation:none; } }
`;
