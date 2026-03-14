/**
 * Unified scroll animation system
 * Replaces per-section IntersectionObservers with a single centralized system.
 *
 * Usage:
 *   <div data-animate="fade-up">...</div>
 *   <div data-animate="fade-left" data-stagger-delay="2">...</div>
 *
 * Supported animations: fade-up, fade-down, fade-left, fade-right, scale-in, blur-in
 * Stagger: data-stagger-delay="1" through "6" (80ms increments)
 */

function initScrollAnimations(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-animate]');
  if (!elements.length) return;

  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/**
 * Animated counter for stats.
 * Usage: <span data-counter="100" data-counter-suffix="%">0</span>
 */
function initCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('[data-counter]');
  if (!counters.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    counters.forEach(el => {
      const target = parseInt(el.dataset.counter || '0', 10);
      const suffix = el.dataset.counterSuffix || '';
      el.textContent = target + suffix;
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const target = parseInt(el.dataset.counter || '0', 10);
        const suffix = el.dataset.counterSuffix || '';
        const duration = 1800;
        const start = performance.now();

        function easeOutExpo(t: number): number {
          return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function update(now: number): void {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const value = Math.round(easeOutExpo(progress) * target);
          el.textContent = value + (progress === 1 ? suffix : '');
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach((el) => observer.observe(el));
}

/**
 * Magnetic button effect (desktop only).
 * Usage: <button class="magnetic-btn">...</button>
 */
function initMagneticButtons(): void {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const buttons = document.querySelectorAll<HTMLElement>('.magnetic-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/**
 * Subtle parallax on glow orbs.
 */
function initParallax(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      document.documentElement.style.setProperty(
        '--scroll-parallax',
        `${scrollY * 0.08}px`
      );
      ticking = false;
    });
  }, { passive: true });
}

// Initialize all systems on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCounters();
  initMagneticButtons();

  initParallax();
});
