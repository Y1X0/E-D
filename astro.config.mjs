// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The production origin, used for canonical URLs, Open Graph and the sitemap.
// SITE_URL wins; on Render the service URL is picked up automatically; the
// placeholder is only ever used for local builds.
const SITE =
  process.env.SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  'https://eliteeveningdesign.com';

// Surfaced in the build log so the deployed origin is always verifiable.
console.log(`[site] canonical origin: ${SITE}`);

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto', format: 'directory' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: { build: { cssMinify: 'lightningcss' } },
});
