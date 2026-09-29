/**
 * Run:  npm i --no-save jsqr && node scripts/counter-card-verify.mjs
 * (from the directory holding card.svg — see counter-card.mjs)
 */
/**
 * Does the printed thing actually scan?
 *
 * The card is rasterised at real print resolution and read back with a decoder,
 * with the monogram in place — the same pixels a phone camera would see. Then
 * again at the sizes and degradations a counter card really meets: a small
 * print, a phone held too far away, a grey photocopy, a photograph at an angle
 * to the light. A pass here is evidence; anything less is an opinion.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from '/home/user/E-D/node_modules/sharp/lib/index.js';
import jsQR from 'jsqr';

const EXPECTED = 'https://elite-evening-design.onrender.com';
const svg = readFileSync('card.svg');

const read = async (pipeline) => {
  // Round-trip through PNG so the reader always gets four channels: a greyscale
  // stage otherwise hands the decoder one, and it refuses the buffer outright.
  const png = await pipeline.png().toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const found = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return found?.data ?? null;
};

const checks = [
  ['300 dpi, as printed', () => sharp(svg, { density: 300 })],
  ['150 dpi', () => sharp(svg, { density: 150 })],
  ['72 dpi — a phone at arm’s length', () => sharp(svg, { density: 72 })],
  ['greyscale — a photocopy', () => sharp(svg, { density: 200 }).greyscale()],
  ['low contrast — bad light', () => sharp(svg, { density: 200 }).linear(0.55, 70)],
  ['blurred — a shaky hand', () => sharp(svg, { density: 200 }).blur(1.6)],
  ['half size — a business card', () => sharp(svg, { density: 300 }).resize({ width: 909 })],
];

let failed = 0;
for (const [name, make] of checks) {
  const got = await read(make());
  const ok = got === EXPECTED;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  → ${got === null ? 'did not decode' : got}`}`);
}

// A proof sheet to look at, and a print-resolution raster for a shop that
// would rather be handed pixels than vectors.
await sharp(svg, { density: 300 }).png().toFile('card-300dpi.png');
await sharp(svg, { density: 96 }).png().toFile('card-preview.png');

console.log(failed === 0
  ? `\nAll ${checks.length} decode to ${EXPECTED}`
  : `\n${failed} of ${checks.length} failed`);
process.exit(failed === 0 ? 0 : 1);
