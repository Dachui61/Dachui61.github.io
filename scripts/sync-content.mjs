#!/usr/bin/env node
/**
 * Sync long-form content out of the working repository and into this site.
 *
 * The site's own repository is the single source of truth for what is
 * published: this script copies the research notes and decision records into
 * `content/work/` with normalised frontmatter, and copies the UI screenshots
 * into `public/images/`. The result is committed, so CI never needs the
 * working repository, the network, or any API key.
 *
 * Usage:
 *   node scripts/sync-content.mjs [--check]
 *
 *   --check   report what would change, write nothing.
 *
 * Environment:
 *   WORKSPACE  path to the working repository (default: ../)
 */

import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, '..');
const workspace = process.env.WORKSPACE ?? join(siteRoot, '..');
const checkOnly = process.argv.includes('--check');

const OVERRIDES = JSON.parse(
  await readFile(join(siteRoot, 'content/i18n/overrides.json'), 'utf8'),
);

/** Files the script owns. Anything else in content/work is hand-written. */
const GENERATED = new Set();

const log = (...args) => console.log(...args);
const changed = [];

async function writeIfChanged(path, contents) {
  const next = contents.trimEnd() + '\n';
  let current = null;
  if (existsSync(path)) current = await readFile(path, 'utf8');
  if (current === next) return false;
  changed.push(path.replace(siteRoot + '/', ''));
  if (!checkOnly) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, next);
  }
  return true;
}

/* -------------------------------------------------------------------------- */

function firstHeading(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/** The summary is the first paragraph of prose that is not a quote or a heading. */
function firstParagraph(md) {
  const body = md.replace(/^---[\s\S]*?---\n/, '');
  const blocks = body.split(/\n{2,}/);
  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;
    if (b.startsWith('#') || b.startsWith('>') || b.startsWith('```') || b.startsWith('|')) continue;
    if (b.startsWith('---')) continue;
    return b.replace(/\s+/g, ' ').trim();
  }
  return null;
}

function findDate(md) {
  const patterns = [
    /调研日期[：:]\s*(\d{4}-\d{2}-\d{2})/,
    /日期[：:]\s*(\d{4}-\d{2}-\d{2})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Slugify a title, keeping the ASCII part of Chinese-and-ASCII titles. */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* -------------------------------------------------------------------------- */

async function syncNotes() {
  const dir = join(workspace, 'research');
  if (!existsSync(dir)) {
    log(`! research/ not found at ${dir} — skipping notes`);
    return;
  }
  const files = (await readdir(dir)).filter((f) => extname(f) === '.md');

  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    const title = firstHeading(raw);
    if (!title) continue;

    const slug = basename(file, '.md');
    const override = OVERRIDES.notes?.[slug] ?? {};
    const body = raw.replace(/^#\s+.*$/m, '').trim();

    const frontmatter = {
      slug,
      kind: 'note',
      locale: 'zh',
      title,
      titleEn: override.titleEn ?? null,
      summary: override.summary ?? firstParagraph(raw) ?? '',
      summaryEn: override.summaryEn ?? null,
      group: 'verify',
      order: 0,
      date: override.date ?? findDate(raw) ?? null,
      hasBody: true,
    };

    await emit(join(siteRoot, 'content/work', `${slug}.md`), frontmatter, body);
  }
}

async function syncDecisions() {
  const dir = join(workspace, 'docs/adr');
  if (!existsSync(dir)) {
    log(`! docs/adr/ not found at ${dir} — skipping decisions`);
    return;
  }
  const files = (await readdir(dir)).filter((f) => extname(f) === '.md');

  const slugs = {
    '0001-温度后端与降级策略': 'temperature-backend-and-degradation',
    '0002-为何不引入特权组件': 'why-no-privileged-component',
    '0003-私有接口的使用与降级': 'private-apis-and-degradation',
  };

  let order = 1;
  for (const file of files.sort()) {
    const raw = await readFile(join(dir, file), 'utf8');
    const heading = firstHeading(raw);
    if (!heading) continue;

    const slug = slugs[basename(file, '.md')] ?? slugify(heading.replace(/^\d+\.\s*/, ''));
    const override = OVERRIDES.decisions?.[slug] ?? {};

    // Drop the "# 1. 温度后端与降级策略" heading; keep the status block.
    const body = raw.replace(/^#\s+.*$/m, '').trim();

    const frontmatter = {
      slug,
      kind: 'decision',
      locale: 'zh',
      title: heading.replace(/^\d+\.\s*/, ''),
      titleEn: override.titleEn ?? null,
      summary: override.summary ?? firstParagraph(raw) ?? '',
      summaryEn: override.summaryEn ?? null,
      group: 'decide',
      order: order++,
      date: override.date ?? findDate(raw) ?? null,
      status: raw.match(/状态[：:]\s*(.+)/)?.[1]?.trim() ?? null,
      statusEn: null,
      hasBody: true,
    };

    await emit(join(siteRoot, 'content/work', `${slug}.md`), frontmatter, body);
  }
}

async function syncImages() {
  const dir = join(workspace, 'prototypes');
  if (!existsSync(dir)) {
    log(`! prototypes/ not found at ${dir} — skipping images`);
    return;
  }
  const wanted = [
    'vitals-responsive-levels.png',
    'vitals-prototype.png',
    'vitals-opacity-levels.png',
  ];
  const outDir = join(siteRoot, 'public/images/vitals');
  await mkdir(outDir, { recursive: true });

  for (const file of wanted) {
    const src = join(dir, file);
    if (!existsSync(src)) continue;
    const dest = join(outDir, file);
    const a = existsSync(dest) ? await stat(dest) : null;
    const b = await stat(src);
    if (a && a.size === b.size) continue;
    changed.push(dest.replace(siteRoot + '/', ''));
    if (!checkOnly) await copyFile(src, dest);
  }
}

/* -------------------------------------------------------------------------- */

function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `\n${value.map((v) => `${pad}  - ${JSON.stringify(v)}`).join('\n')}`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return '{}';
    return `\n${entries.map(([k, v]) => `${pad}  ${k}: ${toYaml(v, indent + 2)}`).join('\n')}`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

async function emit(path, frontmatter, body) {
  GENERATED.add(path.replace(siteRoot + '/', ''));
  const yaml =
    Object.entries(frontmatter)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `${k}: ${toYaml(v)}`)
      .join('\n');
  await writeIfChanged(path, `---\n${yaml}\n---\n\n${body}`);
}

/* -------------------------------------------------------------------------- */

await syncNotes();
await syncDecisions();
await syncImages();

if (changed.length === 0) {
  log('✓ content is already in sync');
} else if (checkOnly) {
  log(`would change ${changed.length} file(s):`);
  for (const c of changed) log(`  ${c}`);
} else {
  log(`✓ synced ${changed.length} file(s):`);
  for (const c of changed) log(`  ${c}`);
}
