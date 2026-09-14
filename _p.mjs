import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-E-D/b79f7199-4568-57d8-a587-57ed30039ea6/scratchpad/final';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const shots = [
  [1440, 900, '/collections/evening', 0.16, 'photo-evening'],
  [1440, 900, '/', 0.38, 'photo-home'],
  [390, 844, '/collections/evening', 0.14, 'photo-evening-mobile'],
];
for (const [w, h, route, frac, name] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4340' + route, { waitUntil: 'networkidle' });
  await p.evaluate(async (f) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const s = Math.round(window.innerHeight * 0.75);
    for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); }
    window.scrollTo(0, Math.round((document.body.scrollHeight - window.innerHeight) * f));
  }, frac);
  await p.waitForTimeout(550);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}
await b.close(); console.log('captured');
