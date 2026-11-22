# Astro 7.4.13 — verified API facts (extracted from official docs + the published package)

**Version check:** npm `astro` `dist-tags.latest` = **7.4.13** (exact match to your version). Sources: `withastro/docs` `main` branch (the live v7 docs), plus the published `astro@7.4.13` tarball inspected directly (`dist/types/public/config.d.ts`, `dist/content/runtime.js`, `dist/cli/add/index.js`, `types/content.d.ts`).

---

## A. i18n config

### `astro.config.mjs` — base shape (verbatim from the i18n guide)

```js title="astro.config.mjs"
import { defineConfig } from "astro/config"
export default defineConfig({
  i18n: {
    locales: ["es", "en", "pt-br"],
    defaultLocale: "en",
  }
})
```

### Full object shape (verbatim from the configuration reference)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr", "pt-br", "es"],
    fallback: {
      "pt-br": "es",
      fr: "en"
    },
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true,
      fallbackType: "redirect",
    },
    domains: {
      fr: "https://fr.example.com",
      es: "https://example.es"
    }
  }
});
```

### Defaults table (verbatim from `/en/reference/configuration-reference/#i18n`)

| Option | Type | Default | Since |
|---|---|---|---|
| `i18n.locales` | `Locales` | **required** | 3.5.0 |
| `i18n.defaultLocale` | `string` | **required** | 3.5.0 |
| `i18n.fallback` | `Record<string, string>` | none (unavailable pages → 404) | 3.5.0 |
| `i18n.routing` | `object \| "manual"` | `object` | 3.7.0 |
| `i18n.routing.prefixDefaultLocale` | `boolean` | `false` | 3.7.0 |
| `i18n.routing.redirectToDefaultLocale` | `boolean` | `false` | 4.2.0 |
| `i18n.routing.fallbackType` | `"redirect" \| "rewrite"` | `"redirect"` | 4.15.0 |
| `i18n.domains` | `Record<string, string>` | `{}` | 4.3.0 |

### Exact TypeScript type (from `astro@7.4.13` `dist/types/public/config.d.ts`, lines 2590–2839)

```ts
i18n?: {
    locales: [TLocales] extends [never] ? Locales : TLocales;
    defaultLocale: [TLocales] extends [never] ? string : NormalizeLocales<NoInfer<TLocales>>;
    fallback?: [TLocales] extends [never] ? Record<string, string> : {
        [Locale in NormalizeLocales<NoInfer<TLocales>>]?: Exclude<NormalizeLocales<NoInfer<TLocales>>, Locale>;
    };
    routing?: {
        prefixDefaultLocale?: boolean;
        redirectToDefaultLocale?: boolean;
        fallbackType?: 'redirect' | 'rewrite';
    } | 'manual';
    domains?: [TLocales] extends [never] ? Record<string, string> : Partial<Record<NormalizeLocales<NoInfer<TLocales>>, string>>;
};
```

`routing: "manual"` disables Astro's i18n middleware entirely; **no other `routing` options may be configured with it**.

### Directory → locale mapping

Verbatim from the guide: *"Create individual `/[locale]/` folders anywhere within `src/pages/`… Your folder names must match the items in `locales` exactly. Include a localized folder for your `defaultLocale` only if you configure `prefixDefaultLocale: true`."*

- **A directory named `en` does NOT automatically become the `en` locale.** It only becomes the `en` locale if `"en"` is an item in `i18n.locales` **and** the folder name matches that item exactly. Otherwise it is an ordinary route segment.
- Localized folders **do not need to be at the root** of `src/pages/` (guide note: *"The localized folders do not need to be at the root of the `/pages/` folder."*).
- `prefixDefaultLocale: false` (default): default-locale files at the root of `src/pages/`; other locales in `src/pages/<locale>/`.
  - `src/pages/about.astro` → `example.com/about/`
  - `src/pages/fr/about.astro` → `example.com/fr/about/`
- `prefixDefaultLocale: true`: **all** locales including the default need localized folders; *"URLs without a locale prefix, (e.g. `example.com/about/`) will return a 404 (not found) status code unless you specify a fallback strategy."* The guide's file tree notes `src/pages/index.astro` **is always required**.
- Custom locale paths: `locales: ["es", "en", { path: "french", codes: ["fr", "fr-BR", "fr-CA"] }]` — the folder name must equal `path`, not the code.
- `i18n.domains` requires `site` + `output: "server"` + no prerendered pages.

