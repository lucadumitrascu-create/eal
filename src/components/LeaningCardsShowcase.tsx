'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  images: string[];
  urls?: string[];
  titles?: string[];
};

/**
 * Leaning-cards showcase: four project screenshots lean against each other like
 * cards on a shelf. Hovering one pops it upright + forward to reveal the site;
 * clicking opens the live URL.
 *
 * Hover is detected by POSITION in JS (cursor vs the fixed REST rects), NOT CSS
 * :hover — the card moves out from under the cursor on activation, so :hover
 * would flicker (out -> re-enter -> loop). measure()/pick() is the core of it.
 *
 * On no-hover devices (phones/tablets) the lean can't be activated, so a
 * `@media (hover: none)` layout renders the cards flat, upright, non-overlapping
 * and legible — and since the rest rects then match the cards, a tap hit-tests
 * correctly and opens the right project.
 */
export default function LeaningCardsShowcase({ images, urls = [], titles = [] }: Props) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const [active, setActive] = useState<number>(-1);

  // how hard the cards lean / how much they overlap at rest (desktop)
  const TILT = 70; // degrees
  const OVERLAP = -214; // px (negative = overlap)

  useEffect(() => {
    const cards = cardRefs.current; // dense [0..3]; index == card == active == urls index
    let rects: (DOMRect | null)[] = [];
    let current = -1;

    // measure the REST positions (with the active card NOT lifted out)
    const measure = () => {
      const wasActive = cards.find((c) => c?.classList.contains('is-active')) ?? null;
      wasActive?.classList.remove('is-active');
      rects = cards.map((c) => (c ? c.getBoundingClientRect() : null));
      wasActive?.classList.add('is-active');
    };

    // which card is under the point, from the FIXED rest rects (right -> left)
    const pick = (x: number, y: number) => {
      for (let i = cards.length - 1; i >= 0; i--) {
        const r = rects[i];
        if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
      }
      return -1;
    };

    const shelf = shelfRef.current!;
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
      // desktop: the hovered card; touch (no prior mousemove): pick by tap point
      const idx = current >= 0 ? current : pick(e.clientX, e.clientY);
      const url = urlsRef.current[idx];
      if (idx >= 0 && url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    shelf.addEventListener('mousemove', onMove);
    shelf.addEventListener('mouseleave', onLeave);
    shelf.addEventListener('click', onClick);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('blur', onLeave); // a popped card can't get stuck on alt-tab

    // Robust measurement: after first paint (rAF), on font swap, on any layout
    // shift of the shelf (ResizeObserver), and on full load — no magic timeout.
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
      window.removeEventListener('scroll', measure);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('load', measure);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <div className="lc-root w-full flex flex-col items-center overflow-x-hidden">
      <style>{`
        .lc-stage { display:flex; justify-content:center; align-items:center; width:100%;
          perspective:2000px; padding:88px 40px 40px; min-height:460px; }
        .lc-shelf { display:flex; align-items:center; transform-style:preserve-3d; transform:rotateX(8deg); }
        .lc-card {
          position:relative; flex:none; width:360px; aspect-ratio:16/10;
          border-radius:14px; overflow:hidden; border:1px solid #1e2940; background:#0d1422;
          transform-origin:center bottom; transform:rotateY(${TILT}deg) translateZ(0);
          backface-visibility:hidden; will-change:transform;
          transition:transform .55s cubic-bezier(.25,.8,.35,1), box-shadow .55s;
          box-shadow:0 2px 6px rgba(15,23,42,.22), 26px 28px 50px -18px rgba(15,23,42,.50);
        }
        .lc-card:not(:last-child){ margin-right:${OVERLAP}px; }
        .lc-card.is-active{
          transform:rotateY(0deg) translateY(-38px) translateZ(150px);
          box-shadow:0 12px 24px rgba(15,23,42,.28), 0 60px 110px -28px rgba(15,23,42,.55);
          z-index:50;
        }
        .lc-card img{ display:block; width:100%; height:100%; object-fit:cover; object-position:top; pointer-events:none; }
        .lc-card::after{ content:""; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(115deg, rgba(255,255,255,.10) 0%, transparent 38%); }
        .lc-card::before{ content:""; position:absolute; inset:0; z-index:1; pointer-events:none;
          background:rgba(4,9,18,.34); transition:opacity .55s; }
        .lc-card.is-active::before{ opacity:0; }
        .lc-floor{ margin:-18px auto 0; width:min(720px,82%); height:50px;
          background:radial-gradient(ellipse at center, rgba(15,23,42,.26), transparent 70%); filter:blur(10px); }

        /* No-hover devices: the lean can't be activated, so show flat, upright,
           non-overlapping, legible, tappable cards. */
        @media (hover: none) {
          .lc-stage{ perspective:none; padding:8px 16px 0; min-height:0; }
          .lc-shelf{ transform:none; flex-wrap:wrap; gap:16px; justify-content:center; max-width:760px; }
          .lc-card{ transform:none !important; margin:0 !important; width:min(86vw,340px);
            box-shadow:0 10px 24px -10px rgba(15,23,42,.45); }
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
