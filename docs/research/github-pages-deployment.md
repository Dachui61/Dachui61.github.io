# Deploying a static website to GitHub Pages — verified facts (late 2026)

Research date: 2026-11-22. All claims below are from the cited primary sources fetched during
this research. Anything I could not verify is explicitly labelled **unverified**.

---

## 1. GitHub Pages hosting model

### What it is

> "GitHub Pages is a static site hosting service that takes HTML, CSS, and JavaScript files straight
> from a repository on GitHub, optionally runs the files through a build process, and publishes a
> website."
> — https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

### What it is NOT

- **No server-side languages.** "GitHub Pages does not support server-side languages such as PHP,
  Ruby, or Python." — https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- **No serverless functions on Pages itself.** There is no Pages-side function runtime; Pages serves
  files. (Pages deployments themselves are executed as GitHub Actions workflow runs — see §2.)
- **No database, no session, no request handling.** Only static file serving.
- **Not for commercial use.** "GitHub Pages is not intended for or allowed to be used as a free
  web-hosting service to run your online business, e-commerce site, or any other website that is
  primarily directed at either facilitating commercial transactions or providing commercial software
  as a service (SaaS). GitHub Pages sites shouldn't be used for sensitive transactions like sending
  passwords or credit card numbers." — https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- **Not private, even from a private repo.** "GitHub Pages sites are publicly available on the
  internet, even if the repository for the site is private (if your plan or organization allows
  it)." — same URL as above (creating-a-github-pages-site)
- MIME types: >750 supported, generated from the `mime-db` project; custom per-file/per-repo MIME
  types are not possible. — creating-a-github-pages-site
- Visitor IPs are logged and stored for security purposes. — what-is-github-pages

### The two site types

| Property | User and organization sites | Project sites |
|---|---|---|
| Source files | repo must be named `<owner>.github.io` | a folder within the project's repo |
| Limits | max one per account | max one per repository |
| Default location | `http(s)://<owner>.github.io` | `http(s)://<owner>.github.io/<repositoryname>` |

— https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

### What happens with Next.js API routes

With `output: 'export'` the build prerenders everything; Route Handlers become static files.
From https://nextjs.org/docs/app/guides/static-exports:

- "Route Handlers will render a static response when running `next build`. Only the `GET` HTTP verb
  is supported. To ensure Route Handlers are prerendered, you must explicitly mark the handler as
  static by adding `export const dynamic = 'force-static'` when a static export is enabled."
- "If you need to read dynamic values from the incoming request, you cannot use a static export."
- **Unsupported Features** list (verbatim): Dynamic Routes with `dynamicParams: true`; Dynamic
  Routes without `generateStaticParams()`; Route Handlers that rely on Request; Cookies; Rewrites;
  Redirects; Headers; Proxy; Incremental Static Regeneration; Image Optimization with the default
  `loader`; Draft Mode; Server Actions; Intercepting Routes.
- `next export` was removed in v14.0.0 in favour of `"output": "export"`.

### Astro on Pages

Astro's Pages deploy guide is marked `supports: ['static']` in its frontmatter, and Astro's
`output` option is `'static' | 'server'` with `'static'` as the default; `'server'` requires an
adapter (Cloudflare / Netlify / Node / Vercel) which Pages cannot host. Therefore Pages can only
serve Astro's prerendered output.
— https://docs.astro.build/en/reference/configuration-reference/ and
https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/deploy/github.mdx

### 2025/2026 changes (verified)

1. **GitHub Actions is now the recommended deployment path over the `github-pages` gem.**
   "While the `github-pages` gem remains supported for some workflows, GitHub Actions is now the
   recommended approach for deploying and automating GitHub Pages sites."
   — https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll
   (same note repeated in `creating-a-github-pages-site-with-jekyll`)
2. **Pages settings UI moved.** Repo settings → "Code, planning, and automation" section of the
   sidebar → **Pages** → "Build and deployment" → **Source**. (Every current Pages doc page shows
   this path, with matching screenshots.) — configuring-a-publishing-source-for-your-github-pages-site
3. **Jekyll on Pages is still Jekyll 3.10.0** — *not* Jekyll 4. Live
   https://pages.github.com/versions.json as of 2026-11-22:
   `"jekyll":"3.10.0"`, `"github-pages":"232"`, `"ruby":"3.3.4"`, `"kramdown":"2.4.0"`,
   `"liquid":"4.0.4"`, `"rouge":"3.30.0"`, `"jekyll-sitemap":"1.4.0"`, `"jekyll-feed":"0.17.0"`,
   `"minima":"2.5.1"`, `"sass":"3.7.4"`.
   Settings that cannot be changed for Pages sites: `lsi: false`, `safe: true`,
   `incremental: false`, `highlighter: rouge`, `kramdown.math_engine: mathjax`,
   `kramdown.syntax_highlighter: rouge`. — about-github-pages-and-jekyll
4. **All Pages deployments now run as a GitHub Actions workflow.** "Your GitHub Pages site will
   always be deployed with a GitHub Actions workflow run, even if you've configured your GitHub
   Pages site to be built using a different CI tool. Most external CI workflows 'deploy' to GitHub
   Pages by committing the build output to the `gh-pages` branch of the repository, and typically
   include a `.nojekyll` file. When this happens, the GitHub Actions workflow will detect the state
   that the branch does not need a build step, and will execute only the steps necessary to deploy
   the site to GitHub Pages servers."
   — configuring-a-publishing-source-for-your-github-pages-site