### `Astro.currentLocale` / `Astro.preferredLocale` / `Astro.preferredLocaleList` — all still exist

From `/en/reference/api-reference/`:

- `Astro.currentLocale` — `string | undefined`, Since **3.5.6**. *"The locale computed from the current URL, using the syntax specified in your `locales` configuration. If the URL does not contain a `/[locale]/` prefix, then the value will default to `i18n.defaultLocale`."* Available on **all pages, including static prerendered pages** (confirmed empirically — see "Verified build" below).
- `Astro.preferredLocale` — `string | undefined`, Since 3.5.0. *"This property is only available for routes rendered on demand and cannot be used on prerendered, static pages."*
- `Astro.preferredLocaleList` — `string[] | undefined`, Since 3.5.0. Same restriction: **on-demand rendering only**.

> ⚠️ For a **static** GitHub Pages site, `Astro.preferredLocale` / `Astro.preferredLocaleList` are **not available** at build time. Only `Astro.currentLocale` works.

### `getRelativeLocaleUrl()` — YES, import path is **`astro:i18n`**

Full export list (verbatim from `/en/reference/modules/astro-i18n/`):

```js
import { 
  getRelativeLocaleUrl,
  getAbsoluteLocaleUrl,
  getRelativeLocaleUrlList,
  getAbsoluteLocaleUrlList,
  getPathByLocale,
  getLocaleByPath,
  redirectToDefaultLocale,
  redirectToFallback,
  notFound,
  middleware,
  requestHasLocale,
  normalizeTheLocale,
  pathHasLocale,
  toCodes,
  toPaths
 } from 'astro:i18n';
```

```astro
---
import { getRelativeLocaleUrl } from 'astro:i18n';

getRelativeLocaleUrl("fr");
// returns /fr

getRelativeLocaleUrl("fr", "");
// returns /fr/

getRelativeLocaleUrl("fr", "getting-started");
// returns /fr/getting-started

getRelativeLocaleUrl("fr_CA", "getting-started", {
  prependWith: "blog"
}); 
// returns /blog/fr-ca/getting-started

getRelativeLocaleUrl("fr_CA", "getting-started", {
  prependWith: "blog",
  normalizeLocale: false
}); 
// returns /blog/fr_CA/getting-started
---
```

Signature: `(locale: string, path?: string, options?: GetLocaleOptions) => string`. *"the returned URLs created by these functions for your `defaultLocale` will reflect your `i18n.routing` configuration."* Be aware of `base`, `trailingSlash`, `build.format`, `site`.

---

## B. `src/content.config.ts`

### Canonical example (verbatim from the content collections guide)

```ts title="src/content.config.ts"
// 1. Import utilities from `astro:content`
import { defineCollection } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Import Zod
import { z } from 'astro/zod';

// 4. Define a `loader` and `schema` for each collection
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
});

// 5. Export a single `collections` object to register your collection(s)
export const collections = { blog };
```

### `glob()` loader

```ts  title="src/content.config.ts" {5}
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/blog" }),
});

export const collections = { blog };
```

Custom IDs:

```js title="src/content.config.ts"
import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

const authors = defineCollection({
  /* Retrieve all JSON files in your authors directory while retaining
   * uppercase letters in the ID. */
  loader: glob({
    pattern: "**/*.json",
    base: "./src/data/authors",
    generateId: ({ entry }) => entry.replace(/\.json$/, ""),
  }),
});
```

### `file()` loader

```ts  title="src/content.config.ts" {5}
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';

const dogs = defineCollection({
  loader: file("src/data/dogs.json"),
});

export const collections = { dogs };
```

Each entry object in the file must have a unique `id` key.

### Zod import — `astro/zod` (NOT `astro:content`)

Guide verbatim: *"To use Zod in Astro, import the `z` utility from `"astro/zod"`. This is a re-export of the Zod library, and it supports all of the features of Zod 4."*

**Deprecated shim still present in 7.4.13** — verbatim from `astro@7.4.13` `types/content.d.ts`:

