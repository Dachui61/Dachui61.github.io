# Dachui61.github.io

The source of <https://dachui61.github.io/> — a bilingual (中文 / English)
personal site for 刘宇 (Dachui61).

It presents the projects, research notes and engineering decision records of
one person: a macOS monitor called **Vitals**, a daily-digest tool called
**Radar** that is still being designed, and the writing that came out of
building them.

---

## Stack

| | |
|---|---|
| Framework | [Astro 7](https://astro.build) — `output: 'static'`, zero JS by default |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`, CSS-first `@theme` tokens |
| Content | `astro:content` collections, Markdown with frontmatter |
| Fonts | [DM Sans](https://fonts.google.com/specimen/DM+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono), Source Serif 4 — all self-hosted via `@fontsource-variable`, no CDN |
| Search | [Pagefind](https://pagefind.app) — a static index built at deploy time |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Language | TypeScript (strict) |

## Getting started

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # static build into dist/
pnpm preview      # serve the built output
```

## Layout

```
src/
  components/     Home, Catalog, Entry, Header, Footer
  layouts/        Base (document shell)
  lib/            entries.ts (collection helpers), groups.ts, toolchain.ts
  i18n/           locale strings and path helpers
  pages/          routes; src/pages/en/** is the English mirror
  styles/         global.css — the design tokens live here
content/
  work/           one Markdown file per catalogue entry
  i18n/           overrides.json — hand-written English titles and summaries
scripts/
  sync-content.mjs  copies research notes and decision records in from the
                    working repository
docs/adr/         the decisions behind this site
```

## Content workflow

Long-form content is written in a separate working repository and synced
into `content/work/` here, then committed. The build reads only this
repository, so it is reproducible and needs no credentials.

```bash
WORKSPACE=/path/to/working-repo pnpm sync          # pull content in
WORKSPACE=/path/to/working-repo pnpm sync:check    # report drift, write nothing
```

The script writes only files it owns. Hand-written entries (`vitals.md`,
`radar.md`) are never touched.

English titles and summaries are hand-written in `content/i18n/overrides.json`.
They are not machine-translated — a machine translation of a research note
would misrepresent the source, which is the one thing this site tries not to
do.

## Deploying

`main` → GitHub Actions → GitHub Pages. The workflow is in
`.github/workflows/deploy.yml`; it builds with the `site` and `base` values
that `actions/configure-pages` reports, so a fork that becomes a project site
still builds correctly.

To turn Pages on for a fork: **Settings → Pages → Build and deployment →
Source → GitHub Actions**.

## Licence

Content is © 刘宇. The code in this repository is MIT licensed unless a
file says otherwise. Third-party tools listed on the site belong to their
authors and are credited with their own licences.
