/**
 * Interaction layer. Deliberately small: one observer for scroll reveals,
 * one for the header state, and the overlay menu. Everything degrades to a
 * fully usable static page if it never runs.
 */
import { onReady } from './ready';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('.reveal, .draw, .wipe');
  if (!els.length) return;

  if (reduced() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
  );
  els.forEach((el) => io.observe(el));
}

function initHeader(): void {
  const hdr = document.querySelector<HTMLElement>('.hdr');
  if (!hdr || hdr.dataset.variant !== 'over') return;

  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) { hdr.dataset.solid = 'true'; return; }

  // The bar is transparent while any part of the hero is still below it.
  // Watching the hero costs nothing per frame — no scroll listener at all.
  let io: IntersectionObserver | null = null;
  const watch = () => {
    io?.disconnect();
    io = new IntersectionObserver(
      ([entry]) => { hdr.dataset.solid = String(!entry.isIntersecting); },
      { rootMargin: `-${Math.round(hdr.offsetHeight)}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(hero);
  };
  watch();

  // The header height is viewport-relative, so re-arm on resize — but only
  // once the user has stopped, never mid-gesture.
  let t: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(t);
    t = window.setTimeout(watch, 150);
  }, { passive: true });
}

function initMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.hdr__toggle');
  const menu = document.querySelector<HTMLElement>('.menu');
  if (!toggle || !menu) return;

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      menu.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      const done = () => { menu.hidden = true; };
      reduced() ? done() : window.setTimeout(done, 380);
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}

function boot(): void {
  initReveal();
  initHeader();
  initMenu();
}

onReady(boot);
