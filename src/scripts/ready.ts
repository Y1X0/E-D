/**
 * Runs a setup function once the document is parsed.
 *
 * The site uses the browser's own cross-document view transitions rather than a
 * client-side router, so there is no framework lifecycle to hook — this is the
 * whole of it.
 */
export function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}