5. **Pages builds are free.** "The use of standard GitHub-hosted runners is free: In public
   repositories, **For GitHub Pages**, For Dependabot." — Pages deploys do **not** consume Actions
   minutes, even in private repos. — https://docs.github.com/en/billing/concepts/product-billing/github-actions
6. **`github-pages` environment.** "The workflow templates use a deployment environment called
   `github-pages`. If your repository does not already include an environment called `github-pages`,
   the environment will be created automatically. We recommend that you add a deployment protection
   rule so that only the default branch can deploy to this environment."
   — configuring-a-publishing-source-for-your-github-pages-site;
   https://github.com/actions/deploy-pages ("The deployment should target the `github-pages`
   environment (you may use a different environment name if needed, but this is not recommended.)")
7. **Official SSG support is via starter workflows + `configure-pages`.**
   `actions/configure-pages` supports auto-injecting the base path for exactly four generators —
   `next`, `gatsby`, `nuxt`, `sveltekit` (source:
   https://raw.githubusercontent.com/actions/configure-pages/main/src/set-pages-config.js). Astro is
   *not* in that list; the Astro starter workflow instead passes `--site`/`--base` CLI flags.
   Starter workflows live in https://github.com/actions/starter-workflows/tree/main/pages (verified
   present: `astro.yml`, `nextjs.yml`, `hugo.yml`, `static.yml`).
8. **PR preview deployments exist but are alpha.** `actions/deploy-pages` has a `preview` input:
   "(NOTE: This feature is only in alpha currently and is not available to the public!)"
   — https://github.com/actions/deploy-pages
9. **GitHub Skills now includes a Pages skill** — "GitHub Pages on GitHub Skills",
   https://github.com/skills/github-pages (linked from what-is-github-pages). Page body was
   truncated on fetch; skill contents **unverified**.
10. **REST API supports both build modes.** `build_type` is `"legacy"` (GitHub builds on push to a
    branch) or `"workflow"` (custom Actions workflow). — https://docs.github.com/en/rest/pages/pages.md

---

## 2. Deployment mechanisms

### (a) GitHub Actions workflow — `configure-pages` + `upload-pages-artifact` + `deploy-pages`

**Complete, current generic workflow** (static build, `pnpm build` → artifact → deploy):

