import type { Collection } from './types';

/**
 * The three lines the atelier names in its own profile: Bridal | Evening | Couture.
 * No season, year or collection name is invented — none has been published.
 *
 * All narrative copy below is house voice written from the brand's own words
 * ("Where elegance meets luxury", "Book your dream dress"). It makes no claim
 * about awards, clients, locations, prices or dates. Edit freely — see CONTENT.md.
 */
export const collections: Collection[] = [
  {
    slug: 'bridal',
    name: 'Bridal',
    kicker: 'The gown, and everything it carries',
    summary: 'Made-to-measure gowns for the one day a dress has to hold more than fabric.',
    intro: [
      'A bridal commission is the longest conversation this atelier has with anyone. It begins with a sketch that is allowed to change as often as it needs to, and ends with a gown cut to one body and one way of moving through a room.',
      'Silhouette, weight, the way light falls on a train — each is decided in the fitting room rather than chosen from a rail.',
    ],
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
    name: 'Evening',
    kicker: 'Dressed for the entrance',
    summary: 'Evening wear built around presence — line, drape and the confidence of a clean cut.',
    intro: [
      'Evening dressing is a question of proportion. A neckline that sits exactly where it should, a drape that answers the body instead of hiding it, a colour that holds its own under low light.',
      'These are pieces made for arrival: cut close where it counts and left generous where movement matters.',
    ],
    cover: {
      src: 'evening/gold-beaded-gown.jpg',
      alt: 'Champagne evening gown with a hand-beaded corset bodice, off-shoulder satin sleeves and a sheer beaded train',
      ratio: '2/3',
      tone: 'ink',
      // keep the head and the length of the train; trim the ceiling instead
      focus: '50% 35%',
    },
    plates: [
      { alt: 'Draped evening silhouette', ratio: '2/3', tone: 'shadow' },
      { alt: 'Neckline and shoulder detail', ratio: '1/1', tone: 'linen' },
      { alt: 'Evening gown in movement', ratio: '3/4', tone: 'ink' },
      { alt: 'Beaded surface detail', ratio: '4/5', tone: 'paper' },
    ],
  },
  {
    slug: 'couture',
    name: 'Couture',
    kicker: 'Made once, for one person',
    summary: 'One-of-one pieces, drawn and constructed from the first measurement to the final stitch.',
    intro: [
      'Couture here means what it says: a single garment, made for a single client, from a pattern that exists for no one else.',
      'The work is slow on purpose. Structure is built by hand, surfaces are worked until they behave the way the drawing promised, and nothing leaves the atelier before it fits.',
    ],
    cover: { alt: 'Couture piece by Elite Evening Design', ratio: '2/3', tone: 'shadow' },
    plates: [
      { alt: 'Hand-worked surface embroidery', ratio: '1/1', tone: 'ink' },
      { alt: 'Constructed bodice on the stand', ratio: '3/4', tone: 'linen' },
      { alt: 'Sculpted couture silhouette', ratio: '2/3', tone: 'paper' },
      { alt: 'Finishing detail at the waist', ratio: '4/5', tone: 'shadow' },
    ],
  },
];

export const collectionBySlug = (slug: string) => collections.find((c) => c.slug === slug);
