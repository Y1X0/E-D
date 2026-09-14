/** Aspect ratios used across the site. Locked so nothing is ever distorted. */
export type Ratio = '2/3' | '3/4' | '4/5' | '1/1' | '5/4' | '3/2' | '16/9';

/**
 * One image position in a layout.
 *
 * `src` is deliberately optional. The atelier's Instagram carries no posts yet,
 * so no photography exists to publish. Until a real file is dropped into
 * `public/images/` and referenced here, a plate renders as a designed tonal
 * panel — never a broken image, never a stretched one. See CONTENT.md.
 */
export interface Plate {
  /** e.g. '/images/bridal/look-01.jpg' — leave undefined until the photo exists. */
  src?: string;
  /** Written for a screen reader. Required whether or not `src` is set. */
  alt: string;
  ratio: Ratio;
  /** Tonal weight of the placeholder panel, used to give a grid rhythm. */
  tone?: 'paper' | 'linen' | 'shadow' | 'ink';
  /** Optional focal point for the real photograph, e.g. '50% 30%'. */
  focus?: string;
}

export interface Look {
  slug: string;
  /** Looks are numbered, not named — the atelier has not published names. */
  index: number;
  collection: string;
  note: string;
  plates: Plate[];
}

export interface Collection {
  slug: string;
  name: string;
  kicker: string;
  summary: string;
  intro: string[];
  cover: Plate;
  plates: Plate[];
}
