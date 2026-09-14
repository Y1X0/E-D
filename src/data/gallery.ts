import type { Plate } from './types';
import { collections } from './collections';
import { looks } from './looks';

export interface GalleryItem {
  plate: Plate;
  /** Collection slug, so the run can be filtered by line. */
  line: string;
  lineName: string;
  href?: string;
}

/**
 * The gallery is assembled from the collection and look plates rather than
 * duplicating paths, so a photograph added anywhere appears here too.
 */
const byLine = new Map(collections.map((c) => [c.slug, c.name]));

export const galleryItems: GalleryItem[] = [
  ...collections.map((c) => ({
    plate: c.cover,
    line: c.slug,
    lineName: c.name,
    href: `/collections/${c.slug}`,
  })),
  ...looks.flatMap((l) =>
    l.plates.slice(0, 2).map((plate) => ({
      plate,
      line: l.collection,
      lineName: byLine.get(l.collection)!,
      href: `/looks/${l.slug}`,
    })),
  ),
  ...collections.flatMap((c) =>
    c.plates.map((plate) => ({
      plate,
      line: c.slug,
      lineName: c.name,
      href: `/collections/${c.slug}`,
    })),
  ),
];
