import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * What may be bought, and for how much.
 *
 * Generated from the repository by scripts/build-catalogue.mjs, so the price on
 * the page and the price charged come from the same line of the same file. The
 * browser sends a SKU and a quantity; the amount is decided here and nowhere
 * else, which is what stops a buyer choosing their own price.
 */
export interface CatalogueItem {
  sku: string;
  collection: string;
  /** Minor units — agorot. */
  unitAmount: number;
  currency: string;
  maxQuantity: number;
  titles: Record<string, string>;
  notes: Record<string, string>;
}

export interface Catalogue {
  currency: string;
  items: Map<string, CatalogueItem>;
}

export function loadCatalogue(url = new URL('../catalogue.json', import.meta.url)): Catalogue {
  const raw = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as {
    currency: string;
    items: CatalogueItem[];
  };
  return { currency: raw.currency, items: new Map(raw.items.map((i) => [i.sku, i])) };
}

export const titleFor = (item: CatalogueItem, locale: string): string =>
  item.titles[locale] ?? item.titles.en ?? item.sku;
