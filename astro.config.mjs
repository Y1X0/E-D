// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

// The production origin, used for canonical URLs, Open Graph and the sitemap.
// SITE_URL wins; on Render the service URL is picked up automatically; the
// placeholder is only ever used for local builds.
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? '';
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'production';

const SITE =
  process.env.SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  'https://eliteeveningdesign.com';

// Surfaced in the build log so the deployed origin is always verifiable.
console.log(`[site] canonical origin: ${SITE}`);
console.log(`[site] content: ${SANITY_PROJECT_ID ? `Sanity (${SANITY_PROJECT_ID}/${SANITY_DATASET}), studio at /admin` : 'repository — set SANITY_PROJECT_ID to switch'}`);

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [
    sitemap(),
    // The studio only exists once the atelier has a Sanity project. Until then
    // the site builds from the content in this repository and /admin is absent.
    ...(SANITY_PROJECT_ID
      ? [
          react(),
          sanity({
            projectId: SANITY_PROJECT_ID,
            dataset: SANITY_DATASET,
            useCdn: false,
            studioBasePath: '/admin',
          }),
        ]
      : []),
  ],
  build: { inlineStylesheets: 'auto', format: 'directory' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: { build: { cssMinify: 'lightningcss' } },
});
