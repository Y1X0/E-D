/**
 * Interaction layer. Deliberately small: one observer for scroll reveals,
 * one for the header state, and the overlay menu. Everything degrades to a
 * fully usable static page if it never runs.
 */
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
  let ticking = false;
  const apply = () => {
    const h = hdr.offsetHeight;
    const limit = hero ? Math.max(hero.offsetHeight - h, 40) : 40;
    hdr.dataset.solid = String(window.scrollY > limit);
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  apply();
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

document.addEventListener('astro:page-load', boot);
// Release the scroll lock before a client-side navigation swaps the document.
document.addEventListener('astro:before-swap', () => { document.documentElement.style.overflow = ''; });
