# Elite Evening Design

The website for **Elite Evening Design** — a made-to-measure atelier working across
bridal, evening and couture.

Built as a static site with [Astro](https://astro.build): every route is pre-rendered
HTML, the interaction layer is a few kilobytes of vanilla JavaScript, and photography is
optimised at build time into responsive WebP.

The site is published in **English, Hebrew and Arabic**, with full right-to-left
layout for the latter two.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve the built site
npm run check      # Astro + TypeScript diagnostics
```

Node 18.17+ (developed on 22).

## Deploying

`npm run build` writes a plain static `dist/` folder — deploy it to Netlify, Vercel,
Cloudflare Pages, GitHub Pages or any static host. No server or runtime is required.

**Set the real domain before the first deploy**, so canonical URLs, Open Graph tags,
`robots.txt` and the sitemap all point at the right place:

```bash
SITE_URL=https://your-real-domain.com npm run build
```

Or change the fallback in `astro.config.mjs`. Until then it builds against the
placeholder `https://eliteeveningdesign.com`.

On **Render** the service URL is detected automatically via `RENDER_EXTERNAL_URL`,
so a deploy is correct out of the box. Once a custom domain is attached, set
`SITE_URL` on the service to that domain so canonical URLs point at it.

---

## Where things live

```
src/
  config/site.ts        brand facts + contact channels — the single source of truth
  data/                 collections, looks, gallery, bespoke process  (content)
  assets/images/        photography  (see CONTENT.md)
  components/           Plate, Hero, SiteHeader, SiteFooter, LookCard, InquiryForm, Lightbox…
  layouts/Base.astro    <head>, SEO, structured data, header + footer
  pages/                one file per route
  styles/app.css        the whole design system: tokens, type, layout, motion
  lib/images.ts         resolves a plate's `src` to an optimised image
public/
  brand/                monogram, seal and app icons, cut from the supplied logo
  fonts/                self-hosted Cormorant Garamond + Jost (no third-party requests)
  og.jpg                social sharing card
```

### Routes

English sits at the root; Hebrew and Arabic are prefixed. Every page exists in all
three, so `/contact`, `/he/contact` and `/ar/contact` are the same page in three
languages, cross-linked with `hreflang`.

| Route | |
|---|---|
| `/` · `/he` · `/ar` | home |
| `…/collections` | the three lines |
| `…/collections/[slug]` | bridal · evening · couture |
| `…/looks/[slug]` | an individual look |
| `…/gallery` | filterable editorial gallery |
| `…/bespoke` | how a commission works |
| `…/about` | the atelier |
| `…/contact` | enquiries |
| `/404` | not found — detects the language from the path |

22 pages × 3 languages = 66 routes.

---

## Languages

Every word lives in `src/i18n/<locale>.ts`; `src/data/` holds only structure (slugs,
image ratios, layout). Adding a language is one new dictionary file plus an entry in
`src/i18n/types.ts` — no template changes.

- **Typography** — Cormorant Garamond + Jost carry no Hebrew or Arabic glyphs, so each
  script has its own pair: Frank Ruhl Libre + Assistant for Hebrew, Amiri + Tajawal for
  Arabic. Each face keeps its `unicode-range`, so a visitor downloads only the script
  they are reading.
- **Direction** — the layout is written with CSS logical properties, so it mirrors on
  its own. Arrows, transform origins and the image viewer's prev/next follow the
  reading direction. Telephone numbers, the Instagram handle and date fields stay
  left-to-right inside right-to-left text.
- **Script-aware type** — Hebrew and Arabic set much larger than Latin at the same size
  and have no capitals, so each gets its own display scale, leading, and no
  tracked-caps or italic treatment (neither display face has a true italic).

The Arabic and Hebrew copy is house voice, written to sound like the brand rather than
translated literally, and addressed to the client in the feminine. **It is yours to
review and rewrite** — see CONTENT.md.

---

## Turning on contact methods

`src/config/site.ts` publishes only the channels that actually exist. Live today:
**WhatsApp, Instagram and telephone**, plus the atelier's address. Email is still
empty, so **the interface hides it** rather than showing an address that does not work.

```ts
const contact: Contact = {
  email: '',                      // fill in to show an Email row; the form then composes to it
  phone: '+972 53-468-0084',      // shows a Telephone row
  whatsapp: '972534680084',       // digits only — shows a WhatsApp row, first in the list
  formEndpoint: '',               // a POST endpoint (Formspree, Basin, a function…)
};
```

The atelier's address lives alongside it in `location`, in English with the local
Hebrew beneath. It appears on the contact page and in the footer, links out to a map,
and drives the `LocalBusiness` structured data that puts the atelier in local search.

**The enquiry form** picks the best available transport, in this order:

1. `formEndpoint` set → posts the enquiry there and confirms in place.
2. otherwise `email` set → opens the visitor's mail client with the enquiry filled in.
3. otherwise → hands the visitor to Instagram, the atelier's live channel.

It works today with no configuration at all, and gets better as details are added.

---

## Editing content

The site reads its content from **Sanity** when a project is configured, and from
the files in this repository otherwise. Both produce the same pages — see
[CONTENT.md](./CONTENT.md).

### Connecting the admin panel

1. Create a free project at sanity.io and note its **project ID**.
2. Set two environment variables on the host (on Render: *Environment*):

   ```
   SANITY_PROJECT_ID=your-project-id
   SANITY_DATASET=production
   ```

3. Fill the studio with what the repository already holds:

   ```bash
   SANITY_PROJECT_ID=xxx SANITY_WRITE_TOKEN=yyy npm run seed
   ```

   The token comes from the project's *API → Tokens* screen and needs write
   access. It is used once and never committed.

4. Add the site's URL under *API → CORS origins*, with credentials allowed, so
   the studio can sign in from `/admin`.
5. Add a **deploy hook** so publishing rebuilds the site: copy the deploy hook URL
   from the host and add it as a webhook in the Sanity project.

Until step 2 is done nothing changes: `/admin` is not built, and the site serves
the content committed here. If Sanity is configured but unreachable, the build
logs a warning and falls back to the same committed content rather than failing.

### How the content layer is arranged

- `src/content/` — one loader, two sources. `getContent(locale)` returns the same
  shape either way, so views never know which is in use.
- `src/sanity/schema/` — what the admin panel shows: collections, looks, settings.
- `sanity.config.ts` — the studio itself, mounted at `/admin`.
- `src/i18n/` — interface wording (buttons, labels, page copy). Developer territory;
  not exposed in the admin panel, because it is not what an atelier edits.

## A note on accuracy

Everything factual on this site comes from the atelier itself: the name, the tagline
*"Where elegance meets luxury"*, the three lines Bridal · Evening · Couture, the phrase
*"Book your dream dress"* and the Instagram handle all come from its logo and profile;
the telephone number and the address at Herzl 40, Lod were supplied directly.

No awards, clients, prices, dates or credentials are claimed anywhere, because none has
been published. The narrative copy is house voice and is yours to rewrite.