```yaml
name: Deploy static site to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

# Required GITHUB_TOKEN scopes. The deploy job needs pages: write + id-token: write.
permissions:
  contents: read
  pages: write
  id-token: write

# One deployment at a time. Do NOT cancel in-progress production deploys.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v6
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist
          include-hidden-files: false

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

**⚠️ Action version drift — read this before pasting.** The major-version tags differ across
sources, and I could not read the action release pages (GitHub's HTML pages were nav-truncated and
`api.github.com` was rate-limited). What each source actually says as of 2026-11-22:

| Action | GitHub docs "Using custom workflows" | `actions/starter-workflows` | Hugo's Pages guide (updated 2026-11-07) | Astro docs |
|---|---|---|---|---|
| `actions/checkout` | v6 | v4 | **v7** | **v7** |
| `actions/configure-pages` | v5 | v5 | **v6** | — |
| `actions/upload-pages-artifact` | v4 | v3 | **v5** | — |
| `actions/deploy-pages` | v4 | v5 | **v5** | **v5** |

Sources: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages ·
https://raw.githubusercontent.com/actions/starter-workflows/main/pages/nextjs.yml ·
https://raw.githubusercontent.com/actions/starter-workflows/main/pages/astro.yml ·
https://gohugo.io/host-and-deploy/deploy-to-github-pages/ ·
https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/deploy/github.mdx

**Practical guidance:** pin the major tags your repo already uses and only bump after checking the
action's releases page. `deploy-pages@v5` + `configure-pages@v6` + `upload-pages-artifact@v5` are the
versions used by the two freshest guides (Hugo Nov 2026, Astro current). GitHub's own docs page is
lagging by one major on each action.

**Requirements stated by GitHub for `deploy-pages`** (https://github.com/actions/deploy-pages):

- "The job must have a minimum of `pages: write` and `id-token: write` permissions."
- "The `needs` parameter must be set to the `id` of the build step. Not setting this parameter may
  result in an independent deployment that continuously searches for an artifact that hasn't been
  created."
- "An `environment` must be established to enforce branch/deployment protection rules. The default
  environment is `github-pages`."
- "To specify the URL of the page as an output, utilize the `url:` field."
- The deployment should target the `github-pages` environment; `deploy-pages` will configure
  environment protection by default.
- If your Pages site uses a source branch, the deployment must originate from that branch unless
  environment protection rules say otherwise.
- OIDC: `pages: write` lets the token call the Pages API; `id-token: write` is needed to mint the
  OIDC JWT that carries the branch/ref claims used to validate the deployment.

**`deploy-pages` inputs** (README): `token` (default `${{ github.token }}`), `timeout`
(default `600000` ms = 10 min), `error_count` (default `10`), `reporting_interval` (default
`5000`), `artifact_name` (default `github-pages`), `preview` (default `false`). Output: `page_url`.
It also sets env var `GITHUB_PAGES=true` for build tools.

**`upload-pages-artifact` inputs** (README): `name` (default `github-pages`), `path` (default
`_site/`), `retention-days` (default `1`), `include-hidden-files` (default `false`; excludes `.git`
and `.github` regardless).

**Artifact format** (must hold if you don't use the action): named `github-pages`; a single `gzip`
archive containing a single `tar`; the tar must be under 10GB (Pages' official max is 1GB — "the
subsequent deployment of larger tarballs are not guaranteed to succeed &mdash; often because they
are more prone to exceeding the maximum deployment timeout of 10 minutes"); no symbolic or hard
links; only files and directories.

**Enabling:** Settings → Pages → Build and deployment → Source → **GitHub Actions**. GitHub then
offers workflow templates. "GitHub Pages does not associate a specific workflow to the GitHub Pages
settings. However, the GitHub Pages settings will link to the workflow run that most recently
deployed your site."

### (b) Deploying from a `gh-pages` branch

- The publishing source branch can be **any** branch in the repository; the folder is either `/`
  (repo root) or `/docs`.
- Setting it up: Settings → Pages → Build and deployment → Source → **Deploy from a branch** →
  pick branch → pick folder (`/(root)` or `/docs`) → **Save**.
- GitHub's own Jekyll walkthrough shows creating it with
  `git checkout --orphan gh-pages` / `git rm -rf .` then pushing.
  — https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll
- **Trade-offs:** the built output lives in git history (repo bloat; source repo recommended limit
  is 1GB); no build environment on Pages means you must build locally/CI and push; Jekyll is run by
  default unless you add an empty `.nojekyll` file at the root of the publishing source; the OIDC
  branch/ref check still applies (a `gh-pages` deploy must originate from the source branch unless
  the environment is protected).
- "If you are publishing from a branch and your site has not published automatically, make sure
  someone with admin permissions and a verified email address has pushed to the publishing source."
  Also: "Commits pushed by a GitHub Actions workflow that uses the `GITHUB_TOKEN` do not trigger a
  GitHub Pages build." — configuring-a-publishing-source-for-your-github-pages-site

### (c) Deploying from a `/docs` folder on the default branch

- Exactly the same mechanism as (b), with the folder dropdown set to `/docs`.
- "If you choose the `docs` folder on any branch as your publishing source, then later remove the
  `/docs` folder from that branch in your repository, your site won't build and you'll get a page
  build error message for a missing `/docs` folder."
- Entry file must be at the top level of `/docs` on the source branch (`index.html`, `index.md`,
  or `README.md`; the name is case-sensitive).
- Jekyll runs by default → add empty `.nojekyll` for other SSGs.
- **Trade-offs:** source and output in the same tree (you must gitignore the output dir, e.g.
  `dist/`); Jekyll-by-default trap; the `/docs` folder must keep existing.

### (d) Committing built output directly to the default branch

- Same as (c) but the publishing folder is `/` (repo root) — i.e. you commit the built site into the
  root of the default branch, or into `/docs` within it.
- **Trade-offs:** worst of both — build output pollutes the source branch and git history, no
  build environment, Jekyll-by-default trap, and every source push risks colliding with generated
  files.

### Official recommendation (verbatim)

- "If you do not need any control over the build process for your site, we recommend that you
  publish your site when changes are pushed to a specific branch."
- "If you want to use a build process other than Jekyll or you do not want a dedicated branch to
  hold your compiled static files, we recommend that you write a GitHub Actions workflow to publish
  your site. GitHub provides workflow templates for common publishing scenarios…"
- "If you use a custom build process or a static site generator other than Jekyll, you can write a
  GitHub Actions workflow to build and publish your site… Otherwise, disable the Jekyll build
  process by creating an empty file called `.nojekyll` in the root of your publishing source, then
  follow your static site generator's instructions to build your site locally."
- "While the `github-pages` gem remains supported for some workflows, GitHub Actions is now the
  recommended approach for deploying and automating GitHub Pages sites."
- Astro: "Astro maintains an official Astro GitHub Action to deploy your project to a GitHub Pages
  … and is the recommended way to deploy to GitHub Pages."
- Hugo's guide: change Source to **GitHub Actions** ("The change is immediate; you do not have to
  press a Save button").
- All of the above: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
  · …/about-github-pages-and-jekyll · …/creating-a-github-pages-site
  · https://raw.githubusercontent.com/withastro/docs/main/src/content/docs/en/guides/deploy/github.mdx
  · https://gohugo.io/host-and-deploy/deploy-to-github-pages/

---

## 3. Static site generators on Pages

### Astro

Relevant options (https://docs.astro.build/en/reference/configuration-reference/):

- `site` (string) — "Your final, deployed URL. Astro uses this full URL to generate your sitemap
  and canonical URLs in your final build. It is strongly recommended that you set this
  configuration."
- `base` (string) — "The base path to deploy to. Astro will use this path as the root for your
  pages and assets both in development and in production build… all of your static asset imports
  and URLs should add the base as a prefix. You can access this value via
  `import.meta.env.BASE_URL`."
- `trailingSlash` (`'always' | 'never' | 'ignore'`, default `'ignore'`) — controls route matching.
  **Gotcha:** "Trailing slashes on prerendered pages are handled by the hosting platform, and may
  not respect your chosen configuration… You cannot use Astro `redirects` for this use case at this
  point."
- `import.meta.env.BASE_URL`'s trailing slash is determined by `trailingSlash`, *not* by `base`.
- `output` (`'static' | 'server'`, default `'static'`).
- `redirects` in static mode produce a client-side `<meta http-equiv="refresh">` and **do not
  support status codes**.
- **Gotcha:** internal links are NOT auto-prefixed. From the deploy guide: "When this value is
  configured, all of your internal page links must be prefixed with your `base` value:
  `<a href="/my-repo/about">About</a>`."

**User site (`username.github.io`) — repo named `username.github.io`:**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://username.github.io',
  // base is intentionally omitted: the site root is /
})
```

