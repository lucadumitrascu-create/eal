'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  images: string[];
  urls?: string[];
  titles?: string[];
};

const TILT = 70; // degrees the cards lean at rest
const OVERLAP = -235; // px (negative = overlap) at rest — scaled with the card size
const SPREAD = 141; // px neighbours slide aside when a card pops (must clear the rest overlap)
const POP_Z = 96; // px the active card comes forward (kept modest so it doesn't grow over a neighbour)
const POP_Y = -46; // px the active card lifts

/**
 * Leaning-cards showcase: four project screenshots lean against each other like
 * cards on a shelf. The card under the cursor pops upright + forward; its
 * neighbours slide aside so it has clean room; clicking opens the live URL.
 *
 * Hover is detected by POSITION in JS (NOT CSS :hover — the card moves out from
 * under the cursor on activation, which would make :hover flicker). To avoid the
 * jitter of hit-testing heavily-overlapping leaning slivers, the desktop pick
 * uses STABLE nearest-centre zones (transform-agnostic layout centres), so
 * `active` only changes when the cursor crosses a midpoint between two cards.
 * On no-hover devices the cards render flat (CSS) and a tap hit-tests the real,
 * non-overlapping rects.
 */
export default function LeaningCardsShowcase({ images, urls = [], titles = [] }: Props) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const [active, setActive] = useState<number>(-1);

  useEffect(() => {
    const cards = cardRefs.current; // dense [0..3]; index == card == active == urls index
    const shelf = shelfRef.current!;

    let touch = false;
    let shelfRect: DOMRect | null = null;
    let centers: (number | null)[] = []; // desktop: viewport-x of each card's layout centre
    let rects: (DOMRect | null)[] = []; // touch: real (flat) card rects
    let current = -1;

    const measure = () => {
      touch = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
      if (touch) {
        rects = cards.map((c) => (c ? c.getBoundingClientRect() : null));
        return;
      }
      const sr = shelf.getBoundingClientRect();
      shelfRect = sr;
      const lw = shelf.offsetWidth || sr.width; // layout width (pre-transform)
      const sx = lw ? sr.width / lw : 1; // map layout-x -> rendered-x
      // rotateY pivots around each card's centre, so the layout centre x is stable
      centers = cards.map((c) => (c ? sr.left + (c.offsetLeft + c.offsetWidth / 2) * sx : null));
    };

    const pick = (x: number, y: number) => {
      if (touch) {
        for (let i = cards.length - 1; i >= 0; i--) {
          const r = rects[i];
          if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
        }
        return -1;
      }
      if (!shelfRect) return -1;
      // bounds: the shelf box, with headroom above for the popped card
      if (y < shelfRect.top - 80 || y > shelfRect.bottom + 16) return -1;
      if (x < shelfRect.left - 20 || x > shelfRect.right + 20) return -1;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const c = centers[i];
        if (c == null) continue;
        const d = Math.abs(x - c);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const setIdx = (idx: number) => {
      if (idx === current) return;
      current = idx;
      setActive(idx);
    };
    const onMove = (e: MouseEvent) => {
      const idx = pick(e.clientX, e.clientY);
      shelf.style.cursor = idx >= 0 ? 'pointer' : '';
      setIdx(idx);
    };
    const onLeave = () => {
      shelf.style.cursor = '';
      setIdx(-1);
    };
    const onClick = (e: MouseEvent) => {
      const idx = current >= 0 ? current : pick(e.clientX, e.clientY);
      const url = urlsRef.current[idx];
      if (idx >= 0 && url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    // rAF-throttle the scroll re-measure so it can't thrash mid-interaction
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        measure();
      });
    };

    shelf.addEventListener('mousemove', onMove);
    shelf.addEventListener('mouseleave', onLeave);
    shelf.addEventListener('click', onClick);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', onLeave); // don't leave a card stuck on alt-tab

    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(measure);
    });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(shelf);
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(measure).catch(() => {});
    window.addEventListener('load', measure);

    return () => {
      shelf.removeEventListener('mousemove', onMove);
      shelf.removeEventListener('mouseleave', onLeave);
      shelf.removeEventListener('click', onClick);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('load', measure);
      cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      ro?.disconnect();
    };
  }, []);

  // Per-card transform: rest leaning, popped (active), or slid aside (neighbour).
  // Driven by React state so it composes cleanly; CSS only owns the transition.
  // Undefined => fall back to the CSS rest transform (and the touch override).
  const transformFor = (i: number): string | undefined => {
    if (active < 0) return undefined;
    if (i === active) return `rotateY(0deg) translateY(${POP_Y}px) translateZ(${POP_Z}px)`;
    return `translateX(${i < active ? -SPREAD : SPREAD}px) rotateY(${TILT}deg)`;
  };

  return (
    <div className="lc-root w-full flex flex-col items-center overflow-x-hidden">
      <style>{`
        .lc-stage { display:flex; justify-content:center; align-items:center; width:100%;
          perspective:2000px; padding:92px 40px 44px; min-height:510px; }
        .lc-shelf { position:relative; display:flex; align-items:center; transform-style:preserve-3d; transform:rotateX(8deg); }
        .lc-card {
          position:relative; flex:none; width:396px; aspect-ratio:16/10;
          border-radius:14px; overflow:hidden; background:#0d1422;
          transform-origin:center bottom; transform:rotateY(${TILT}deg);
          backface-visibility:hidden;
          transition:transform .5s cubic-bezier(.22,.7,.3,1), box-shadow .5s cubic-bezier(.22,.7,.3,1);
          box-shadow:0 2px 6px rgba(15,23,42,.22), 26px 28px 50px -18px rgba(15,23,42,.50);
        }
        .lc-card:not(:last-child){ margin-right:${OVERLAP}px; }
        .lc-card.is-active{
          box-shadow:0 12px 24px rgba(15,23,42,.28), 0 60px 110px -28px rgba(15,23,42,.55);
          z-index:50;
        }
        .lc-card img{ display:block; width:100%; height:100%; object-fit:cover; object-position:top; pointer-events:none; }
        .lc-card::after{ content:""; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(115deg, rgba(255,255,255,.10) 0%, transparent 38%); }
        .lc-card::before{ content:""; position:absolute; inset:0; z-index:1; pointer-events:none;
          background:rgba(4,9,18,.34); transition:opacity .5s; }
        .lc-card.is-active::before{ opacity:0; }
        .lc-floor{ margin:-18px auto 0; width:min(720px,82%); height:50px;
          background:radial-gradient(ellipse at center, rgba(15,23,42,.26), transparent 70%); filter:blur(10px); }

        /* No-hover devices: the lean can't be activated, so show flat, upright,
           non-overlapping, legible, tappable cards. */
        @media (hover: none) {
          .lc-stage{ perspective:none; padding:8px 16px 0; min-height:0; }
          .lc-shelf{ transform:none; flex-wrap:wrap; gap:16px; justify-content:center; max-width:760px; }
          .lc-card{ transform:none !important; margin:0 !important; width:min(86vw,360px);
            border:1px solid #1e2940; box-shadow:0 10px 24px -10px rgba(15,23,42,.45); }
          .lc-card::before{ background:transparent; }
          .lc-floor{ display:none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lc-card, .lc-card::before { transition:none; }
        }
      `}</style>

      <div className="lc-stage">
        <div ref={shelfRef} className="lc-shelf">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`lc-card ${active === i ? 'is-active' : ''}`}
              style={transformFor(i) ? { transform: transformFor(i) } : undefined}
            >
              {images[i] ? (
                <img src={images[i]} alt={titles[i] ?? `Project ${i + 1}`} />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7d8aa3',
                    background: 'repeating-linear-gradient(45deg,#0e1626 0 10px,#0c1320 10px 20px)',
                  }}
                >
                  {`Image ${i + 1}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lc-floor" />
    </div>
  );
}
