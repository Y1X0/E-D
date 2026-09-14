import type { Look, Plate } from './types';
import { collections } from './collections';

/**
 * Individual looks.
 *
 * Looks are numbered rather than named: the atelier has published no design
 * names, and inventing them would put words in its mouth. Each entry is a
 * ready-made slot — add photographs to `plates` and a line to `note`, or add
 * a `name` field of your own once real names exist. See CONTENT.md.
 */
const NOTES: Record<string, string[]> = {
  bridal: [
    'A column silhouette, cut long and left quiet.',
    'Structured bodice with a softened shoulder line.',
    'Full skirt, weighted so it holds its shape in movement.',
    'Covered back, finished by hand.',
  ],
  evening: [
    'Bias-cut drape that follows rather than grips.',
    'A clean neckline carried by the cut alone.',
    'Surface work concentrated at the waist.',
    'Floor-length, built for a long entrance.',
  ],
  couture: [
    'Sculpted through the body, released at the hem.',
    'Hand-worked surface across a constructed base.',
    'Pattern drawn for one client and one measurement set.',
    'Finished entirely by hand, inside and out.',
  ],
};

const platesFor = (collection: string, i: number): Plate[] => {
  const tones = ['linen', 'shadow', 'paper', 'ink'] as const;
  return [
    { alt: `Look ${String(i).padStart(2, '0')} from the ${collection} line, full length`, ratio: '2/3', tone: tones[i % 4] },
    { alt: `Look ${String(i).padStart(2, '0')}, detail`, ratio: '4/5', tone: tones[(i + 1) % 4] },
    { alt: `Look ${String(i).padStart(2, '0')}, reverse`, ratio: '3/4', tone: tones[(i + 2) % 4] },
  ];
};

export const looks: Look[] = collections.flatMap((c) =>
  NOTES[c.slug].map((note, n) => {
    const index = n + 1;
    return {
      slug: `${c.slug}-${String(index).padStart(2, '0')}`,
      index,
      collection: c.slug,
      note,
      plates: platesFor(c.name.toLowerCase(), index),
    } satisfies Look;
  }),
);

export const looksIn = (collection: string) => looks.filter((l) => l.collection === collection);
export const lookBySlug = (slug: string) => looks.find((l) => l.slug === slug);
export const lookTitle = (l: Look) => `Look ${String(l.index).padStart(2, '0')}`;

/** Other looks from the same line, for the foot of a design page. */
export function relatedLooks(l: Look, count = 3): Look[] {
  const siblings = looksIn(l.collection).filter((x) => x.slug !== l.slug);
  const others = looks.filter((x) => x.collection !== l.collection);
  return [...siblings, ...others].slice(0, count);
}
