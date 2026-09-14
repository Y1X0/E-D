import type { APIRoute } from 'astro';
import { site } from '~/config/site';

/**
 * The panel is not part of the public site: it is kept out of the sitemap and
 * asked not to be crawled. It is unlisted rather than secret — Sanity's own
 * sign-in is what actually guards it.
 */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      '',
      `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
