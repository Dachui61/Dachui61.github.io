import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = '/tmp/shots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// --- visual ---
for (const shot of [
  { name: '01-home-top', url: '/' },
  { name: '03-catalog', url: '/work/' },
  { name: '04-entry-vitals', url: '/work/vitals/' },
  { name: '05-entry-adr', url: '/work/temperature-backend-and-degradation/' },
  { name: '06-home-en', url: '/en/' },
  { name: '07-entry-note', url: '/work/oss-hotlist-aggregation-landscape/' },
]) {
  await page.goto(BASE + shot.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
}

// --- search actually returns results ---
await page.goto(BASE + '/search/', { waitUntil: 'networkidle' });
await page.fill('#search-input', '温度');
await page.waitForTimeout(1500);
const status = await page.textContent('#search-status');
const results = await page.$$eval('#search-results a', (as) => as.map((a) => a.textContent));
console.log('search status :', status);
console.log('search results:', results.length, results.slice(0, 4));
await page.screenshot({ path: `${OUT}/10-search.png` });

// --- language switch preserves the page ---
await page.goto(BASE + '/work/temperature-backend-and-degradation/', { waitUntil: 'networkidle' });
await page.click('a[hreflang="en"]');
await page.waitForLoadState('networkidle');
console.log('after EN switch:', page.url());
console.log('h1 on EN page  :', await page.textContent('h1'));

// --- theme toggle round trip ---
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const before = await page.getAttribute('html', 'data-theme');
await page.click('#theme-toggle');
await page.waitForTimeout(200);
const after = await page.getAttribute('html', 'data-theme');
console.log('theme:', before, '->', after);

// --- every internal link resolves ---
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const hrefs = await page.$$eval('a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
let broken = [];
for (const href of hrefs) {
  const url = new URL(href, BASE).href;
  const res = await page.request.get(url);
  if (!res.ok()) broken.push(`${href} -> ${res.status()}`);
}
console.log(`checked ${hrefs.length} internal links, broken:`, broken.length ? broken : 'none');

// --- console errors ---
console.log('console errors:', errors.length ? errors : 'none');

await browser.close();
