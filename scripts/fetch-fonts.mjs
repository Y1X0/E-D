import fs from 'node:fs/promises';
const URL_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@300;400&display=swap';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const css = await (await fetch(URL_CSS, { headers: { 'User-Agent': UA } })).text();

const blocks = css.split('/*').slice(1).map(b => '/*' + b);
const wanted = blocks.filter(b => /^\/\*\s*(latin|latin-ext)\s*\*\//.test(b));
let out = `/* Self-hosted brand typefaces. Cormorant Garamond (display) + Jost (interface).
   Subsets: latin, latin-ext. Regenerate with \`node _fonts.mjs\`. */\n\n`;
let count = 0;
for (const b of wanted) {
  const fam = b.match(/font-family:\s*'([^']+)'/)[1];
  const style = b.match(/font-style:\s*(\w+)/)[1];
  const weight = b.match(/font-weight:\s*(\d+)/)[1];
  const url = b.match(/url\((https:[^)]+\.woff2)\)/)[1];
  const subset = b.match(/^\/\*\s*([\w-]+)\s*\*\//)[1];
  const slug = `${fam.toLowerCase().replace(/\s+/g, '-')}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  await fs.writeFile(`public/fonts/${slug}`, buf);
  const range = b.match(/unicode-range:\s*([^;]+);/)[1];
  out += `@font-face{font-family:'${fam}';font-style:${style};font-weight:${weight};font-display:swap;src:url('/fonts/${slug}') format('woff2');unicode-range:${range}}\n`;
  count++;
  console.log(slug.padEnd(42), (buf.length / 1024).toFixed(1) + ' kB');
}
await fs.writeFile('src/styles/fonts.css', out);
console.log('\n' + count + ' faces →  src/styles/fonts.css');
