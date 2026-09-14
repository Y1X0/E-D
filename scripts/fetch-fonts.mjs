/**
 * Downloads the self-hosted webfonts into public/fonts and writes
 * src/styles/fonts.css. Run with: node scripts/fetch-fonts.mjs
 *
 * Latin  — Cormorant Garamond (display) + Jost (interface)
 * Hebrew — Frank Ruhl Libre (display) + Assistant (interface)
 * Arabic — Amiri (display) + Tajawal (interface)
 *
 * Each face keeps its unicode-range, so a visitor only ever downloads the
 * script the page is actually written in.
 */
import fs from 'node:fs/promises';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const FAMILIES = [
  { q: 'Cormorant+Garamond:ital,wght@0,300;0,400;1,300', subsets: ['latin', 'latin-ext'] },
  { q: 'Jost:wght@300;400', subsets: ['latin', 'latin-ext'] },
  { q: 'Frank+Ruhl+Libre:wght@300;400', subsets: ['hebrew'] },
  { q: 'Assistant:wght@300;400', subsets: ['hebrew', 'latin'] },
  { q: 'Amiri:wght@400', subsets: ['arabic'] },
  { q: 'Tajawal:wght@300;400', subsets: ['arabic', 'latin'] },
];

let css = `/* Self-hosted brand typefaces — Latin, Hebrew and Arabic.
   Each face keeps its unicode-range, so only the script in use is downloaded.
   Regenerate with \`node scripts/fetch-fonts.mjs\`. */\n\n`;
let total = 0;

for (const fam of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.q}&display=swap`;
  const sheet = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  for (const block of sheet.split('/*').slice(1).map((b) => '/*' + b)) {
    const subset = block.match(/^\/\*\s*([\w-]+)\s*\*\//)?.[1];
    if (!subset || !fam.subsets.includes(subset)) continue;
    const family = block.match(/font-family:\s*'([^']+)'/)[1];
    const style = block.match(/font-style:\s*(\w+)/)[1];
    const weight = block.match(/font-weight:\s*(\d+)/)[1];
    const src = block.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const range = block.match(/unicode-range:\s*([^;]+);/)[1];
    const slug = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
    const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
    await fs.writeFile(`public/fonts/${slug}`, buf);
    css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url('/fonts/${slug}') format('woff2');unicode-range:${range}}\n`;
    total += buf.length;
    console.log(slug.padEnd(44), (buf.length / 1024).toFixed(1) + ' kB');
  }
}
await fs.writeFile('src/styles/fonts.css', css);
console.log('\ntotal on disk:', (total / 1024).toFixed(0) + ' kB  →  src/styles/fonts.css');
