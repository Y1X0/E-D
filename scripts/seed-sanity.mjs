/**
 * Fills a fresh Sanity project with the content that currently lives in this
 * repository — the three collections and their copy in all three languages, the
 * twelve looks, the atelier's contact details, and any photograph already
 * committed under src/assets/images.
 *
 * Run once, after creating the project:
 *
 *   SANITY_PROJECT_ID=xxxx SANITY_WRITE_TOKEN=yyyy npm run seed
 *
 * It is safe to run again: every document has a fixed id, so a second run
 * updates rather than duplicates.
 */
import { createClient } from '@sanity/client';
import fs from 'node:fs';
import path from 'node:path';

const projectId = process.env.SANITY_PROJECT_ID;
const token = process.env.SANITY_WRITE_TOKEN;
const dataset = process.env.SANITY_DATASET ?? 'production';
if (!projectId || !token) {
  console.error('Set SANITY_PROJECT_ID and SANITY_WRITE_TOKEN, then run again.');
  process.exit(1);
}

let client = createClient({ projectId, dataset, apiVersion: '2024-10-01', token, useCdn: false });

// Confirm the dataset before writing anything: a wrong name here would other-
// wise fail one document at a time with nothing useful in the log.
let target = dataset;
try {
  const names = (await client.datasets.list()).map((d) => d.name);
  console.log(`project ${projectId} — datasets: ${names.join(', ') || '(none)'}`);
  if (!names.includes(target) && names.length) {
    target = names[0];
    console.warn(`'${dataset}' not found; writing to '${target}' instead.`);
    client = createClient({ projectId, dataset: target, apiVersion: '2024-10-01', token, useCdn: false });
  }
} catch (err) {
  console.warn('Could not list datasets, continuing with', target, '—', err?.message ?? err);
}

const L = ['en', 'he', 'ar'];
const dicts = {};
for (const l of L) dicts[l] = (await import(`../src/i18n/${l}.ts`))[l];
const { collections } = await import('../src/data/collections.ts');

const loc = (get, _type = 'localeString') => ({
  _type,
  ...Object.fromEntries(L.map((l) => [l, get(dicts[l])])),
});

/** Upload a committed photograph so the studio starts with it in place. */
async function upload(relPath, altGet) {
  const file = path.join('src/assets/images', relPath);
  if (!fs.existsSync(file)) return undefined;
  const asset = await client.assets.upload('image', fs.createReadStream(file), {
    filename: path.basename(file),
  });
  console.log('  uploaded', relPath);
  return { _type: 'photo', asset: { _type: 'reference', _ref: asset._id }, alt: loc(altGet), ratio: '2/3' };
}

const docs = [];

for (const [i, c] of collections.entries()) {
  const cover = c.cover.src ? await upload(c.cover.src, (d) => d.collections[c.slug].name) : undefined;
  docs.push({
    _id: `collection-${c.slug}`,
    _type: 'collection',
    slug: { _type: 'slug', current: c.slug },
    order: i + 1,
    name: loc((d) => d.collections[c.slug].name),
    kicker: loc((d) => d.collections[c.slug].kicker),
    summary: loc((d) => d.collections[c.slug].summary, 'localeText'),
    intro: [0, 1].map((n) => ({ _key: `p${n}`, ...loc((d) => d.collections[c.slug].intro[n], 'localeText') })),
    ...(cover ? { cover } : {}),
  });

  for (let n = 1; n <= 4; n++) {
    docs.push({
      _id: `look-${c.slug}-${n}`,
      _type: 'look',
      collection: { _type: 'reference', _ref: `collection-${c.slug}` },
      number: n,
      note: loc((d) => d.lookNotes[c.slug][n - 1], 'localeText'),
    });
  }
}

const { site, location } = await import('../src/config/site.ts');
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  tagline: loc((d) => d.tagline),
  booking: loc((d) => d.booking),
  instagramHandle: site.instagram.handle,
  phone: site.contact.phone || undefined,
  whatsapp: site.contact.whatsapp || undefined,
  email: site.contact.email || undefined,
  street: location.street, city: location.city,
  streetLocal: location.streetLocal, cityLocal: location.cityLocal,
});

const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
await tx.commit();
console.log(`\nSeeded ${docs.length} documents into ${projectId}/${target}:`);
for (const d of docs) console.log('  ', d._id);
console.log('\nOpen the studio and the atelier is already there.');
