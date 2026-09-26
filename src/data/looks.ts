import type { Plate } from './types';
import { collections, type CollectionSlug } from './collections';
export { MAX_PER_PIECE } from './basket';

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
  /** Whole shekels, for a piece the atelier also hires out. */
  hire?: number;
}

/**
 * Boutique pieces are sold as they are, so they carry a price; everything else
 * is made to measure and priced at consultation. A line missing from here shows
 * no price at all rather than a guess.
 */
/**
 * Pieces the atelier hires out, and what a hire costs.
 *
 * A dress can be both sold and hired, so this sits beside the price rather than
 * replacing it. Empty until the atelier sets the figures — nothing is guessed.
 */
const hire: Record<string, number> = {};

const prices: Record<string, number> = {
  'boutique-01': 2500,
  'boutique-02': 2500,
  'boutique-03': 2500,
  'boutique-04': 2500,
  'boutique-05': 2500,
};

/**
 * How many places each line shows. The made-to-measure lines keep four drawn
 * panels; the boutique rail is exactly as long as the pieces hanging on it.
 */
const perLine: Record<CollectionSlug, number> = {
  bridal: 4, evening: 4, couture: 4, boutique: 5,
};

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

  'boutique-01': [
    {
      src: 'boutique/fuchsia-lace-gown.jpg',
      alt: 'Fuchsia corded-lace gown with a high neck, long sleeves ending in a lace flounce, and a lace sash draped at the hip',
      ratio: '3/4', tone: 'ink', focus: '50% 40%',
    },
  ],
  'boutique-02': [
    {
      src: 'boutique/lilac-cape-gown.jpg',
      alt: 'Lilac satin gown with a shoulder cape, crystal trim tracing the collar and the dropped waist',
      ratio: '3/4', tone: 'linen', focus: '50% 40%',
    },
  ],
  'boutique-03': [
    {
      src: 'boutique/aubergine-lace-gown.jpg',
      alt: 'Aubergine lace gown with a high neck, the lace wrapped at the waist and falling to one side',
      ratio: '3/4', tone: 'ink', focus: '50% 40%',
    },
    {
      src: 'boutique/aubergine-lace-gown-side.jpg',
      alt: 'The same aubergine lace gown from the side, showing the draped sash and the lace cuff',
      ratio: '3/4', tone: 'shadow', focus: '50% 40%',
    },
  ],
  'boutique-04': [
    {
      src: 'boutique/mauve-ruched-dress.jpg',
      alt: 'Mauve shimmer-chiffon dress ruched through the waist, with full sleeves gathered into ruffled cuffs',
      ratio: '3/4', tone: 'shadow', focus: '50% 45%',
    },
  ],
  'boutique-05': [
    {
      src: 'boutique/mauve-draped-set.jpg',
      alt: 'Two-piece look in mauve: a draped cowl bodice buttoned at the side over a wide pleated skirt',
      ratio: '3/4', tone: 'paper', focus: '50% 40%',
    },
  ],
};

export const looks: LookShape[] = collections.flatMap((c) =>
  Array.from({ length: perLine[c.slug] }, (_, n) => {
    const index = n + 1;
    return {
      slug: `${c.slug}-${String(index).padStart(2, '0')}`,
      index,
      collection: c.slug,
      plates: photographed[`${c.slug}-${String(index).padStart(2, '0')}`] ?? platesFor(c.slug, index),
      ...(prices[`${c.slug}-${String(index).padStart(2, '0')}`]
        ? { price: prices[`${c.slug}-${String(index).padStart(2, '0')}`] }
        : {}),
      ...(hire[`${c.slug}-${String(index).padStart(2, '0')}`]
        ? { hire: hire[`${c.slug}-${String(index).padStart(2, '0')}`] }
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
