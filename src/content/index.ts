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
    "number": number, note, price, payUrl,
    photos[] ${IMAGE_PROJECTION}
  },
  "settings": *[_type == "siteSettings"][0] {
    tagline, booking, instagramHandle, phone, whatsapp, email, formEndpoint,
    street, city, streetLocal, cityLocal, payUrl, payMethods,
    hero ${IMAGE_PROJECTION}
  }
}`;

const toPhoto = (img: any, locale: Locale, fallbackAlt: string, tone?: Photo['tone']): Photo => ({
  sanity: img?.asset ? img : undefined,
  alt: pick(img?.alt, locale) || fallbackAlt,
  ratio: (img?.ratio as Ratio) || '2/3',
  tone,
});

/**
 * The designed placeholder plates for a line, from the repository.
 *
 * A collection or a look in the studio can hold no photograph yet — that is the
 * normal state of a new entry, and it is the state the studio was seeded in.
 * The layout still needs a plate in each position, so it falls back to the same
 * tonal panel the site has always used rather than collapsing to a gap.
 */
const placeholders = (slug: string, look?: number): Photo[] => {
  if (look === undefined) return (localCollections.find((c) => c.slug === slug)?.plates ?? []).map((p) => ({ ...p }));
  const key = `${slug}-${String(look).padStart(2, '0')}`;
  return (localLooks.find((l) => l.slug === key)?.plates ?? []).map((p) => ({ ...p }));
};

/** The price written in the repository for a look the studio has no price for. */
const ownPrice = (slug: string) => {
  const price = localLooks.find((l) => l.slug === slug)?.price;
  return price ? { price } : {};
};

const photos = (rows: any[] | undefined, locale: Locale, tones: readonly Photo['tone'][], fallback: Photo[]): Photo[] => {
  const kept = (rows ?? []).filter((p) => p?.asset);
  return kept.length
    ? kept.map((p, i) => toPhoto(p, locale, '', tones[i % tones.length]))
    : fallback;
};

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
      ...(l.price ? { price: l.price } : {}),
    })),
    hero: null,
    settings: null,
  };
}

let cached: Promise<any> | null = null;
let reported = false;
let announced = false;

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
  if (!data?.collections?.length) {
    console.warn('[content] Sanity holds no collections yet — using the content in the repository.');
    return localContent(locale);
  }
  if (!reported) {
    reported = true;
    const withCover = data.collections.filter((c: any) => c.cover?.asset).length;
    console.log(`[content] Sanity: ${data.collections.length} collections, ${data.looks?.length ?? 0} looks, ${withCover} with a cover photograph.`);
  }

  const dict = t(locale);
  const collections: CollectionEntry[] = data.collections.map((c: any) => {
    const fallback = dict.collections[c.slug as keyof typeof dict.collections];
    return {
      slug: c.slug,
      name: pick(c.name, locale) || fallback?.name || c.slug,
      kicker: pick(c.kicker, locale) || fallback?.kicker || '',
      summary: pick(c.summary, locale) || fallback?.summary || '',
      intro: (c.intro ?? []).map((p: any) => pick(p, locale)).filter(Boolean),
      cover: c.cover?.asset
        ? toPhoto(c.cover, locale, pick(c.name, locale) || '', 'linen')
        : { ...(localCollections.find((x) => x.slug === c.slug)?.cover ?? { alt: '', ratio: '2/3' as Ratio, tone: 'linen' as const }) },
      plates: photos(c.plates, locale, ['paper', 'shadow', 'linen', 'ink'] as const, placeholders(c.slug)),
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
      plates: photos(l.photos, locale, ['linen', 'shadow', 'paper'] as const, placeholders(l.collection, n)),
      ...(typeof l.price === 'number' ? { price: l.price } : ownPrice(`${l.collection}-${String(n).padStart(2, '0')}`)),
      ...(l.payUrl ? { payUrl: l.payUrl } : {}),
    };
  });

  // A line added to the repository appears even before the studio has it: the
  // studio owns the words and the photographs, the repository owns which lines
  // exist. Anything the studio does hold wins — matching slugs are never
  // duplicated — so a line is removed by removing it here.
  const own = localContent(locale);
  const added = own.collections.filter((c) => !collections.some((x) => x.slug === c.slug));
  const addedLooks = own.looks.filter((l) => added.some((c) => c.slug === l.collection));
  if (added.length && !announced) {
    announced = true;
    console.log(`[content] from the repository as well: ${added.map((c) => c.slug).join(', ')} (not in the studio yet).`);
  }

  const s = data.settings ?? {};
  return {
    collections: [...collections, ...added],
    looks: [...looks.filter((l) => collections.some((c) => c.slug === l.collection)), ...addedLooks],
    hero: s.hero?.asset ? toPhoto(s.hero, locale, '', 'ink') : null,
    settings: {
      tagline: pick(s.tagline, locale),
      booking: pick(s.booking, locale),
      instagramHandle: s.instagramHandle,
      phone: s.phone, whatsapp: s.whatsapp, email: s.email, formEndpoint: s.formEndpoint,
      street: s.street, city: s.city, streetLocal: s.streetLocal, cityLocal: s.cityLocal,
      payUrl: s.payUrl, payMethods: s.payMethods,
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
