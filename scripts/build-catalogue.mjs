/**
 * Writes server/catalogue.json from the prices in this repository.
 *
 * The payment service prices every order from that file and never from the
 * browser, so a buyer cannot choose what to pay. Generating it here means the
 * price the site shows and the price the gateway charges cannot drift apart:
 * they come from the same line in src/data/looks.ts.
 */
import { writeFile } from 'node:fs/promises';

const { looks } = await import('../src/data/looks.ts');
const { collections } = await import('../src/data/collections.ts');
const dicts = Object.fromEntries(await Promise.all(
  ['en', 'he', 'ar'].map(async (l) => [l, (await import(`../src/i18n/${l}.ts`))[l]]),
));

const CURRENCY = 'ILS';
const MINOR = 100;

const items = looks
  .filter((l) => typeof l.price === 'number' && l.price > 0)
  .map((l) => ({
    sku: l.slug,
    collection: l.collection,
    unitAmount: Math.round(l.price * MINOR),
    currency: CURRENCY,
    maxQuantity: 5,
    titles: Object.fromEntries(['en', 'he', 'ar'].map((lang) => [
      lang,
      `${dicts[lang].collections[l.collection].name} — ${dicts[lang].ui.lookTitle(l.index)}`,
    ])),
    notes: Object.fromEntries(['en', 'he', 'ar'].map((lang) => [
      lang, dicts[lang].lookNotes[l.collection][l.index - 1],
    ])),
  }));

const catalogue = { currency: CURRENCY, generatedFrom: 'src/data/looks.ts', items };
await writeFile(new URL('../server/catalogue.json', import.meta.url), `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`[catalogue] ${items.length} priced pieces from ${collections.length} lines → server/catalogue.json`);
