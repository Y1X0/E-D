import type { APIRoute } from 'astro';
import { site } from '~/config/site';

/**
 * The panel, the ledger and anything to do with one person's order are not
 * part of the public site: they are kept out of the sitemap and asked not to be
 * crawled. Unlisted is not the same as guarded — Sanity's sign-in guards the
 * panel, the admin token guards the ledger, and an order can only be read with
 * the token issued to the buyer who placed it.
 */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /payments',
      'Disallow: /checkout',
      'Disallow: /payment/',
      '',
      `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