**Project site (`username.github.io/repo`) — repo named e.g. `my-repo`:**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://username.github.io',
  base: '/my-repo',
})
```

**Custom domain:** set `site` to the custom domain and **remove `base`** (the Astro guide shows
exactly this: `site: 'https://example.com'`, "Do not set a value for `base`, and remove one if it
exists").

**Deployment:** Astro's official action `withastro/action@v6` builds + uploads in one step; it
auto-detects the package manager from the lockfile (commit your `pnpm-lock.yaml` / `package-lock.json`
/ `yarn.lock` / `bun.lockb`); Node default 24; `out-dir` default `dist`. Astro's starter workflow
instead runs
`astro build --site "${{ steps.pages.outputs.origin }}" --base "${{ steps.pages.outputs.base_path }}"`.
— https://github.com/withastro/action and the Astro deploy guide.

### Next.js (`output: 'export'`)

Relevant options:

- `output: 'export'` → build writes to `out/`. `distDir` can change the output dir name.
- `basePath` — "allows you to set a path prefix for the application… This value must be set at build
  time and cannot be changed without re-building as the value is inlined in the client-side
  bundles." `next/link` and `next/router` apply it automatically; for `next/image` you must add
  the prefix to `src` yourself.
  — https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
- `assetPrefix` — for a CDN. It affects `/_next/` static assets only, and "does not influence… files
  in the `public` folder". Next.js explicitly says: "We do not suggest you use a custom Asset
  Prefix for this use case" (i.e. for sub-path hosting, use `basePath`).
  — https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix
- `trailingSlash` — default redirects `/about/` → `/about`. With `output: 'export'`, `trailingSlash:
  true` emits `/about/index.html` instead of `/about.html`. `skipTrailingSlashRedirect: true`
  prevents the automatic `/me` → `/me/` redirect.
  — https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash
- Image optimization with the default loader is unsupported in a static export → you need
  `images: { unoptimized: true }` or a custom loader (`images.loader: 'custom'` + `loaderFile`).

**What GitHub's `configure-pages` injects for `static_site_generator: next`** (from
https://raw.githubusercontent.com/actions/configure-pages/main/src/set-pages-config.js):

```js
{
  output: 'export',
  basePath: path,          // path WITHOUT a trailing slash ("Next does not want a trailing slash")
  'images.unoptimized': true,
}
```

`configure-pages` rewrites `next.config.js` / `next.config.cjs` / `next.config.mjs` in place.

**User site (`username.github.io`) — repo named `username.github.io`:**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // basePath: '' (omit — site root)
  images: { unoptimized: true },
}
module.exports = nextConfig
```

**Project site (`username.github.io/repo`) — repo named e.g. `my-repo`:**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/my-repo',
  images: { unoptimized: true },
}
module.exports = nextConfig
```

With a custom domain, `basePath` must be `''`/omitted (the site is served at the domain root).

Alternatively, do not hand-write it at all: use
`uses: actions/configure-pages@v5` with `with: { static_site_generator: next }`, which injects
`output: 'export'`, the correct `basePath` (project path) and `images.unoptimized` for you.
— https://raw.githubusercontent.com/actions/starter-workflows/main/pages/nextjs.yml

Next.js also ships an official template for GitHub Pages:
https://github.com/nextjs/deploy-github-pages (referenced from the static-exports guide).

### Vite

- `base` (string, default `/`) — "Base public path when served in development or production. Valid
  values include: Absolute URL pathname, e.g. `/foo/`; Full URL, e.g. `https://bar.com/foo/` (the
  origin part won't be used in development so the value is the same as `/foo/`); Empty string or
  `./` (for embedded deployment)."
  — https://vite.dev/config/shared-options.html
- **User site:** `base: '/'` (default — nothing to do).
- **Project site:** `base: '/my-repo/'` (note the trailing slash is the conventional form).
- Gotcha: Vite is a build tool, not a site generator. For a multi-page site on Pages you need a
  router or an SSG on top of Vite; Vite alone gives you an SPA entry point, which Pages serves
  fine but deep links will 404 unless you also ship `404.html` (Pages serves `404.html` for
  unmatched paths, and it is the standard workaround for SPA routing on Pages — the docs page for
  custom 404s is https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).
  The **unverified** part: GitHub's docs do not describe SPA fallback rewriting on Pages, so this
  last sentence is my inference from the `404.html` mechanism, not a quoted fact.

### Hugo

- `baseURL` (string) — "The absolute URL of your published site including the protocol, host,
  path, and a trailing slash. Default is `https://example.org/`."
  — https://gohugo.io/configuration/all/
- Other relevant settings: `publishDir` (default `public`), `title`, `uglyurls`, `canonifyURLs`.
- Hugo's own Pages guide (updated 2026-11-07) builds with
  `hugo build --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/" --cacheDir ...` and
  uploads `./public`.
  — https://gohugo.io/host-and-deploy/deploy-to-github-pages/
- **User site:** `baseURL: "https://username.github.io/"`.
- **Project site:** `baseURL: "https://username.github.io/my-repo/"`.
- Gotchas: Hugo requires `baseURL` to end with a trailing slash; Hugo's `alias` feature emits
  client-side redirect HTML files (fine for Pages); Hugo emits `404.html` automatically (it is one
  of the built-in page kinds).

