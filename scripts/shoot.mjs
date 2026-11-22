import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = '/tmp/shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const shots = [
  { name: '01-home-top', url: '/', full: false },
  { name: '02-home-full', url: '/', full: true },
  { name: '03-catalog', url: '/work/', full: false },
  { name: '04-entry-vitals', url: '/work/vitals/', full: false },
  { name: '05-entry-adr', url: '/work/temperature-backend-and-degradation/', full: false },
  { name: '06-home-en', url: '/en/', full: false },
  { name: '07-entry-note', url: '/work/oss-hotlist-aggregation-landscape/', full: false },
];

for (const shot of shots) {
  await page.goto(BASE + shot.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.full });
  console.log('shot', shot.name);
}

// Light theme
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.click('#theme-toggle');
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/08-home-light.png` });
console.log('shot 08-home-light');

// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
const mp = await m.newPage();
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
await mp.screenshot({ path: `${OUT}/09-home-mobile.png` });
console.log('shot 09-home-mobile');

await browser.close();
console.log('done');
