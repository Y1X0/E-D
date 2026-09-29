/**
 * Run:  npm i --no-save qrcode wawoff2 harfbuzzjs && node scripts/counter-card.mjs
 *       CARD_URL=https://your-domain.com node scripts/counter-card.mjs
 *
 * Deliberately not a dependency of the site: these three packages are needed
 * to redraw one printed card, and adding them to package.json would put them
 * in every deploy's install for nothing.
 */
/**
 * The card that stands on the counter.
 *
 * Everything on it is vector and every letter is an outline, so a print shop
 * needs no fonts from us and nothing can reflow. The monogram is the same two
 * Cormorant contours the website draws, read out of the component rather than
 * copied, so the sign and the site cannot drift apart.
 *
 * Three things here are not a matter of taste, and the first draft got all
 * three wrong until something measured them:
 *
 *   The code is dark on light, on a light panel, with four clear modules of
 *   that light all the way round. Gold on black looks handsome in a mockup, but
 *   it is an inverted code with no quiet zone, and a good share of phones
 *   simply will not see it. The panel is the house's own paper, so the card is
 *   still the house's — it is the ground that changes, not the palette.
 *
 *   A finder — the square in three corners — is a seven-module ring exactly one
 *   module thick. Drawn with a centred stroke it comes out eight wide, and a
 *   decoder that cannot find its corners never gets as far as the data.
 *
 *   Every line is shaped by HarfBuzz rather than laid out letter by letter.
 *   Arabic letters join and change form by their neighbours and Hebrew runs
 *   right to left; a naive loop produces neither, and prints a row of
 *   disconnected shapes in the wrong order — which is not a typographic
 *   quibble but a sign the shop's own customers cannot read. Shaping also
 *   sidesteps a serializer bug in opentype.js 2.0.0, which writes NaN for
 *   whole-number coordinates at small sizes and silently truncates the word.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { decompress } from 'wawoff2';
import * as hb from 'harfbuzzjs';

const REPO = '/home/user/E-D';
const URL_ENCODED = process.env.CARD_URL || 'https://elite-evening-design.onrender.com';

/* ---- brand ---- */
const INK = '#131110';
const PAPER = '#f5f0e7';
const GOLD = '#b4945f';
const GOLD_LIT = '#c9ac79';
const ON_INK = '#efe9de';

/* ---- the sheet, in millimetres ---- */
const W = 148, H = 210, BLEED = 3;              // A5, plus bleed for a full-bleed ground
const PW = W + BLEED * 2, PH = H + BLEED * 2;
const cx = PW / 2;