### Jekyll

- Jekyll is the only SSG with first-class support on Pages (built into the Pages build).
- For a project site, `_config.yml` needs the sub-path:
  ```yaml
  domain: my-site.github.io       # to force HTTPS, specify the domain without http://
  url: https://my-site.github.io  # base hostname and protocol
  baseurl: /REPOSITORY-NAME/      # place folder name if the site is served in a subfolder
  ```
  — https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll
- Pages runs **Jekyll 3.10.0** via the `github-pages` gem (v232) on Ruby 3.3.4 — versions.json.
  Your Gemfile should pin `gem "github-pages", "~> <version>", group: :jekyll_plugins`.
- Constraints: Jekyll cannot build sites using unsupported plugins; a set of plugins is enabled by
  default and cannot be disabled (`jekyll-coffeescript`, `jekyll-default-layout`, `jekyll-gist`,
  `jekyll-github-metadata`, `jekyll-optional-front-matter`, `jekyll-paginate`,
  `jekyll-readme-index`, `jekyll-titles-from-headings`, `jekyll-relative-links`); only Rouge
  highlighting is available; Jekyll is not officially supported on Windows.
  — https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll
- Custom 404: add `404.html` (or `404.md` with `permalink: /404.html` frontmatter) at the top level
  of the publishing source. — creating-a-custom-404-page-for-your-github-pages-site

### Eleventy

- Eleventy has **no `base`/`basePath` config of its own**; it has a **`pathPrefix`** configuration
  option plus the `url` filter and an HTML `<base>` plugin.
  From https://www.11ty.dev/docs/filters/url/ : "Works with the `pathPrefix` configuration option to
  properly normalize absolute paths in your content with the `pathPrefix` added. Useful if you host
  your site on GitHub Pages, which normally live in a subdirectory, e.g.
  `https://11ty.github.io/eleventy-base-blog/`. We set `pathPrefix: "/eleventy-base-blog/"` and our
  absolute links all have this prepended to the beginning." It also says: "If you need to deploy
  your site to a subfolder, it's recommended to use the simpler HTML `<base>` plugin with
  `pathPrefix` instead of having to litter the `url` filter throughout your content."
