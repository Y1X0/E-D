import type { Ratio } from '~/data/types';
import type { SanityImageRef } from '~/lib/sanity';

export type Tone = 'paper' | 'linen' | 'shadow' | 'ink';

/** One image position, from either source. */
export interface Photo {
  /** A Sanity asset — rendered from the CDN with the hotspot applied. */
  sanity?: SanityImageRef & { dimensions?: { width: number; height: number }; lqip?: string };
  /** A file committed under `src/assets/images` — optimised by Astro at build. */
  src?: string;
  alt: string;
  ratio: Ratio;
  tone?: Tone;
  focus?: string;
}

export interface CollectionEntry {
  slug: string;
  name: string;
  kicker: string;
  summary: string;
  intro: string[];
  cover: Photo;
  plates: Photo[];
}

export interface LookEntry {
  slug: string;
  index: number;
  collection: string;
  note: string;
  plates: Photo[];
}

export interface SiteContent {
  collections: CollectionEntry[];
  looks: LookEntry[];
  hero: Photo | null;
  /** Contact details, when the atelier maintains them in the studio. */
  settings: {
    tagline?: string;
    booking?: string;
    instagramHandle?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    formEndpoint?: string;
    street?: string;
    city?: string;
    streetLocal?: string;
    cityLocal?: string;
  } | null;
}
