/**
 * Run:  npm i --no-save playwright-core && node scripts/counter-card-export.mjs
 * (after counter-card.mjs has written card.svg beside it)
 */
/**
 * What actually goes to the printer.
 *
 * The SVG is the master and has no resolution at all — it is as sharp as
 * whatever renders it. What a print shop wants is a PDF at the exact trim with
 * its bleed, so that is made here by printing the SVG in a headless browser at
 * the sheet's real millimetre size, with no page margin of its own to fight.
 * The type is already outlines, so the PDF carries no fonts and cannot be
 * substituted on someone else's machine.
 *
 * A 600 dpi raster comes with it, for a shop that would rather be handed
 * pixels — twice the 300 dpi that is normally plenty, so there is nothing to
 * argue about.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright-core';
import sharp from '/home/user/E-D/node_modules/sharp/lib/index.js';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const W_MM = 154, H_MM = 216;                 // A5 plus 3mm bleed all round
const svg = readFileSync('card.svg', 'utf8');

/* ---- the PDF, vector ---- */
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setContent(
  `<!doctype html><meta charset="utf-8">
   <style>
     @page { size: ${W_MM}mm ${H_MM}mm; margin: 0 }
     html, body { margin: 0; padding: 0; background: #131110 }
     svg { display: block; width: ${W_MM}mm; height: ${H_MM}mm }
   </style>
   ${svg}`,
  { waitUntil: 'load' },
);
await page.pdf({
  path: 'counter-card.pdf',
  width: `${W_MM}mm`,
  height: `${H_MM}mm`,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
});
await browser.close();

/* ---- the rasters ---- */
for (const [dpi, name] of [[600, 'counter-card-600dpi.png'], [300, 'counter-card-300dpi.png']]) {
  await sharp(Buffer.from(svg), { density: dpi }).png({ compressionLevel: 9 }).toFile(name);
}
await sharp(Buffer.from(svg), { density: 170 }).png().toFile('card-preview.png');

const mb = (f) => `${(statSync(f).size / 1e6).toFixed(2)} MB`;
const px = async (f) => { const { width, height } = await sharp(f).metadata(); return `${width}x${height}px`; };
console.log(`counter-card.pdf          ${W_MM}x${H_MM}mm vector, no embedded fonts   ${mb('counter-card.pdf')}`);
console.log(`counter-card-600dpi.png   ${await px('counter-card-600dpi.png')}   ${mb('counter-card-600dpi.png')}`);
console.log(`counter-card-300dpi.png   ${await px('counter-card-300dpi.png')}   ${mb('counter-card-300dpi.png')}`);
