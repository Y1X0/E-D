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
  /** Whole shekels. Only the boutique line is sold at a fixed price. */
  price?: number;
}

/**
 * Boutique pieces are sold as they are, so they carry a price; everything else
 * is made to measure and priced at consultation. A line missing from here shows
 * no price at all rather than a guess.
 */
const prices: Record<string, number> = {
  'boutique-01': 2500,
  'boutique-02': 2500,
  'boutique-03': 2500,
  'boutique-04': 2500,
};

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

/**
 * Looks photographed already. Everything else keeps the designed panels until
 * its photography exists — nothing here is ever a stand-in for another dress.
 */
const photographed: Record<string, Plate[]> = {
  'evening-01': [
    {
      src: 'evening/gold-beaded-gown.jpg',
      alt: 'Champagne evening gown with a hand-beaded corset bodice, off-shoulder satin sleeves and a sheer beaded train',
      ratio: '2/3', tone: 'ink', focus: '50% 35%',
    },
    {
      src: 'evening/gown-bodice.jpg',
      alt: 'Hand-beaded corset bodice with boned seams and an off-shoulder satin sleeve',
      ratio: '1/1', tone: 'linen',
    },
    {
      src: 'evening/gown-train.jpg',
      alt: 'The sheer beaded train of a champagne evening gown, spread on the floor',
      ratio: '3/2', tone: 'shadow',
    },
  ],
};

export const looks: LookShape[] = collections.flatMap((c) =>
  Array.from({ length: PER_LINE }, (_, n) => {
    const index = n + 1;
    return {
      slug: `${c.slug}-${String(index).padStart(2, '0')}`,
      index,
      collection: c.slug,
      plates: photographed[`${c.slug}-${String(index).padStart(2, '0')}`] ?? platesFor(c.slug, index),
      ...(prices[`${c.slug}-${String(index).padStart(2, '0')}`]
        ? { price: prices[`${c.slug}-${String(index).padStart(2, '0')}`] }
        : {}),
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