/* ---- type ---- */
const load = async (file) => {
  const ttf = await decompress(readFileSync(`${REPO}/public/fonts/${file}`));
  const blob = new hb.Blob(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
  const face = new hb.Face(blob);
  return { font: new hb.Font(face), upem: face.upem };
};

const num = (v) => {
  if (!Number.isFinite(v)) throw new Error(`non-finite coordinate: ${v}`);
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * One shaped line, as outlines.
 *
 * HarfBuzz returns glyphs already in visual order — so a right-to-left line
 * comes back right to left, and joined Arabic comes back joined — with the
 * advance and any offset each one needs. Tracking is added between them, which
 * is the only liberty taken with what the shaper decided.
 */
function shaped({ font, upem }, text, size, tracking = 0) {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);

  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  const scale = size / upem;

  const missing = infos.filter((g) => g.codepoint === 0).length;
  if (missing) throw new Error(`${missing} glyph(s) missing from the font for: ${text}`);

  const parts = [];
  let x = 0;
  for (const [i, glyph] of infos.entries()) {
    const pos = positions[i];
    const d = font.glyphToPath(glyph.codepoint);
    if (d && d.length > 1) {
      if (d.includes('NaN')) throw new Error(`NaN in glyph ${glyph.codepoint}`);
      // Font outlines are y-up; the sheet is y-down.
      parts.push(`<g transform="translate(${num(x + pos.xOffset * scale)} ${num(-pos.yOffset * scale)}) scale(${num(scale)} ${num(-scale)})"><path d="${d}"/></g>`);
    }
    x += pos.xAdvance * scale + tracking;
  }
  return { svg: parts.join(''), width: Math.max(0, x - tracking) };
}

/** Centred on the sheet at a given baseline. */
function centred(face, text, size, tracking, y, fill, opacity = 1) {
  const { svg, width } = shaped(face, text, size, tracking);
  return `<g transform="translate(${num(cx - width / 2)} ${y})" fill="${fill}"${
    opacity < 1 ? ` opacity="${opacity}"` : ''}>${svg}</g>`;
}

/* ---- the monogram, taken from the site rather than retyped ---- */
const intro = readFileSync(`${REPO}/src/components/Intro.astro`, 'utf8');
const viewBox = intro.match(/viewBox="([^"]+)"/)[1];
const glyphs = [...intro.matchAll(/class="intro__glyph[^"]*"\s+d="([^"]+)"/g)].map((m) => m[1]);
if (glyphs.length !== 2) throw new Error(`expected 2 monogram contours, found ${glyphs.length}`);

const [vbX, vbY, vbW, vbH] = viewBox.split(/\s+/).map(Number);
const mark = (x, y, width, fill) => {
  const s = width / vbW;
  return `<g transform="translate(${num(x - width / 2)} ${num(y - (vbH * s) / 2)}) scale(${s.toFixed(6)}) translate(${-vbX} ${-vbY})" fill="${fill}">`
    + glyphs.map((d) => `<path d="${d}"/>`).join('')
    + '</g>';
};

/* ---- the code ---- */
const qr = QRCode.create(URL_ENCODED, { errorCorrectionLevel: 'H' });
const N = qr.modules.size;
const bit = (r, c) => qr.modules.data[r * N + c] === 1;

const QUIET = 4;                                  // modules of clear paper, as the standard asks
const PANEL = 82;                                 // mm of printed panel
const m = PANEL / (N + QUIET * 2);                // one module
const panelX = cx - PANEL / 2, panelY = 94;
const qrX = panelX + QUIET * m, qrY = panelY + QUIET * m;

const FINDER = 7;
const inFinder = (r, c) =>
  (r < FINDER && c < FINDER) || (r < FINDER && c >= N - FINDER) || (r >= N - FINDER && c < FINDER);

// The seal sits in the middle over a cleared square. Error correction level H
// recovers thirty per cent of the code; this clears a fraction of that, and the
// decode at the end is what actually settles it.
const clearSide = 2 * Math.floor((N * 0.12) / 2) + 1;    // odd, so it centres on a module
const clearFrom = (N - clearSide) / 2, clearTo = clearFrom + clearSide;
const cleared = (r, c) => r >= clearFrom && r < clearTo && c >= clearFrom && c < clearTo;
const coverage = ((clearSide ** 2) / (N ** 2) * 100).toFixed(1);

const dots = [];
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    if (!bit(r, c) || inFinder(r, c) || cleared(r, c)) continue;
    dots.push(`<rect x="${num(qrX + c * m)}" y="${num(qrY + r * m)}" width="${num(m)}" height="${num(m)}" rx="${num(m * 0.16)}"/>`);
  }
}

/** Seven modules across: a one-module ring, one module clear, a three-module eye. */
const finder = (r, c) => {
  const x = qrX + c * m, y = qrY + r * m;
  return '<g>'
    + `<rect x="${num(x + m / 2)}" y="${num(y + m / 2)}" width="${num(m * 6)}" height="${num(m * 6)}" rx="${num(m * 0.9)}" fill="none" stroke="${INK}" stroke-width="${num(m)}"/>`
    + `<rect x="${num(x + m * 2)}" y="${num(y + m * 2)}" width="${num(m * 3)}" height="${num(m * 3)}" rx="${num(m * 0.5)}" fill="${INK}"/>`
    + '</g>';
};

/* ---- the sheet ---- */
const cormorant = await load('cormorant-garamond-300-latin.woff2');
const jost = await load('jost-300-latin.woff2');
const amiri = await load('amiri-400-arabic.woff2');
const frank = await load('frank-ruhl-libre-300-hebrew.woff2');

