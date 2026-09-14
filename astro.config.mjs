// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The production origin. Set SITE_URL at build time for the real domain.
const SITE = process.env.SITE_URL ?? 'https://eliteeveningdesign.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto', format: 'directory' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: { build: { cssMinify: 'lightningcss' } },
});
