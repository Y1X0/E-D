import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-E-D/b79f7199-4568-57d8-a587-57ed30039ea6/scratchpad/final';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://localhost:4340/collections/evening', { waitUntil: 'networkidle' });
await p.evaluate(() => document.querySelectorAll('.reveal,.draw,.wipe').forEach((e) => e.classList.add('is-in')));
await p.waitForTimeout(500);
// the plate on its own, to judge the crop
await p.locator('.intro__media .plate').screenshot({ path: `${OUT}/crop-check.png` });
const box = await p.locator('.intro__media .plate').boundingBox();
console.log('plate rendered at', Math.round(box.width) + ' x ' + Math.round(box.height));
// the homepage card, at its real size
await p.goto('http://localhost:4340/', { waitUntil: 'networkidle' });
await p.evaluate(() => document.querySelectorAll('.reveal,.draw,.wipe').forEach((e) => e.classList.add('is-in')));
await p.waitForTimeout(400);
const card = p.locator('.lines__item').nth(1);
await card.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await card.screenshot({ path: `${OUT}/crop-card.png` });
const cb = await card.locator('.plate').boundingBox();
console.log('home card plate at', Math.round(cb.width) + ' x ' + Math.round(cb.height));
await b.close();