- Output directory defaults to `_site`; a Pages workflow uploads `path: ./_site`.
- Trailing slashes: Eleventy writes `index.html` for directories by default ("Cool URIs don't
  change"), which Pages serves as `/dir/`. — https://www.11ty.dev/docs/permalinks/
- **Project site:** `pathPrefix: "/my-repo/"`; **User site:** omit `pathPrefix`.

---

## 4. Repo + account setup

### Naming rules

- User/organization site ⇒ repo **must** be named `<user>.github.io` / `<organization>.github.io`;
  "If your user or organization name contains uppercase letters, you must lowercase the letters."
- Any other repo name ⇒ project site at `username.github.io/<repo>`.
- "You can only create one user or organization site for each account on GitHub." One project site
  per repository.
- Repo naming rule: `<owner>.github.io` for user/org sites; everything else is a project site.
  — creating-a-github-pages-site, what-is-github-pages

### Settings → Pages → Source options

1. **Deploy from a branch** — then a branch dropdown and a folder dropdown (`/(root)` or `/docs`),
   then **Save**.
2. **GitHub Actions** — GitHub suggests workflow templates for common publishing scenarios.
   — configuring-a-publishing-source-for-your-github-pages-site

### Entry file

"GitHub Pages will look for an `index.html`, `index.md`, or `README.md` file as the entry file for
your site." For a branch+folder source it must be at the top level of that folder; for an Actions
source the deployed artifact must include it at the top level.
— creating-a-github-pages-site

### Enabling/inspecting Pages via the REST API

Endpoint reference: https://docs.github.com/en/rest/pages/pages.md (API version `2026-03-10`).
All endpoints need the `repo` scope; the caller must be a repository administrator/maintainer or
hold the "manage GitHub Pages settings" permission.

| Method | Path | Notes |
|---|---|---|
| GET | `/repos/{owner}/{repo}/pages` | Returns site state |
| POST | `/repos/{owner}/{repo}/pages` | **Creates** the Pages site. 201 / 409 / 422 |
| PUT | `/repos/{owner}/{repo}/pages` | Updates. 204 / 400 / 409 / 422 |
| DELETE | `/repos/{owner}/{repo}/pages` | Deletes the Pages site. 204 |
| GET | `/repos/{owner}/{repo}/pages/builds` | List builds |
| POST | `/repos/{owner}/{repo}/pages/builds` | Request a build ("limited to one concurrent build per repository and one concurrent build per requester") |
| GET | `/repos/{owner}/{repo}/pages/builds/latest` | Latest build |
| GET | `/repos/{owner}/{repo}/pages/builds/{build_id}` | One build |
| POST | `/repos/{owner}/{repo}/pages/deployments` | Create a deployment (needs `artifact_id` or `artifact_url`, `environment` (default `github-pages`), `pages_build_version` (default `GITHUB_SHA`), `oidc_token`) |
| GET | `/repos/{owner}/{repo}/pages/deployments/{id}` | Deployment status |
| POST | `/repos/{owner}/{repo}/pages/deployments/{id}/cancel` | Cancel |
| GET | `/repos/{owner}/{repo}/pages/health` | DNS health check (first call returns 202, then 200) |

**Create body fields** (POST):
```json
{
  "build_type": "workflow",
  "source": { "branch": "main", "path": "/docs" }
}
```
- `build_type`: `"legacy"` (GitHub builds on push to a branch) or `"workflow"` (custom Actions
  workflow).
- `source.branch`: required. `source.path`: required on PUT, optional on POST; allowed values are
  `/` (default) or `/docs` only.
- Response schema (GET/POST): `url`, `status` (`built`/`building`/`errored`/`null`), `cname`,
  `protected_domain_state` (`pending`/`verified`/`unverified`/`null`),
  `pending_domain_unverified_at`, `custom_404`, `html_url`, `build_type`, `source{branch,path}`,
  `public`, `https_certificate{state,description,domains,expires_at}`, `https_enforced`.

**Update body fields** (PUT): `cname` (string or null — null removes the domain),
`https_enforced` (boolean), `build_type`, `source{branch,path}`.

**Example (create with a branch source):**
```shell
curl -L -X POST https://api.github.com/repos/OWNER/REPO/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  -d '{"source": {"branch": "main", "path": "/docs"}}'
```

### Public vs private repos (plan availability)

"GitHub Pages is available in public repositories with GitHub Free and GitHub Free for
organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub
Enterprise Cloud, and GitHub Enterprise Server."
— repeated on every Pages doc page (e.g. what-is-github-pages)

- "If the account that owns the repository uses GitHub Free or GitHub Free for organizations, the
  repository must be public." — creating-a-github-pages-site
- **To publish privately you need an org on GitHub Enterprise Cloud.** "To publish a GitHub Pages
  site privately, you need to have an organization account. Additionally, your organization must
  use GitHub Enterprise Cloud." — https://docs.github.com/en/get-started/learning-about-github/githubs-plans.md
  (privately published GHEC sites get a random URL like `https://<random-string>.pages.github.io/`)
- Downgrading Pro → Free unpublishes any Pages site published from a private repo. Transferring a
  private repo to a personal account on Free makes the repo lose Pages access and unpublishes the
  site. — about-custom-domains-and-github-pages
- GitHub Free users can only configure environments for **public** repositories. —
  https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments.md

---

## 5. Custom domains + HTTPS

### Adding a domain

Settings → Pages → **Custom domain** → type the domain → **Save**.

- If you publish from a branch, this **creates a commit adding a `CNAME` file** to the root of your
  source branch. If you publish from a custom GitHub Actions workflow, **no `CNAME` file is
  created, and any existing `CNAME` file is ignored and is not required.**
  — https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
  (Note: Astro's guide still tells you to add `public/CNAME` — harmless, but the GitHub docs are
  explicit that it is ignored for workflow builds.)
- Add the domain to GitHub **before** configuring DNS at your provider: "Configuring your custom
  domain with your DNS provider without adding your custom domain to GitHub could result in
  someone else being able to host a site on one of your subdomains."
- IDN domains must be entered as their Punycode form.

### DNS records required

| Scenario | Type | Name | Value(s) |
|---|---|---|---|
| Apex (`example.com`) | `A` | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| Apex | `AAAA` | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| Apex | `ALIAS` / `ANAME` | `@` | `USERNAME.github.io` or `ORGANIZATION.github.io` |
| Subdomain (`www.`, `blog.`) | `CNAME` | `SUBDOMAIN.example.com.` | `USERNAME.github.io` or `ORGANIZATION.github.io` |

- The CNAME must point at the **account** domain, **excluding the repository name**, and must not
  point at the `*.pages.github.io` subdomain shown in repo settings.
- "If your DNS provider automatically sets a default record, remove it before continuing."
- **Do not use wildcard DNS records** — "These records put you at an immediate risk of domain
  takeovers, even if you verify the domain."
- apex ↔ `www` redirects are automatic if both are configured; `www.www.` is not possible.
- DNS changes can take up to 24 hours to propagate.

### HTTPS

- "All GitHub Pages sites, including sites that are correctly configured with a custom domain,
  support HTTPS and HTTPS enforcement."
- "GitHub Pages sites created after June 15, 2016, and using `github.io` domains are served over
  HTTPS automatically."
- Certificate provisioning: "When you set or change your custom domain in the Pages settings, an
  automatic DNS check begins… If the check is successful, GitHub queues a job to request a TLS
  certificate from **Let's Encrypt**… GitHub automatically uploads it to the servers that handle
  TLS termination for Pages."
- Toggle: Settings → Pages → **Enforce HTTPS**. "It can take up to 24 hours before this option is
  available." Extra A/AAAA/ALIAS/ANAME records on `@`, or CNAMEs pointing at other subdomains, can
  prevent the certificate from being generated.
- The whole domain name must be **< 64 characters** for a certificate to be created (RFC 3280 CN
  limit).
- Sources: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
  and …/managing-a-custom-domain-for-your-github-pages-site

### Using a domain on a repo that is NOT `<username>.github.io`

Fully supported. Any repository can have its own custom domain.

- "By default, if you set a custom domain for a **user site** or **organization site**, that same
  custom domain will be used for all project sites owned by the same account… You can override the
  default custom domain by adding a custom domain to the individual repository."
- Consequence: with `www.octocat.com` set on the user site, a project repo `octo-project` is
  served at `www.octocat.com/octo-project` unless you give that repo its own custom domain.
- Removing the account-level default requires removing the custom domain from the user/organization
  site.
- **Security:** verify your custom domain (Settings → Pages → Verify domain). "Verifying your
  custom domain prevents other GitHub users from using your domain with their repositories." If
  Pages is disabled while DNS still points at GitHub, the domain is at risk of takeover.
- Source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages

---

## 6. Limits

### Pages limits (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

- One user/organization site per account.
- Source repositories: recommended limit **1 GB**.
- Published site: **no larger than 1 GB**.
- Deployments **time out after 10 minutes**.
- **Soft bandwidth limit: 100 GB per month.**
- **Soft limit of 10 builds per hour — "This limit does not apply if you build and publish your site
  with a custom GitHub Actions workflow."**
- Rate limits may apply; you get HTTP **429** with an informative HTML body.

Also: the `upload-pages-artifact` README notes a 10GB unofficial absolute tarball ceiling that Pages
"will not even attempt to deploy".

### GitHub Actions limits (https://docs.github.com/en/actions/reference/limits.md)

| Limit | Value |
|---|---|
| Workflow run time | 35 days |
| Gate approval wait | 30 days |
| Job matrix | 256 jobs / run |
| Re-runs | 50 per run |
| Workflow file size | 500 KB (file will not start runs) |
| Workflow trigger event rate | 1500 events / 10 s / repository |
| Workflow runs queued | 500 / 10 s |
| Concurrency group queue | 100 runs per group (with `queue: max`) |
| Job execution time (GitHub-hosted) | 6 hours |
| Job execution time (self-hosted) | 5 days |
| Job queue time (self-hosted) | 24 hours |
| Concurrent jobs (standard runner) | Free 20 / Pro 40 / Team 60 / Enterprise 500 |

### GitHub Actions minutes / billing (https://docs.github.com/en/billing/concepts/product-billing/github-actions.md)

**Free:** standard GitHub-hosted runners in public repositories, **for GitHub Pages**, for
Dependabot; and self-hosted runners. These do not draw on the included compute usage.

**Private/internal repos** draw from a monthly **included compute usage expressed in USD**:

| Plan | Artifact storage | Included compute / month | Cache storage / repo | Custom image storage |
|---|---|---|---|---|
| GitHub Free | 500 MB | **$12 USD** | 10 GB | n/a |
| GitHub Pro | 1 GB | **$18 USD** | 10 GB | n/a |
| GitHub Free for orgs | 500 MB | **$12 USD** | 10 GB | n/a |
| GitHub Team | 2 GB | **$18 USD** | 10 GB | 75 GB |
| GitHub Enterprise Cloud | 50 GB | **$300 USD** | 10 GB | 150 GB |

"The included compute usage is expressed as a monetary amount, not a fixed number of minutes…
As a guide, $300 USD covers 50,000 minutes on a standard Linux runner at $0.006 USD per minute."
⇒ **$12 ≈ 2,000 Linux minutes; $18 ≈ 3,000; $300 = 50,000** (arithmetic from the documented rate).

Per-minute rates: Linux 1-core x64 $0.002 · Linux 2-core x64 $0.006 · Linux 2-core arm64 $0.005 ·
Windows 2-core x64 $0.010 · Windows arm64 $0.010 · macOS M1/Intel $0.062.
Overage storage: shared artifacts + GitHub Packages $0.25/GB-month; Actions cache $0.07/GB-month;
custom images $0.07/GB-month.

### Pages build/deploy rate limits specifically

- Branch-source builds: soft 10 builds/hour (not applicable to Actions-built sites).
- `POST /pages/builds`: "Build requests are limited to one concurrent build per repository and one
  concurrent build per requester. If you request a build while another is still in progress, the
  second request will be queued until the first completes."
- `deploy-pages` deployment status enum: `deployment_in_progress`, `syncing_files`,
  `finished_file_sync`, `updating_pages`, `purging_cdn`, `deployment_cancelled`,
  `deployment_failed`, `deployment_content_failed`, `deployment_attempt_error`, `deployment_lost`,
  `succeed`. Its default `timeout` is 600000 ms.
- Propagation: "It can take up to 10 minutes for changes to your site to publish after you push
  the changes to GitHub." — creating-a-github-pages-site

---

## 7. Escape hatch when you need a server-side runtime

### Quick comparison

| Option | Cost | Difficulty | Notes |
|---|---|---|---|
| **Cloudflare Pages + Workers/Pages Functions** | Free tier: 100,000 Worker requests/day, 10 ms CPU/invocation; Paid $5/mo min (10M requests + 30M CPU-ms included, then $0.30/M requests, $0.02/M CPU-ms). Requests to static assets are free and unlimited. | Low–medium | Best value if you want to stay on Pages-like hosting with edge functions. Cloudflare Pages free: 500 builds/month, 20 min build timeout, 20,000 files/site, 25 MiB max file size, 100 custom domains/project, 100 projects/account, 30-day deployment retention. D1 (SQLite) on Workers Free: 5M rows read/day, 100k rows written/day, 5 GB storage, 10 databases. |
| **Vercel** | Hobby $0/mo; Pro $20/user/mo. Hobby: 200 projects, 100 deployments/day, 100 deployments/hour, 45 min build time, 100 MB static uploads, 15,000 source files, 50 domains/project, 1 concurrent deploy, Functions max 300 s / 2 GB / 1 vCPU, runtime logs kept 1 hour. Pro: unlimited projects, 6,000 deployments/day, 1 GB uploads, concurrent builds up to 500. | Low | Best-in-class Next.js support; the canonical Next.js host. |
| **Netlify** | Credit-based since 2025-09-04. Free = **300 credits/month**, hard limit, $0, no auto-recharge. Personal = $9/mo, 1,000 credits, auto-recharge 500 credits/$5. Pro = $20/mo, 3,000 credits (options to 20,000), auto-recharge 1,500/$10, rollover at ≥5,000. Credit rates: web requests **2 credits / 10k requests**; bandwidth **20 credits / GB**; functions compute **10 credits / GB-hour**; production deploy **15 credits**; form submissions **unlimited and free**; deploy previews and branch deploys **not metered**. 500-project limit; 1 concurrent build on Free. ⇒ Free ≈ 1.5M requests, 15 GB bandwidth, 30 GB-hours compute, 20 production deploys/month. | Low | Netlify Forms give free form handling with spam protection. |
| **Supabase** (managed Postgres + Auth + Storage) | Free $0: unlimited API requests, 50,000 MAU, 500 MB DB (shared CPU, 500 MB RAM), 5 GB egress, 5 GB cached egress, 1 GB file storage; **free projects are paused after 1 week of inactivity**; max 2 active projects. Pro from $25/mo: 100,000 MAU (then $0.00325/MAU), 8 GB disk (then $0.125/GB), 250 GB egress (then $0.09/GB), 100 GB file storage, daily backups (7-day retention), 7-day log retention. Team from $599/mo. | Medium | Supabase Auth gives you real login (JWT) with Row Level Security; the DB is reachable straight from the browser with the publishable/anon key + RLS, so **no server-side runtime needed at all**. The 1-week inactivity pause is the main gotcha. |
| **GitHub REST/GraphQL API as a backend** | Free. Rate limits: unauthenticated **60 req/hr per IP**; PAT **5,000/hr**; GitHub App on a GHEC org **15,000/hr**; `GITHUB_TOKEN` in Actions **1,000/hr per repo** (15,000 on GHEC). Secondary limits: ≤100 concurrent requests; ≤900 points/min REST and ≤2,000 points/min GraphQL; ≤90 s CPU per 60 s; **content generation ≤80 requests/min and ≤500 requests/hour**; POST/PATCH/PUT/DELETE cost 5 points, GET/HEAD/OPTIONS cost 1. | Medium–high | Reading public repo data from the browser works unauthenticated (60/hr — tight). Writing needs a token; a PAT in client-side code is unsafe, so you need a proxy (i.e. a serverless function) or a GitHub App with a user OAuth flow. GraphQL has its own separate primary rate limit. |
| **GitHub Issues / Discussions as a database** | Free. | High (and fragile) | Every write is a "content-generating request": **≤80/min and ≤500/hour**, 5 points each, within the 900 points/min secondary limit. No transactions, no schema, no indexes, no relational query language, no per-field validation, awkward pagination, and the data lives as issues in a repo anyone can see. Fine for a contact form or guestbook; wrong for anything with integrity requirements. |
| **Purely client-side + third-party APIs** | $0 to the free tier of the third party. | Low for forms, medium for auth | Cheapest path: use a hosted form service (Netlify Forms / Cloudflare Pages Static Forms), a read-only third-party API, or Supabase/Firebase from the browser with RLS + a publishable key. The trade-off is that a "publishable" key is still public and your data + rate limits live on someone else's account. |

### Firebase

Firebase Hosting is a real deploy target (listed in Astro's deployment guide and Hugo's
"Deploy to Firebase" page), but **its pricing page could not be fetched during this research**
(`https://firebase.google.com/pricing` failed with a network error on repeated attempts), so
**Firebase pricing specifics are unverified**. Everything Firebase-related beyond "it exists and
you can deploy there" should be treated as unverified.

### Also worth knowing

- **Cloudflare Workers pricing:** https://developers.cloudflare.com/workers/platform/pricing/
- **Cloudflare Pages limits:** https://developers.cloudflare.com/pages/platform/limits/
- **Supabase pricing:** https://supabase.com/pricing
- **Vercel limits:** https://vercel.com/docs/limits
- **Netlify credit-based plans:** https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- **GitHub REST rate limits:** https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

---

## Open items / explicitly unverified

1. **Exact latest major version tags** of `actions/checkout`, `actions/configure-pages`,
   `actions/upload-pages-artifact`, `actions/deploy-pages`. GitHub's release pages were
   nav-truncated and `api.github.com` was rate-limited from this host. See the version table in §2a.
2. **Firebase pricing** — pricing page unreachable.
3. **Netlify's exact free-tier bandwidth/GB** — the Free plan's 300 credits are documented and the
   credit rates are documented; the GB numbers in §7 are arithmetic from those rates, not quoted
   limits.
4. **Vercel Hobby's commercial-use restriction** — not visible on the pricing page I fetched.
5. **GitHub's "new build config UI"** — I found no changelog entry describing a redesign of the
   Pages build configuration beyond the settings-sidebar relocation documented in §1.2; the
   `github.blog/changelog/?s=` query did not filter and the per-label pages 404'd. **Unverified**
   whether there was a dedicated 2025/2026 "build configuration" UI release.
6. **SPA deep-link fallback on Pages** — GitHub docs describe `404.html` but do not document a
   rewrite/fallback mechanism; the SPA behaviour described in §3 (Vite) is an inference.
7. **GitHub Skills → Pages skill contents** — page body truncated on fetch.
8. **Cloudflare Pages "Static Forms" plugin** — confirmed to exist as a plugin in the Cloudflare
   Pages docs nav; its exact free-tier limits were not fetched.
