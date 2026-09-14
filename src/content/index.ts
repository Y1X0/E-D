import { sanityClient, sanityEnabled, IMAGE_PROJECTION } from '~/lib/sanity';
import { t, type Locale } from '~/i18n';
import { collections as localCollections } from '~/data/collections';
import { looks as localLooks } from '~/data/looks';
import type { CollectionEntry, LookEntry, Photo, SiteContent } from './types';
import type { Ratio } from '~/data/types';

export type { CollectionEntry, LookEntry, Photo, SiteContent } from './types';

const pick = <T,>(row: Record<string, T> | null | undefined, locale: Locale): T | undefined =>
  row?.[locale] ?? row?.en;

const QUERY = `{
  "collections": *[_type == "collection"] | order(order asc) {
    "slug": slug.current, name, kicker, summary, intro,
    cover ${IMAGE_PROJECTION},
    plates[] ${IMAGE_PROJECTION}
  },
  "looks": *[_type == "look"] | order(number asc) {
    "collection": collection->slug.current,
    "number": number, note,
    photos[] ${IMAGE_PROJECTION}
  },
  "settings": *[_type == "siteSettings"][0] {
    tagline, booking, instagramHandle, phone, whatsapp, email, formEndpoint,
    street, city, streetLocal, cityLocal,
    hero ${IMAGE_PROJECTION}
  }
}`;

const toPhoto = (img: any, locale: Locale, fallbackAlt: string, tone?: Photo['tone']): Photo => ({
  sanity: img?.asset ? img : undefined,
  alt: pick(img?.alt, locale) || fallbackAlt,
  ratio: (img?.ratio as Ratio) || '2/3',
  tone,
});

/** The content committed in the repository — the site's behaviour today. */
function localContent(locale: Locale): SiteContent {
  const dict = t(locale);
  return {
    collections: localCollections.map((c) => {
      const copy = dict.collections[c.slug];
      return {
        slug: c.slug,
        name: copy.name,
        kicker: copy.kicker,
        summary: copy.summary,
        intro: [...copy.intro],
        cover: { ...c.cover },
        plates: c.plates.map((p) => ({ ...p })),
      } satisfies CollectionEntry;
    }),
    looks: localLooks.map((l) => ({
      slug: l.slug,
      index: l.index,
      collection: l.collection,
      note: dict.lookNotes[l.collection][l.index - 1],
      plates: l.plates.map((p) => ({ ...p })),
    })),
    hero: null,
    settings: null,
  };
}

let cached: Promise<any> | null = null;

/**
 * Content for one language.
 *
 * Reads from Sanity when it is configured, and from the repository otherwise —
 * so the site is never broken by a missing or empty studio. The Sanity response
 * is fetched once per build and reused across languages.
 */
export async function getContent(locale: Locale): Promise<SiteContent> {
  if (!sanityEnabled || !sanityClient) return localContent(locale);

  cached ??= sanityClient.fetch(QUERY).catch((err) => {
    console.warn('[content] Sanity unreachable, using the content in the repository:', err?.message ?? err);
    return null;
  });
  const data = await cached;
  if (!data?.collections?.length) return localContent(locale);

  const dict = t(locale);
  const collections: CollectionEntry[] = data.collections.map((c: any) => {
    const fallback = dict.collections[c.slug as keyof typeof dict.collections];
    return {
      slug: c.slug,
      name: pick(c.name, locale) || fallback?.name || c.slug,
      kicker: pick(c.kicker, locale) || fallback?.kicker || '',
      summary: pick(c.summary, locale) || fallback?.summary || '',
      intro: (c.intro ?? []).map((p: any) => pick(p, locale)).filter(Boolean),
      cover: toPhoto(c.cover, locale, pick(c.name, locale) || '', 'linen'),
      plates: (c.plates ?? []).map((p: any, i: number) =>
        toPhoto(p, locale, '', (['paper', 'shadow', 'linen', 'ink'] as const)[i % 4])),
    };
  });

  const perLine = new Map<string, number>();
  const looks: LookEntry[] = (data.looks ?? []).map((l: any) => {
    const n = l.number ?? (perLine.get(l.collection) ?? 0) + 1;
    perLine.set(l.collection, n);
    const fallback = dict.lookNotes[l.collection as keyof typeof dict.lookNotes];
    return {
      slug: `${l.collection}-${String(n).padStart(2, '0')}`,
      index: n,
      collection: l.collection,
      note: pick(l.note, locale) || fallback?.[n - 1] || '',
      plates: (l.photos ?? []).map((p: any, i: number) =>
        toPhoto(p, locale, '', (['linen', 'shadow', 'paper'] as const)[i % 3])),
    };
  });

  const s = data.settings ?? {};
  return {
    collections,
    looks: looks.filter((l) => collections.some((c) => c.slug === l.collection)),
    hero: s.hero?.asset ? toPhoto(s.hero, locale, '', 'ink') : null,
    settings: {
      tagline: pick(s.tagline, locale),
      booking: pick(s.booking, locale),
      instagramHandle: s.instagramHandle,
      phone: s.phone, whatsapp: s.whatsapp, email: s.email, formEndpoint: s.formEndpoint,
      street: s.street, city: s.city, streetLocal: s.streetLocal, cityLocal: s.cityLocal,
    },
  };
}

/** Route generation needs the shape of the content, not a language of it. */
export async function getRoutes() {
  const { collections, looks } = await getContent('en');
  return { collections, looks };
}

export interface GalleryItem { plate: Photo; line: string; href: string }

/** The gallery run, assembled from the collections and looks already loaded. */
export function galleryFrom(content: SiteContent): GalleryItem[] {
  return [
    ...content.collections.map((c) => ({ plate: c.cover, line: c.slug, href: `/collections/${c.slug}` })),
    ...content.looks.flatMap((l) =>
      l.plates.slice(0, 2).map((plate) => ({ plate, line: l.collection, href: `/looks/${l.slug}` }))),
    ...content.collections.flatMap((c) =>
      c.plates.map((plate) => ({ plate, line: c.slug, href: `/collections/${c.slug}` }))),
  ];
}

/** Other looks from the same line first, for the foot of a design page. */
export function relatedTo(look: LookEntry, all: LookEntry[], count = 3): LookEntry[] {
  const siblings = all.filter((x) => x.collection === look.collection && x.slug !== look.slug);
  const others = all.filter((x) => x.collection !== look.collection);
  return [...siblings, ...others].slice(0, count);
}
