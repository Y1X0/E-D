# Photography

Drop image files into this folder, then reference them from `src/data/*.ts`.

    src/assets/images/bridal/look-01.jpg   →   src: 'bridal/look-01.jpg'

Astro generates responsive WebP variants, sets intrinsic dimensions and lazy-loads
everything below the fold at build time. A `src` with no matching file falls back
to the designed stand-in panel, so the site never shows a broken image.

See ../../../CONTENT.md for the full guide.
