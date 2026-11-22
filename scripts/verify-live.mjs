import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'https://dachui61.github.io';
const OUT = '/tmp/shots-live';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// --- crawl every page the sitemap lists ---
await page.goto(`${BASE}/sitemap-index.xml`, { waitUntil: 'networkidle' });
const sm = await page.textContent('body');
const sitemapUrl = (sm.match(/<loc>([^<]+sitemap[^<]*)<\/loc>/) || [])[1];
let urls = [];
if (sitemapUrl) {
  await page.goto(sitemapUrl, { waitUntil: 'networkidle' });
  urls = [...(await page.textContent('body')).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
console.log('sitemap urls:', urls.length);

let bad = [];
for (const u of urls) {
  const res = await page.request.get(u);
  if (!res.ok()) bad.push(`${u} -> ${res.status()}`);
}
console.log('non-200 pages:', bad.length ? bad : 'none');

// --- a few pages that are NOT in the sitemap ---
for (const p of ['/llms.txt', '/robots.txt', '/pagefind/pagefind.js', '/en/', '/en/work/', '/search/', '/en/search/', '/404.html']) {
  const res = await page.request.get(BASE + p);
  console.log(`  ${p.padEnd(24)} ${res.status()}`);
}

// --- search against the live index ---
await page.goto(`${BASE}/search/`, { waitUntil: 'networkidle' });
await page.fill('#search-input', '降级');
await page.waitForTimeout(2500);
console.log('live search status :', await page.textContent('#search-status'));
console.log('live search hits   :', await page.$$eval('#search-results a', (a) => a.length));
await page.screenshot({ path: `${OUT}/live-search.png` });

// --- the Vitals source link ---
await page.goto(`${BASE}/work/vitals/`, { waitUntil: 'networkidle' });
const repoHref = await page.getAttribute('a[href*="github.com/Dachui61/Vitals"]', 'href');
console.log('Vitals repo link   :', repoHref);

// --- screenshots of the live site ---
for (const [name, path] of [
  ['live-home', '/'],
  ['live-home-en', '/en/'],
  ['live-catalog', '/work/'],
  ['live-vitals', '/work/vitals/'],
  ['live-adr', '/work/temperature-backend-and-degradation/'],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