```ts
	// TODO: remove in Astro 8
	/**
	 * @deprecated
	 * `import { z } from 'astro:content'` is deprecated and will be removed
	 * in Astro 8. Use `import { z } from 'astro/zod'` instead.
	 */
	export const z = zod.z;
```

→ Use `import { z } from 'astro/zod'`. The `astro:content` form will break in Astro 8.

### `render(entry)` vs `entry.render()`

**`render(entry)` imported from `astro:content` is the current API** (Since **5.0.0**). `entry.render()` does **not** exist in Astro 7 — the `CollectionEntry` type has only `id`, `collection`, `data`, `body`, `rendered`, `filePath`. Verified in `dist/content/runtime.js` → `createRenderEntry()`.

```astro title="src/pages/blog/post-1.astro" {2,6,10}
---
import { getEntry, render } from "astro:content";

const entry = await getEntry("blog", "post-1");

if (!entry) {
  throw new Error("Entry not found");
}

const { Content } = await render(entry);
---

<h1>{entry.data.title}</h1>
<p>Published on: {entry.data.pubDate.toDateString()}</p>
<Content />
```

`render()` returns: `Content` (component), `headings`, `remarkPluginFrontmatter`.

### `getCollection()` / `getEntry()` / `getEntries()`

```astro title="src/pages/index.astro"
---
import { getCollection, getEntry } from 'astro:content';

// Get all entries from a collection.
const allBlogPosts = await getCollection('blog');

// Get a single entry from a collection.
const poodleData = await getEntry('dogs', 'poodle');
---
```

Filtering:

```astro title="src/pages/blog.astro"
---
// Example: Filter out content entries with `draft: true`
import { getCollection } from 'astro:content';
const publishedBlogEntries = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});
---
```

> The sort order of generated collections is **non-deterministic** — sort yourself:
> ```astro
> const posts = (await getCollection('blog')).sort(
>   (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
> );
> ```

### `getStaticPaths()` + `render()` (verbatim from the guide)

```astro title="src/pages/posts/[id].astro" "{ id: post.id }" "{ post }"
---
import { getCollection, render } from 'astro:content';
// 1. Generate a new path for every collection entry
export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { id: post.id },
    props: { post },
  }));
}
// 2. For your template, you can get the entry directly from the prop
const { post } = Astro.props;
const { Content } = await render(post);
---
<h1>{post.data.title}</h1>
<Content />
```

### Config file location

`src/content.config.ts` (`.js` and `.mjs` also supported; the loader in 7.4.13 also resolves `content.config.mts`). Legacy `src/content/config.ts` auto-generation is **deprecated** — the build prints: *"Auto-generating collections for folders in `src/content/` that are not defined as collections. This is deprecated, so you should define these collections yourself in `src/content.config.ts`."*

### Complete working example (verified — actually built on astro@7.4.13)

`src/content.config.ts`
```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { posts };
```

`src/content/posts/hello.md`
```md
---
title: "你好世界"
description: "第一篇文章"
pubDate: 2026-01-01
---

这是正文内容。
```

`src/pages/index.astro`
```astro
---
import { getCollection, render } from 'astro:content';
import Layout from '../layouts/Layout.astro';

const locale = Astro.currentLocale;
const posts = await getCollection('posts');
const first = posts[0];
const { Content } = await render(first);
---
<Layout title="首页">
  <p>locale: {locale}</p>
  <h1>{first.data.title}</h1>
  <Content />
</Layout>
```

Build result (real output from `astro build` on 7.4.13):
```
├─ /en/index.html (+4ms)
├─ /index.html (+1ms)
✓ 2 page(s) built
```
`dist/index.html` → `<p>locale: zh</p>` ; `dist/en/index.html` → `<p>locale: en</p>`. Tailwind v4 CSS emitted to `dist/_astro/Layout.CYjfwpw9.css` (starts `/*! tailwindcss v4.3.5 | MIT License */`).

---

## C. Tailwind CSS v4 in Astro 7

**Answer: it is the `@tailwindcss/vite` Vite plugin in `vite.plugins` — NOT a separate Astro integration.** The `@astrojs/tailwind` integration is Tailwind **3 legacy only**, and its docs page (`/en/guides/integrations-guide/tailwind/`) is now marked:

