import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

/**
 * Sanity is optional. Until a project id is configured the site builds from the
 * content committed in `src/content/local.ts`, exactly as it does today; the
 * moment SANITY_PROJECT_ID is set, the atelier's own content takes over.
 */
export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? import.meta.env?.SANITY_PROJECT_ID ?? '';
export const SANITY_DATASET = process.env.SANITY_DATASET ?? import.meta.env?.SANITY_DATASET ?? 'production';
export const SANITY_API_VERSION = '2024-10-01';
export const sanityEnabled = Boolean(SANITY_PROJECT_ID);

export const sanityClient: SanityClient | null = sanityEnabled
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      // A static build should read the freshest content, not the edge cache.
      useCdn: false,
      perspective: 'published',
    })
  : null;

const builder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

export interface SanityImageRef { _type: 'image'; asset: { _ref: string } }

/**
 * A CDN url for one rendered size. Sanity applies the hotspot chosen in the
 * studio, so the subject stays in frame at every crop, and serves WebP to
 * browsers that take it.
 */
export function imageUrl(source: SanityImageRef, width: number, ratio: number): string | null {
  if (!builder) return null;
  return builder
    .image(source)
    .width(width)
    .height(Math.round(width / ratio))
    .fit('crop')
    .auto('format')
    .quality(82)
    .url();
}

/** Low-quality placeholder and dimensions, fetched with the document. */
export const IMAGE_PROJECTION = `{
  ...,
  "dimensions": asset->metadata.dimensions,
  "lqip": asset->metadata.lqip
}`;
