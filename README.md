# Elite Evening Design

The website for **Elite Evening Design** — a made-to-measure atelier working across
bridal, evening and couture.

Built as a static site with [Astro](https://astro.build): every route is pre-rendered
HTML, the interaction layer is a few kilobytes of vanilla JavaScript, and photography is
optimised at build time into responsive WebP.

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

| Route | |
|---|---|
| `/` | home |
| `/collections` | the three lines |
| `/collections/[slug]` | bridal · evening · couture |
| `/looks/[slug]` | an individual look |
| `/gallery` | filterable editorial gallery |
| `/bespoke` | how a commission works |
| `/about` | the atelier |
| `/contact` | enquiries |
| `/404` | not found |

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

Copy, collections, looks and the bespoke process are all plain TypeScript in
`src/data/` — no CMS, no build step to learn. **See [CONTENT.md](./CONTENT.md)** for
adding photography and editing text.

## A note on accuracy

Everything factual on this site comes from the atelier itself: the name, the tagline
*"Where elegance meets luxury"*, the three lines Bridal · Evening · Couture, the phrase
*"Book your dream dress"* and the Instagram handle all come from its logo and profile;
the telephone number and the address at Herzl 40, Lod were supplied directly.

No awards, clients, prices, dates or credentials are claimed anywhere, because none has
been published. The narrative copy is house voice and is yours to rewrite.