```
:::caution[Deprecated]
Tailwind CSS now offers a Vite plugin which is the preferred way to use Tailwind 4 in Astro.
:::

To use Tailwind in Astro, follow the [styling guide for Tailwind](/en/guides/styling/#tailwind).
```

### `astro add tailwind` (Astro ≥5.2) — verbatim from the styling guide

```shell
npx astro add tailwind
```
```shell
pnpm astro add tailwind
```
```shell
yarn astro add tailwind
```

### Exact `astro.config.mjs` — **empirically captured** by running `astro add tailwind` on astro@7.4.13

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  }
});
```

The CLI installs `@tailwindcss/vite@^4.x` + `tailwindcss@^4.x` (source floor `^4.0.0`; installed `^4.3.5` today) and scaffolds `src/styles/global.css`.

### CSS file — verbatim from the styling guide

```css title="src/styles/global.css"
@import "tailwindcss";
```

### Import it in the layout — verbatim

```astro title="src/layouts/Layout.astro"
---
import "../styles/global.css";
---
```

### `@theme` and `@custom-variant` — NOT in Astro's docs

I grepped `guides/styling.mdx` in the Astro docs repo: **0 matches** for `@theme`, `@custom-variant`, or `data-theme`. Astro's styling guide stops at `@import "tailwindcss";`. Those directives are **Tailwind v4 syntax** and come from tailwindcss.com. Verbatim from [tailwindcss.com/docs/dark-mode](https://tailwindcss.com/docs/dark-mode):

Dark mode via `.dark` class:
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```
```html
<html class="dark">
  <body>
    <div class="bg-white dark:bg-black">
      <!-- ... -->
    </div>
  </body>
</html>
```

Dark mode via `data-theme` attribute:
```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```
```html
<html data-theme="dark">
  <body>
    <div class="bg-white dark:bg-black">
      <!-- ... -->
    </div>
  </body>
</html>
```

`@theme` tokens — verbatim from [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme):
```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```
```html
<div class="bg-mint-500">  <!-- ... --></div>
```
```html
<div style="background-color: var(--color-mint-500)">  <!-- ... --></div>
```

Theme variable namespaces (Tailwind v4): `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*`, etc.

### Upgrading from Tailwind 3 (verbatim steps from the styling guide)

1. Add Tailwind 4 support via the CLI.
2. `npm uninstall @astrojs/tailwind`
3. Remove it from `astro.config.mjs`:
```js title="astro.config.mjs" del={2} del="tailwind()"
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // ...
  integrations: [tailwind()],
  // ...
});
```
4. Follow Tailwind's v4 upgrade guide.

---

## D. GitHub Pages deploy (Astro 7)

### Exact current workflow YAML (verbatim from `/en/guides/deploy/github/`)

```yaml title="deploy.yml"
name: Deploy to GitHub Pages

on:
  # Trigger the workflow every time you push to the `main` branch
  # Using a different branch name? Replace `main` with your branch’s name
  push:
    branches: [ main ]
  # Allows you to run this workflow manually from the Actions tab on GitHub.
  workflow_dispatch:
  
# Allow this job to clone the repo and create a page deployment
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v7
      - name: Install, build, and upload your site
        uses: withastro/action@v6
        # with:
          # path: . # The root location of your Astro project inside the repository. (optional)
          # node-version: 24 # The specific version of Node that should be used to build your site. Defaults to 24. (optional)
          # package-manager: pnpm@latest # The Node package manager that should be used to install dependencies and build your site. Automatically detected based on lockfile. (optional)
          # build-cmd: pnpm run build # The command to run to build your site. Runs the package build script/task by default. (optional)
        # env:
          # PUBLIC_POKEAPI: 'https://pokeapi.co/api/v2' # Use single quotation marks for the variable value. (optional)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

### Versions the Astro docs use NOW

| Action | Version in current Astro docs |
|---|---|
| `actions/checkout` | **v7** |
| `withastro/action` | **v6** (latest published tag: `v6.1.4`; floating major tag `v6` exists) |
| `actions/deploy-pages` | **v5** |
| `actions/configure-pages` | **NOT USED** |
| `actions/upload-pages-artifact` | **NOT USED** |

`withastro/action@v6` performs the install + build + artifact upload in one step, so `configure-pages` and `upload-pages-artifact` are not part of the current Astro-documented workflow.

Caution from the docs: *"The official Astro action scans for a lockfile to detect your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`). You should commit your package manager's automatically generated `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb` file to your repository."*

