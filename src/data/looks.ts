import type { Plate } from './types';
import { collections, type CollectionSlug } from './collections';

/**
 * Look structure — numbering and imagery only. The one-line note for each look
 * is translated in `src/i18n/<locale>.ts` under `lookNotes`, keyed by line and
 * index, so nothing has to be repeated per language.
 */
export interface LookShape {
  slug: string;
  index: number;
  collection: CollectionSlug;
  plates: Plate[];
}

const PER_LINE = 4;

const platesFor = (line: string, i: number): Plate[] => {
  const tones = ['linen', 'shadow', 'paper', 'ink'] as const;
  const n = String(i).padStart(2, '0');
  return [
    { alt: `Look ${n} from the ${line} line, full length`, ratio: '2/3', tone: tones[i % 4] },
    { alt: `Look ${n}, detail`, ratio: '4/5', tone: tones[(i + 1) % 4] },
    { alt: `Look ${n}, reverse`, ratio: '3/4', tone: tones[(i + 2) % 4] },
  ];
};

export const looks: LookShape[] = collections.flatMap((c) =>
  Array.from({ length: PER_LINE }, (_, n) => {
    const index = n + 1;
    return {
      slug: `${c.slug}-${String(index).padStart(2, '0')}`,
      index,
      collection: c.slug,
      plates: platesFor(c.slug, index),
    } satisfies LookShape;
  }),
);

export const looksIn = (collection: string) => looks.filter((l) => l.collection === collection);
export const lookBySlug = (slug: string) => looks.find((l) => l.slug === slug);

/** Other looks from the same line first, for the foot of a design page. */
export function relatedLooks(l: LookShape, count = 3): LookShape[] {
  const siblings = looksIn(l.collection).filter((x) => x.slug !== l.slug);
  const others = looks.filter((x) => x.collection !== l.collection);
  return [...siblings, ...others].slice(0, count);
}
