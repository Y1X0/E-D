/**
 * Regenerates every brand asset in `public/` from the supplied logo sheet.
 *
 *   LOGO=path/to/logo.jpg node scripts/build-brand-assets.mjs
 *
 * The logo is a photograph of the gold monogram embossed on cream paper, so the
 * assets are cut from it rather than redrawn:
 *
 *   brand/mark*.webp   the monogram with a transparent ground, masked from its own
 *                      chroma, so it sits on any colour without a pasted-on plate
 *   brand/seal.webp    the monogram on a circular paper plate (footer, about)
 *   brand/icon-*.png   app icons  ·  apple-touch-icon.png  ·  favicon-32.png
 *   og.jpg             the 1200×630 social card
 */
import sharp from 'sharp';

const SRC = process.env.LOGO ?? 'brand-source/logo.jpg';

/* Regions of the source sheet, in source pixels. */
const MARK = { left: 410, top: 140, width: 214, height: 198 };   // monogram, tight
const SEAL = { left: 405, top: 135, width: 224, height: 206 };   // monogram + paper margin
const ICON = { left: 399, top: 129, width: 236, height: 218 };
const LOCK = { left: 300, top: 118, width: 440, height: 332 };   // monogram + wordmark

const smoothstep = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── 1. the monogram, cut free of its paper ──────────────────────────────────
const { data, info } = await sharp(SRC).extract(MARK).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const alpha = new Float32Array(W * H);
for (let i = 0, p = 0; i < data.length; i += C, p++) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  alpha[p] = Math.max(smoothstep(sat, 20, 48), 1 - smoothstep(lum, 118, 168));
}
const window2 = (src, radius, pick) => {
  const out = new Float32Array(src.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const vals = [];
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = Math.min(H - 1, Math.max(0, y + dy));
          const xx = Math.min(W - 1, Math.max(0, x + dx));
          vals.push(src[yy * W + xx]);
        }
      out[y * W + x] = pick(vals);
    }
  return out;
};
const dilated = window2(alpha, 1, (v) => Math.max(...v));                    // close specular holes
const blurred = window2(dilated, 1, (v) => v.reduce((a, c) => a + c, 0) / v.length);
const mask = Buffer.alloc(W * H);
for (let p = 0; p < blurred.length; p++)                                     // gamma thins the paper fringe
  mask[p] = Math.round(255 * Math.min(1, Math.pow(blurred[p], 2.1)));

const cut = await sharp(SRC).extract(MARK).ensureAlpha()
  .joinChannel(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
await sharp(cut).resize({ width: 160, kernel: 'lanczos3' })
  .webp({ quality: 58, effort: 6, alphaQuality: 78 }).toFile('public/brand/mark-160.webp');

// ── 2. the circular seal ────────────────────────────────────────────────────
const PAPER = { r: 0xe7, g: 0xe0, b: 0xd4 };
const feather = Buffer.from(
  `<svg width="${SEAL.width}" height="${SEAL.height}">
     <defs><filter id="b"><feGaussianBlur stdDeviation="7"/></filter></defs>
     <rect x="13" y="13" width="${SEAL.width - 26}" height="${SEAL.height - 26}" rx="24" fill="#fff" filter="url(#b)"/>
   </svg>`);
const sealMark = await sharp(SRC).extract(SEAL).composite([{ input: feather, blend: 'dest-in' }]).png().toBuffer();
const D = 512, MW = Math.round(D * 0.6);
const scaled = await sharp(sealMark).resize({ width: MW }).toBuffer();
const sh = (await sharp(scaled).metadata()).height;
await sharp(Buffer.from(
  `<svg width="${D}" height="${D}">
     <defs><radialGradient id="p" cx="42%" cy="34%" r="78%">
       <stop offset="0%" stop-color="#efe9df"/><stop offset="58%" stop-color="#e7e0d4"/>
       <stop offset="100%" stop-color="#d5cbbd"/></radialGradient></defs>
     <circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="url(#p)"/></svg>`))
  .composite([
    { input: scaled, left: Math.round((D - MW) / 2), top: Math.round((D - sh) / 2) },
    { input: Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`), blend: 'dest-in' },
  ])
  .png().toBuffer()
  .then((buf) => sharp(buf).resize(320, 320, { kernel: 'lanczos3' })
    .webp({ quality: 84, effort: 6 }).toFile('public/brand/seal.webp'));

// ── 3. icons ────────────────────────────────────────────────────────────────
const iconSrc = await sharp(SRC).extract(ICON)
  .extend({ top: 9, bottom: 9, left: 0, right: 0, background: PAPER }).toBuffer();
for (const [size, out] of [[512, 'public/brand/icon-512.png'], [192, 'public/brand/icon-192.png'],
                           [180, 'public/apple-touch-icon.png'], [32, 'public/favicon-32.png']])
  await sharp(iconSrc).resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
    .png({ palette: true, quality: 90, effort: 9 }).toFile(out);

// ── 4. the social card ──────────────────────────────────────────────────────
const OGW = 1200, OGH = 630, TW = 780, FEATHER = 74;
const ring = [0, 0, 0]; let n = 0;
{
  const { data: d2, info: i2 } = await sharp(SRC).extract(LOCK).raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < i2.height; y++)
    for (let x = 0; x < i2.width; x++) {
      if (x > 5 && x < i2.width - 6 && y > 5 && y < i2.height - 6) continue;
      const i = (y * i2.width + x) * i2.channels;
      ring[0] += d2[i]; ring[1] += d2[i + 1]; ring[2] += d2[i + 2]; n++;
    }
}
const ground = ring.map((v) => Math.round(v / n));
const plate = await sharp(SRC).extract(LOCK).resize({ width: TW, kernel: 'lanczos3' }).toBuffer();
const pm = await sharp(plate).metadata();
const ramp = Buffer.alloc(pm.width * pm.height);
for (let y = 0; y < pm.height; y++)
  for (let x = 0; x < pm.width; x++) {
    const d = Math.min(x, y, pm.width - 1 - x, pm.height - 1 - y);
    ramp[y * pm.width + x] = Math.round(255 * smoothstep(d, 0, FEATHER));
  }
const softPlate = await sharp(plate).ensureAlpha()
  .joinChannel(ramp, { raw: { width: pm.width, height: pm.height, channels: 1 } }).png().toBuffer();
const base = await sharp({ create: { width: OGW, height: OGH, channels: 3, background: { r: ground[0], g: ground[1], b: ground[2] } } })
  .composite([{ input: softPlate, left: Math.round((OGW - pm.width) / 2), top: Math.round((OGH - pm.height) / 2) }])
  .png().toBuffer();
await sharp(base).composite([
    { input: Buffer.from(`<svg width="${OGW}" height="${OGH}"><defs><radialGradient id="v" cx="50%" cy="46%" r="78%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="58%" stop-color="#fdfaf4"/>
        <stop offset="100%" stop-color="#d2c9bb"/></radialGradient></defs>
      <rect width="${OGW}" height="${OGH}" fill="url(#v)"/></svg>`), blend: 'multiply' },
    { input: Buffer.from(`<svg width="${OGW}" height="${OGH}"><rect x="44" y="44" width="${OGW - 88}" height="${OGH - 88}"
        fill="none" stroke="#8a6a3e" stroke-opacity="0.34" stroke-width="1"/></svg>`) },
  ]).jpeg({ quality: 90, mozjpeg: true }).toFile('public/og.jpg');

console.log('brand assets regenerated');