Also: GitHub repo **Settings → Pages → Source → GitHub Actions**.

### `site` and `base`

Step 2 of the docs — `site` is **required**:

```js title="astro.config.mjs" ins={4}
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://astronaut.github.io',
})
```

*"The value for `site` must be one of the following: The following URL based on your username: `https://<username>.github.io`; The random URL autogenerated for a GitHub Organization's private page: `https://<random-string>.pages.github.io/`"*

Step 3 — `base` for a **project** site:

```js title="astro.config.mjs" ins={4-5}
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://astronaut.github.io',
  base: '/my-repo',
})
```

*"GitHub Pages will publish your website at an address that depends on both your username and your repository name (e.g. `https://<username>.github.io/<my-repo>/`). Set a value for `base` that specifies the repository for your website… **You can skip this if your repository name matches the special `<username>.github.io` pattern** (e.g. `https://github.com/username/username.github.io/`)"*

**Summary:** user site (`username.github.io`) → `site` only, **no `base`**. Project site (`username.github.io/repo`) → `site` + `base: '/repo'`.

:::caution[Internal links with `base` configured]
```astro ins="/my-repo"
<a href="/my-repo/about">About</a>
```
:::

Custom domain: add `public/CNAME`, set `site` to the custom domain, **remove `base`**, and strip the `base` prefix from internal links.

---

## E. Astro 7 breaking changes

Source: `/en/guides/upgrade-to/v7/`. **Complete list** of what the guide contains:

### 1. Vite 8 (dependency upgrade)
Astro v7.0 upgrades to Vite 8 as dev server and bundler. Mostly affects integration/plugin authors.

### 2. Rust compiler is now the default and only compiler ⚠️ **BITES `src/pages/` and `src/layouts/`**
> *"The new compiler is faster, but is also **stricter about invalid HTML syntax**. Templates that previously built without errors may now fail."*

1. **Unclosed tags now produce errors.**
2. **Semantically invalid HTML is no longer auto-corrected.** *"The Rust compiler does not attempt to correct your markup and instead passes it through as-is, leaving the browser to handle it."*

```astro del={2} ins={3}
<!-- Before: unclosed tags that the Go compiler silently accepted -->
<p>Hello world
<p>Hello world</p>

<!-- Void elements like <br>, <img>, <input>, and <hr> do not need closing tags -->
```

```astro
<!-- Invalid nesting: <div> is not allowed inside <p> -->
<p>
  <div>This will not be inside the paragraph</div>
</p>
```

CSS output differences (cosmetic only): named colors may serialize as hex (`rebeccapurple` → `#639`); `url()` values may gain/lose quotes.

### 3. Reserved file name: `src/fetch.ts`
Advanced routing (now enabled by default) treats `src/fetch.ts` / `src/fetch.js` as a special file. If you already have one, either set `fetchFile: './src/router.ts'` (or `fetchFile: null`) or rename it.

### 4. New default Markdown processor: Sätteri ⚠️ **BITES Markdown rendering**
> *"Astro now renders your `.md` and `.mdx` files with Sätteri, its native Markdown pipeline, instead of the remark/rehype pipeline. As a result, `@astrojs/markdown-remark` is no longer installed by default."*

- No remark/rehype plugins → nothing to do.
- Need remark/rehype → port to Sätteri MDAST/HAST plugins, or stay on unified:
```js title="astro.config.mjs" ins={2,6}
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  markdown: {
    processor: unified(),
  },
});
```
- *"The deprecated `markdown.remarkPlugins`, `markdown.rehypePlugins`, and `markdown.remarkRehype` options still work, but now also require `@astrojs/markdown-remark` to be installed."*

### 5. `compressHTML` default changed from `true` to `'jsx'` ⚠️ **BITES layouts / inline elements**
> *"The following example would render as `helloworld` in Astro v7.0, instead of `hello world` in Astro v6.x:"*

```astro title="src/components/Example.astro"
<span>hello</span>
<em>world</em>
```

