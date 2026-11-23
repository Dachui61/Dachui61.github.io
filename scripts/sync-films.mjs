#!/usr/bin/env node
/**
 * Turn daily-hot-video episodes into catalogue entries for the site.
 *
 * Reads each episode's brief.md (metadata), audio/narration.segments.json
 * (the narration transcript, timestamped against the real recorded audio) and
 * research/sources.md (the source list, including the sources that could not
 * be fetched), then writes content/films/<slug>.md.
 *
 * Usage:
 *   node scripts/sync-films.mjs [--episodes <dir>]
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, '..');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const EPISODES = arg('--episodes', '/Users/liuyu/Documents/motions/daily-hot-video/episodes');
const OUT = join(siteRoot, 'content/films');

/**
 * The video lives in a GitHub Release, not in this repository: a single file
 * over 100 MB is rejected by GitHub, and daily episodes would push the repo
 * past the size it should be. The release URL is derived from the slug, so
 * publishing an episode never touches the content file.
 */
const RELEASE_REPO = 'Dachui61/daily-hot-video';
const releaseUrl = (slug) =>
  `https://github.com/${RELEASE_REPO}/releases/download/${slug}/${slug}.mp4`;

/** Pull one field out of brief.md. Handles both the old and new label shapes. */
function field(brief, label) {
  const m = brief.match(new RegExp(`^${label}[^\\n：:]*[：:]\\s*(.+)$`, 'm'));
  return m ? m[1].replace(/\*\*/g, '').trim() : '';
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

const y = (v) => JSON.stringify(String(v ?? ''));

async function build() {
  if (!existsSync(EPISODES)) {
    console.log(`! 找不到 episodes 目录：${EPISODES}`);
    return;
  }
  await mkdir(OUT, { recursive: true });

  const dirs = (await readdir(EPISODES, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let n = 0;
  for (const slug of dirs) {
    const ep = join(EPISODES, slug);
    const briefFile = join(ep, 'brief.md');
    if (!existsSync(briefFile)) continue;

    const brief = await readFile(briefFile, 'utf8');
    const title = field(brief, '主题').replace(/[。.]$/, '');
    if (!title) continue;

    const oneLiner = field(brief, '观众记住的一句话');
    const spec = field(brief, '规格');
    const audience = field(brief, '受众 / 平台');
    const basis = field(brief, '内容依据');
    const brand = field(brief, '品牌');
    const style = field(brief, '风格');

    const date = brief.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? slug.slice(0, 10);
    const episode = brief.match(/第\s*(\d+)\s*期/)?.[1];

    const secs = spec.match(/(\d+(?:\.\d+)?)\s*秒/)?.[1];
    const res = spec.match(/(\d{3,4})\s*[×x]\s*(\d{3,4})/);
    const fps = spec.match(/(\d+)\s*fps/)?.[1];

    // The narration transcript: real audio timings, not estimated from字数.
    let segs = [];
    const segFile = join(ep, 'audio/narration.segments.json');
    if (existsSync(segFile)) {
      const raw = JSON.parse(await readFile(segFile, 'utf8'));
      segs = (Array.isArray(raw) ? raw : raw.segments ?? []).map((s) => ({
        text: s.text ?? '',
        start: Number(s.start ?? 0),
      }));
    }

    const sourcesFile = join(ep, 'research/sources.md');
    let sources = '';
    if (existsSync(sourcesFile)) {
      const raw = await readFile(sourcesFile, 'utf8');
      const table = raw.split('\n').filter((l) => l.startsWith('|') || l.startsWith('## '));
      const failedAt = raw.indexOf('## 检索失败');
      const licenceAt = raw.indexOf('## 素材授权');
      const failed =
        failedAt >= 0 ? raw.slice(failedAt, licenceAt > failedAt ? licenceAt : undefined).trim() : '';
      const licence = licenceAt >= 0 ? raw.slice(licenceAt).trim() : '';
      sources = ['### 来源清单', '', table.join('\n'), '', failed, '', licence]
        .filter((x) => x !== '')
        .join('\n');
    }

    const fm = [
      '---',
      `slug: ${y(slug)}`,
      `title: ${y(title)}`,
      `date: ${y(date)}`,
      episode ? `episode: ${episode}` : null,
      `oneLiner: ${y(oneLiner)}`,
      secs ? `seconds: ${secs}` : null,
      res ? `resolution: ${y(`${res[1]}x${res[2]}`)}` : null,
      fps ? `fps: ${fps}` : null,
      `audience: ${y(audience)}`,
      `basis: ${y(basis)}`,
      `brand: ${y(brand)}`,
      `style: ${y(style)}`,
      `video: ${y(releaseUrl(slug))}`,
      `poster: ${y(`/media/films/${slug}-poster.webp`)}`,
      '---',
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');

    const body = [
      '## 这一期在讲什么',
      '',
      oneLiner || title,
      '',
      '## 口播稿',
      '',
      '> 时间轴由 `ffprobe` 对真实配音逐段实测，不是按字数估算。点时间戳跳到视频对应位置。',
      '',
      ...segs.map((c) => `- [\`${formatTime(c.start)}\`](/films/${slug}/#t=${c.start}) — ${c.text}`),
      '',
      sources,
      '',
      '## 制作说明',
      '',
      `- 规格：${spec}`,
      `- 受众 / 平台：${audience}`,
      `- 风格：${style}`,
      `- 品牌：${brand}`,
      `- 内容依据：${basis}`,
      '',
    ].join('\n');

    await writeFile(join(OUT, `${slug}.md`), `${fm}${body}\n`);
    console.log(`  ${slug}  (${segs.length} 段口播)`);
    n++;
  }
  console.log(`✓ 生成了 ${n} 期`);
}

await build();
