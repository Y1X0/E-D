/**
 * Resolves a plate's `src` to a real, build-optimised image.
 *
 * Photographs live in `src/assets/images/…` so Astro can generate responsive
 * srcsets and modern formats at build time. A `src` that has no matching file
 * resolves to null, and the plate renders its designed stand-in panel instead
 * of a broken image. See CONTENT.md.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/images/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const byKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  // keys arrive prefixed by the glob's own form — take what follows the folder
  byKey.set(path.split('/assets/images/').pop()!, mod.default);
}

export function findImage(src?: string): ImageMetadata | null {
  if (!src) return null;
  const key = src.replace(/^\/+/, '').replace(/^images\//, '');
  return byKey.get(key) ?? null;
}

export const imageCount = byKey.size;