Fix:
```astro title="src/components/Example.astro" del={1-2} ins={3}
<span>hello</span>
<em>world</em>
<span>hello</span>{" "}<em>world</em>
```
Or restore old behaviour:
```js title="astro.config.mjs" ins={4}
import { defineConfig } from 'astro/config';

export default defineConfig({
  compressHTML: true,
});
```

### 6. Deprecated: `getContainerRenderer()` import path
```diff
- import { getContainerRenderer } from '@astrojs/react';
+ import { getContainerRenderer } from '@astrojs/react/container-renderer';
```
(also `@astrojs/preact`, `@astrojs/solid-js`, `@astrojs/svelte`, `@astrojs/vue`, `@astrojs/mdx`.)

### 7. Removed
- `@astrojs/db` package (use `node:sqlite`, Drizzle, or a hosted DB).
- `astro:transitions` internals: `TRANSITION_BEFORE_PREPARATION`, `TRANSITION_AFTER_PREPARATION`, `TRANSITION_BEFORE_SWAP`, `TRANSITION_AFTER_SWAP`, `TRANSITION_PAGE_LOAD`, `isTransitionBeforePreparationEvent()`, `isTransitionBeforeSwapEvent()`, `createAnimationScope()`.

### 8. Experimental flags removed (now stable / default)
`logger`, `queuedRendering`, `rustCompiler`, `advancedRouting`, `cache`, `routeRules` moved out of `experimental`.

### **NOT** in the v7 upgrade guide — i.e. NO breaking change here
- **i18n config** — no changes; `i18n` shape is identical to v6.
- **Content collections** — no changes; `src/content.config.ts` + `glob()`/`file()` loaders unchanged.
- **`astro:content` APIs** — no changes. `render(entry)` is unchanged. (`entry.render()` was removed back in **v5**, not v7.)
- **Tailwind integration** — no changes; the Vite-plugin path is unchanged since 5.2.
- **`Astro.props`, `Astro.params`, `getStaticPaths()`, `src/pages/`, `src/layouts/`** — no API changes. The only risks are the Rust compiler (HTML validity) and `compressHTML: 'jsx'` (whitespace), both listed above.

### One more deprecation to be aware of (not in the v7 guide, but live in 7.4.13)
`import { z } from 'astro:content'` is deprecated → removed in **Astro 8**. Use `astro/zod`.

### Docs inconsistency worth knowing
The i18n recipe (`/en/recipes/i18n/`) shows a `defineCollection({ schema: ... })` **without a `loader`**. The API reference states `loader` is required (Since 5.0.0). Follow the API reference, not the recipe.

---

## Quick reference / TL;DR

| Question | Answer |
|---|---|
| i18n `defaultLocale` / `locales` | both **required** |
| `routing.prefixDefaultLocale` | default `false` |
| `routing.redirectToDefaultLocale` | default `false` |
| `routing.fallbackType` | default `"redirect"` |
| `routing` = `"manual"` | disables i18n middleware; no other routing options allowed |
| Does folder `en` auto-become locale `en`? | **No** — only if `"en"` is in `i18n.locales` and the name matches exactly |
| `Astro.currentLocale` | ✅ available on static pages |
| `Astro.preferredLocale` / `preferredLocaleList` | ❌ on-demand rendering only — **not** available in a static build |
| `getRelativeLocaleUrl()` import | `astro:i18n` |
| Collection config file | `src/content.config.ts` |
| `zod` import | `astro/zod` (`astro:content` form deprecated, removed in v8) |
| Render a body | `const { Content } = await render(entry)` — `entry.render()` does not exist |
| Tailwind v4 in Astro 7 | `@tailwindcss/vite` in `vite.plugins` — **not** an integration |
| Tailwind dark mode | `@custom-variant dark (&:where(.dark, .dark *));` / `(&:where([data-theme=dark], [data-theme=dark] *));` — from Tailwind docs, not Astro docs |
| GitHub Actions versions | `actions/checkout@v7`, `withastro/action@v6`, `actions/deploy-pages@v5`; **no** `configure-pages` / `upload-pages-artifact` |
| `site` / `base` | user site: `site` only; project site: `site` + `base: '/repo'` |
| Biggest v7 risks for your code | Rust compiler HTML strictness; `compressHTML: 'jsx'` whitespace; Sätteri Markdown default |
