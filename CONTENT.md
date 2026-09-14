# Adding content

There are two ways to run this site, and you only need to read the one you use.

---

## The admin panel (recommended)

Once Sanity is connected, everything below happens in a browser — no code, no
deploys to trigger by hand.

**Where:** `https://your-site/admin` — sign in with the account the project was
created under.

**What you can do there**

| | |
|---|---|
| **Collections** | Rename a line, rewrite its introduction, change its cover photograph, add more photographs |
| **Looks** | Add a piece, number it, write its one-line note, upload its photographs |
| **Atelier settings** | Tagline, booking button, telephone, WhatsApp, email, address, the home page photograph |

Every text field has three boxes — **English, עברית, العربية**. English is
required; leave the others empty and the English text is used.

**Photographs.** Drag them in. Sanity keeps the original and serves resized,
modern-format copies from a CDN, so the repository never grows and pages stay
fast. Each photograph has two things worth setting:

- **Hotspot** — click the crop icon and drag the circle onto the part that must
  never be cut: a face, a neckline, the end of a train. Every crop on the site
  respects it.
- **Crop** — the shape the photograph is shown in. `2:3` loses the least of a
  full-length portrait.

**Publishing.** Press *Publish* on a document, and the site rebuilds itself. Give
it a minute or two.

---

## Without the admin panel

Until Sanity is connected the site builds from the files in this repository, and
these are the files to edit.

### Adding photography

The Instagram profile carries no posts yet, so the site ships with **no photography**.
Every image position is already built and laid out — each one currently renders a
designed stand-in panel (a woven tone with the ED monogram blind-embossed into it)
instead of a broken image or a grey box.

To add a real photograph:

**Step 1** — drop the file into `src/assets/images/`, in any folder structure you like:

```
src/assets/images/bridal/look-01.jpg
src/assets/images/hero/hero.jpg
```

**Step 2** — add a `src` to the matching entry in `src/data/`, written relative to
`src/assets/images/`:

```ts
// before
{ alt: 'Bridal gown by Elite Evening Design', ratio: '3/4', tone: 'linen' }

// after
{ src: 'bridal/look-01.jpg', alt: 'Bridal gown, full length', ratio: '3/4', tone: 'linen' }
```

That is the whole job. On the next build Astro will:

- generate responsive WebP variants at 420 / 700 / 1000 / 1400 / 1900 px,
- set intrinsic `width`/`height` so the page never jumps as it loads,
- lazy-load anything below the fold,
- activate the `alt` text and the fullscreen viewer for that image.

**The hero** is a special case: it looks for `hero/hero.jpg` by name. Add that one file
and the homepage opening becomes a full-bleed cinematic image, with the type and its
scrim already sitting correctly on top. Use a wide, high-resolution frame (2400 px or
more across) with space in the upper-left for the headline.

### Image guidance

| | |
|---|---|
| **Format** | JPEG or PNG — Astro converts to WebP itself. Do not pre-compress hard. |
| **Size** | Upload the largest you have. 1600 px on the short edge or more. |
| **Ratio** | Set `ratio` to match how you want it cropped — the file itself is never stretched. |
| **Cropping** | Plates crop with `object-fit: cover`, centred. Use `focus` to move the crop, e.g. `focus: '50% 25%'` to favour the top (a face or neckline). |
| **Alt text** | Describe the garment, not the file: *"Bias-cut evening gown, full length"*. |

### The fields on an image

```ts
{
  src:   'bridal/look-01.jpg',   // optional — omit for a stand-in panel
  alt:   'Bridal gown, full length',
  ratio: '3/4',                  // '2/3' '3/4' '4/5' '1/1' '5/4' '3/2' '16/9'
  tone:  'linen',                // stand-in panel weight: 'paper' 'linen' 'shadow' 'ink'
  focus: '50% 30%',              // optional focal point for the crop
}
```

`tone` only matters while there is no photograph — it sets how light or dark the
stand-in panel is, which is what gives the grids their rhythm. Once `src` is set the
tone is invisible.

---

### Editing the words

**All text lives in `src/i18n/`, one file per language.** Editing English means editing
`src/i18n/en.ts`; Arabic is `ar.ts`, Hebrew is `he.ts`. The three files have exactly the
same shape, so you can read them side by side.

| File | What it holds |
|---|---|
| `src/i18n/en.ts` · `he.ts` · `ar.ts` | **Every word on the site**, in that language |
| `src/config/site.ts` | Brand name, Instagram, contact channels, address |
| `src/data/collections.ts` | Collection structure: slugs and imagery (no text) |
| `src/data/looks.ts` | Look structure: numbering and imagery (no text) |

Inside a language file, the sections follow the site: `nav`, `home`, `collections`,
`lookNotes`, `bespoke`, `about`, `contact`, `seo`. Change a string in all three files
and the site changes in all three languages.

### The Arabic and Hebrew copy

It was written as brand voice, not translated word-for-word, and addresses the client
in the feminine throughout. **Please read it and adjust anything that does not sound
like you** — it is copy, not code, and changing it breaks nothing.

### What is factual and what is house voice

Taken directly from the atelier's logo and Instagram profile — **do not change these
unless the brand changes**:

- the name *Elite Evening Design*
- the tagline *"Where elegance meets luxury"*
- the three lines *Bridal · Evening · Couture*
- the call to action *"Book your dream dress"*
- the handle *@eliteevening.design*
- the telephone *+972 53-468-0084* (also the WhatsApp line)
- the address *Herzl 40, Lod* — *הרצל 40, לוד*

Everything else — the introductions, the collection descriptions, the look notes, the
five bespoke stages, the About page — is **house voice written to sound like the
brand**, and it is yours to rewrite. It deliberately contains no awards, no client
names, no prices, no dates and no years of experience, because none has
been published. If you add any of those, add facts you can stand behind.

### Naming looks

Looks are numbered (*Look 01*, *Look 02*) rather than named, because no design names
have been published. To use real names, add a `name` to the entries in
`src/data/looks.ts` and render it in place of `lookTitle(look)` in
`src/components/LookCard.astro` and `src/pages/looks/[slug].astro`.

---

### Adding a fourth line

1. Add an entry to `collections` in `src/data/collections.ts`.
2. Add its look notes to `NOTES` in `src/data/looks.ts`, keyed by the same slug.

The route, the navigation, the gallery filter, the footer, the sitemap and the
structured data all pick it up automatically.

---

---

## Before going live

- [ ] Set the real domain (`SITE_URL`, see README).
- [ ] Add the hero photograph and at least one image per collection.
- [ ] Confirm the WhatsApp line is active on +972 53-468-0084.
- [ ] Add an email address in `src/config/site.ts` if the atelier wants one shown.
- [ ] Point the enquiry form at an endpoint, or add an email address.
- [ ] Re-read the About and Bespoke copy and make it true to how you actually work.
