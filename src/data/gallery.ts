import type { Plate } from './types';
import { collections, type CollectionSlug } from './collections';
import { looks } from './looks';

export interface GalleryItem {
  plate: Plate;
  /** Collection slug — the run is filtered by line, and named per language. */
  line: CollectionSlug;
  /** Site-absolute path, before the locale prefix is applied. */
  href: string;
}

/**
 * Assembled from the collection and look plates rather than duplicating paths,
 * so a photograph added anywhere appears here too.
 */
export const galleryItems: GalleryItem[] = [
  ...collections.map((c) => ({ plate: c.cover, line: c.slug, href: `/collections/${c.slug}` })),
  ...looks.flatMap((l) => l.plates.slice(0, 2).map((plate) => ({ plate, line: l.collection, href: `/looks/${l.slug}` }))),
  ...collections.flatMap((c) => c.plates.map((plate) => ({ plate, line: c.slug, href: `/collections/${c.slug}` }))),
];
