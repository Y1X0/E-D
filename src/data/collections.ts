import type { Plate } from './types';

/**
 * Collection structure — slugs and imagery only. Every word lives in
 * `src/i18n/<locale>.ts`, so the three lines read natively in each language.
 */
export interface CollectionShape {
  slug: 'bridal' | 'evening' | 'couture' | 'boutique';
  cover: Plate;
  plates: Plate[];
}

export const collections: CollectionShape[] = [
  {
    slug: 'bridal',
    cover: { alt: 'Bridal gown by Elite Evening Design', ratio: '2/3', tone: 'linen' },
    plates: [
      { alt: 'Bodice detail from the bridal line', ratio: '3/4', tone: 'paper' },
      { alt: 'Full-length bridal silhouette', ratio: '2/3', tone: 'shadow' },
      { alt: 'Hand-finished hem and train', ratio: '4/5', tone: 'linen' },
      { alt: 'Back detail of a bridal gown', ratio: '3/4', tone: 'ink' },
    ],
  },
  {
    slug: 'evening',
    cover: {
      src: 'evening/gold-beaded-gown.jpg',
      alt: 'Champagne evening gown with a hand-beaded corset bodice, off-shoulder satin sleeves and a sheer beaded train',
      ratio: '2/3',
      tone: 'ink',
      // keep the head and the length of the train; trim the ceiling instead
      focus: '50% 35%',
    },
    // Four frames of the same commissioned gown — the corset, the sleeve, the
    // embroidery down the skirt and the train — cut from the atelier's own
    // photograph rather than stood in for.
    plates: [
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
      {
        src: 'evening/gown-sleeve.jpg',
        alt: 'Draped satin sleeve against the beaded waist of the gown',
        ratio: '3/4', tone: 'ink',
      },
      {
        src: 'evening/gown-detail.jpg',
        alt: 'Gold beadwork running down the sheer skirt of the gown',
        ratio: '4/5', tone: 'paper',
      },
    ],
  },
  {
    slug: 'couture',
    cover: { alt: 'Couture piece by Elite Evening Design', ratio: '2/3', tone: 'shadow' },
    plates: [
      { alt: 'Hand-worked surface embroidery', ratio: '1/1', tone: 'ink' },
      { alt: 'Constructed bodice on the stand', ratio: '3/4', tone: 'linen' },
      { alt: 'Sculpted couture silhouette', ratio: '2/3', tone: 'paper' },
      { alt: 'Finishing detail at the waist', ratio: '4/5', tone: 'shadow' },
    ],
  },
  {
    slug: 'boutique',
    cover: { alt: 'Softly cut boutique dress by Elite Evening Design', ratio: '2/3', tone: 'paper' },
    plates: [
      { alt: 'Light fabric falling from the shoulder', ratio: '3/4', tone: 'linen' },
      { alt: 'An easy sleeve, unembellished', ratio: '4/5', tone: 'paper' },
      { alt: 'Soft boutique silhouette in movement', ratio: '2/3', tone: 'shadow' },
      { alt: 'A clean hem, finished without ornament', ratio: '1/1', tone: 'linen' },
    ],
  },
];

export type CollectionSlug = CollectionShape['slug'];
export const collectionBySlug = (slug: string) => collections.find((c) => c.slug === slug);
