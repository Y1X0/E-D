import { en } from './en';
import { he } from './he';
import { ar } from './ar';
import { LOCALES, DIR, type Dict, type Locale } from './types';

export * from './types';

const DICTS: Record<Locale, Dict> = { en, he, ar };

export const t = (locale: Locale): Dict => DICTS[locale];
export const dirOf = (locale: Locale) => DIR[locale];
export const isRtl = (locale: Locale) => DIR[locale] === 'rtl';

/** English lives at the root; the others are prefixed. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Prefix a site-absolute path for a locale. `/collections` → `/ar/collections` */
export function localePath(path: string, locale: Locale): string {
  const clean = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  const base = clean === '/' ? '' : clean;
  return locale === DEFAULT_LOCALE ? base || '/' : `/${locale}${base}`;
}

/** Strip any locale prefix, giving the path as the default locale knows it. */
export function neutralPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    if (clean === `/${l}`) return '/';
    if (clean.startsWith(`/${l}/`)) return clean.slice(l.length + 1);
  }
  return clean;
}

/** Read the locale out of a URL path. */
export function localeOf(pathname: string): Locale {
  const seg = pathname.replace(/^\/+/, '').split('/')[0];
  return (LOCALES as readonly string[]).includes(seg) ? (seg as Locale) : DEFAULT_LOCALE;
}

/** The non-default locales, for getStaticPaths. */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE);