const sealSide = clearSide * m * 0.94;
const sealX = qrX + clearFrom * m + (clearSide * m - sealSide) / 2;
const sealY = qrY + clearFrom * m + (clearSide * m - sealSide) / 2;

const svg = `<svg xmlns="http://www.w3.org/2000/svg"
  width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}">
  <title>Elite Evening Design — counter card</title>
  <desc>A5 with 3mm bleed. All type is outlined; no fonts are required to print this.</desc>

  <!-- the ground, carried into the bleed -->
  <rect width="${PW}" height="${PH}" fill="${INK}"/>

  <!-- a hairline frame, inside the trim -->
  <rect x="${BLEED + 7}" y="${BLEED + 7}" width="${W - 14}" height="${H - 14}"
        fill="none" stroke="${GOLD}" stroke-width="0.22" opacity=".45"/>

  <!-- the house -->
  ${mark(cx, 34, 26, GOLD_LIT)}
  ${centred(cormorant, 'ELITE EVENING', 9.6, 1.5, 58, ON_INK)}
  ${centred(jost, 'DESIGN', 3.5, 2.6, 66, GOLD_LIT)}
  <g opacity=".5">
    <line x1="${cx - 26}" y1="72" x2="${cx - 5}" y2="72" stroke="${GOLD}" stroke-width="0.3"/>
    <line x1="${cx + 5}" y1="72" x2="${cx + 26}" y2="72" stroke="${GOLD}" stroke-width="0.3"/>
  </g>
  ${centred(jost, 'WHERE ELEGANCE MEETS LUXURY', 2.9, 1.5, 80, ON_INK, 0.72)}

  <!-- the code: dark on the house's own paper, with its quiet zone intact -->
  <rect x="${num(panelX - 2.2)}" y="${num(panelY - 2.2)}" width="${num(PANEL + 4.4)}" height="${num(PANEL + 4.4)}" rx="4" fill="none" stroke="${GOLD}" stroke-width="0.4" opacity=".8"/>
  <rect x="${num(panelX)}" y="${num(panelY)}" width="${PANEL}" height="${PANEL}" rx="2.5" fill="${PAPER}"/>
  <g fill="${INK}">${dots.join('')}</g>
  ${finder(0, 0)}${finder(0, N - FINDER)}${finder(N - FINDER, 0)}

  <!-- the seal, in the cleared middle -->
  <rect x="${num(sealX)}" y="${num(sealY)}" width="${num(sealSide)}" height="${num(sealSide)}" rx="${num(sealSide * 0.16)}" fill="${INK}"/>
  ${mark(sealX + sealSide / 2, sealY + sealSide / 2, sealSide * 0.62, GOLD_LIT)}

  <!-- what to do with it, in the three languages the shop speaks -->
  ${centred(jost, 'SCAN TO VISIT OUR ATELIER ONLINE', 3.1, 1.35, 187, ON_INK)}
  ${centred(amiri, 'امسحي الرمز لزيارة الأتيليه', 4.6, 0, 195.5, GOLD_LIT, 0.9)}
  ${centred(frank, 'סרקו לביקור באתר', 3.6, 0, 202.5, GOLD_LIT, 0.9)}

  ${centred(jost, URL_ENCODED.replace(/^https:\/\//, ''), 2.5, 0.7, 210.5, ON_INK, 0.55)}
</svg>
`;

if (svg.includes('NaN')) throw new Error('NaN reached the artwork');
writeFileSync('card.svg', svg);

console.log(`url      ${URL_ENCODED}`);
console.log(`code     version ${qr.version}, ${N}x${N} modules at ${m.toFixed(2)}mm`);
console.log(`seal     clears ${clearSide}x${clearSide} = ${coverage}% of the code (ECC H recovers 30%)`);
console.log(`panel    ${PANEL}mm with a ${QUIET}-module quiet zone`);
console.log(`sheet    ${PW}x${PH}mm (A5 ${W}x${H} + ${BLEED}mm bleed)`);
console.log('type     shaped by HarfBuzz; no NaN, no missing glyphs');
