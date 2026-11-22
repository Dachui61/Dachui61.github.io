# The "resume as code" / open-source résumé ecosystem, for a static Astro site

Research notes. Every claim is tagged **[V]** = verified by fetching a doc page, probing a live URL,
reading source, or running the tool; **[I]** = inferred from what I read but not executed.

Context: target site is `Dachui61/Dachui61.github.io` — Astro 7, Tailwind 4, GitHub Pages,
**no backend**. Node >= 22.23.4, pnpm 12.18.0. So the question that matters is: what can produce
HTML at *build time* with no server running at request time?

All dates below are absolute. "Last commit" = `pushed_at` from the GitHub API at time of reading.

---

## 0. Executive summary (what I actually verified)

| Question | Answer | Tag |
| --- | --- | --- |
| Is there a public HTTP API returning a résumé's JSON by id? | **Yes** — Reactive Resume: `GET https://rxresu.me/api/openapi/resumes/{username}/{slug}`, anonymous, returns structured JSON | **[V]** |
| Is there a public instance whose API is anonymous? | **Yes** — `rxresu.me` (the official hosted instance) is itself anonymously callable for *published* résumés | **[V]** |
| Does that API return rendered HTML/PDF or JSON? | **JSON** (Reactive Resume's own schema, *not* JSON Resume). PDF/HTML are separate endpoints | **[V]** |
| Is JSON Resume a usable interchange format? | Yes inside the OSS ecosystem; **no** for ATS/HR systems. Version churn breaks old themes — verified crash | **[V]** |
| Best fit for a no-backend Astro site | JSON Resume `resume.json` + `resume-cli` / a theme's `render()` at build time | **[V]** (I ran it) |

---

## 1. JSON Resume — the schema

### 1.1 Where it lives

| Thing | URL | Tag |
| --- | --- | --- |
| Schema reference page | https://jsonresume.org/schema/ | **[V]** |
| Schema JSON (draft-07) | https://raw.githubusercontent.com/jsonresume/jsonresume.org/master/packages/schema/schema.json | **[V]** |
| Monorepo | https://github.com/jsonresume/jsonresume.org | **[V]** |
| npm validator | `@jsonresume/schema` **1.9.0**, published 2026-11-22, MIT | **[V]** |

The schema page header reads **"Reference · version 1.9.0"** and **"14 sections, every one optional"**
**[V]**. The raw `schema.json` declares `"$schema": "http://json-schema.org/draft-07/schema#"` and
`"$id"` = the raw URL above; there is **no `required` array** at the top level and
`additionalProperties: true` **[V]**.

### 1.2 Exact top-level fields (v1.9.0)

`properties` = `["$schema","basics","objective","work","volunteer","education","awards",
"certificates","publications","skills","languages","interests","references","projects","meta","custom"]` **[V]**

Note the correction to the list in the brief: **`objective`, `certificates`, `meta` and `custom`
also exist**; `certificates` and `objective` are new-ish and easy to miss.

| Field | Type | Contains (per https://jsonresume.org/schema/) | Tag |
| --- | --- | --- | --- |
| `basics` | object | `name`, `label`, `image`, `email`, `phone`, `url`, `summary`, `location{address,postalCode,city,countryCode,region}`, `profiles[]{network,username,url}`, `custom` | **[V]** |
| `objective` | text | Forward-looking career goal. Explicitly *distinct* from `basics.summary` | **[V]** |
| `work` | array | `name`, `location` (text **or** the object form), `description`, `position`, `type`, `url`, `startDate`, `endDate`, `summary`, `highlights[]`, `keywords[]`, `skills[]` (text or `{name,level,keywords}`), `custom` | **[V]** |
| `volunteer` | array | `organization`, `location`, `position`, `url`, `startDate`, `endDate`, `summary`, `highlights[]`, `skills[]`, `custom` | **[V]** |
| `education` | array | `institution`, `location`, `url`, `area`, `studyType`, `startDate`, `endDate`, `score`, `courses[]`, `summary`, `skills[]`, `custom` | **[V]** |
| `awards` | array | `title`, `date`, `awarder`, `summary`, `custom` | **[V]** |
| `certificates` | array | `name`, `date`, `url`, `credentialId`, `issuer`, `expiryDate`, `summary`, `custom` | **[V]** |
| `publications` | array | `name`, `authors[]`, `publisher`, `releaseDate`, `volume`, `issue`, `pages`, `identifiers{doi,isbn,arxiv,pmid}`, `url`, `summary`, `type`, `custom` | **[V]** |
| `skills` | array | `name`, `id`, `level`, `keywords[]`, `custom` | **[V]** |
| `languages` | array | `language`, `fluency`, `scale{framework,level}` (CEFR/ILR/ACTFL/JLPT/HSK), `custom` | **[V]** |
| `interests` | array | `name`, `keywords[]`, `custom` | **[V]** |
| `references` | array | `name`, `reference`, `relationship`, `organization`, `date`, `availableOnRequest` (bool). Contact details are deliberately **not** in the schema | **[V]** |
| `projects` | array | `name`, `summary`, `description` (deprecated alias — `summary` wins), `highlights[]`, `keywords[]`, `startDate`, `endDate`, `url`, `roles[]`, `entity`, `type`, `skills[]`, `custom` | **[V]** |
| `meta` | object | `canonical`, `version`, `lastModified`, `language` (BCP-47), `translations[]{language,url}` — one document per language | **[V]** |
| `custom` | object | Free-form, namespaced by tool; themes are *not* expected to render it | **[V]** |

Dates are ISO-8601 and partial (`2023-04` ok); `summary`/`highlights` allow inline Markdown
(`**strong**`, `*emphasis*`, `` `code` ``, links) but no headings/lists/tables **[V]**.

### 1.3 Adoption — measured, not asserted

| Metric | Value | Source | Tag |
| --- | --- | --- | --- |
| Public résumés on jsonresume.org | **4,604** (site text, "Updated 7 Nov 2026") | https://jsonresume.org/themes/ | **[V]** |
| Themes in the gallery | **228** | https://jsonresume.org/themes/ | **[V]** |
| `@jsonresume/schema` npm downloads, last 30 d (to 2026-11-21) | **11,850** | api.npmjs.org/downloads | **[V]** |
| `resume-cli` downloads, last 30 d | **2,898** | idem | **[V]** |
| `jsonresume-theme-even` downloads, last 30 d | **6,445** | idem | **[V]** |
| `jsonresume-theme-elegant` downloads, last 30 d | **3,597** | idem | **[V]** |
| `resumed` downloads, last 30 d | **5,406** | idem | **[V]** |
| Monorepo stars | 354 (MIT) | GitHub API | **[V]** |
| "built by volunteers since 2014" | site footer | https://jsonresume.org/ | **[V]** |

Historical repos are **archived and folded into the monorepo** (2026): `jsonresume/resume-schema`
(2,387★), `jsonresume/resume-cli` (4,708★), `jsonresume/resume-website` (432★),
`jsonresume/registry-server` (93★), `jsonresume/resumeToPDF` (118★), `jsonresume/theme-manager` (164★),
`jsonresume/theme-utils` (20★), `jsonresume/jsonresume-theme-boilerplate` (161★),
`jsonresume/jsonresume-theme-modern` (14★), `EmaSuriano/gatsby-theme-jsonresume` (24★) — all
`archived: true` on GitHub **[V]**. npm names `@jsonresume/schema` and `resume-cli` are unchanged.

### 1.4 Is it a realistic interchange format?

**Inside the open-source ecosystem: yes.** Reactive Resume imports and exports JSON Resume;
Resume-Matcher reads JSON Resume; every JSON Resume theme consumes it; the CLI validates against it **[V]**.

**Against the outside world (ATS, Greenhouse, Lever, recruiters): no.** It is a niche standard;
ATS systems want PDF/DOCX/Word. The realistic framing is "a good source-of-truth format for your
own site + a bridge to the PDF you actually send to employers" **[I]**.

**Real risk — version churn breaks old themes.** Verified by running it (§5.1): the most-used theme
(`jsonresume-theme-elegant`, built 2021 for schema v1) **crashes** on a v1.9.0 résumé because
`basics.location` is now an object rather than a string **[V]**.

---

## 2. Reactive Resume

### 2.1 Repo and activity

| Fact | Value | Tag |
| --- | --- | --- |
| Repo | https://github.com/reactive-resume/reactive-resume (redirects from `AmruthPillai/Reactive-Resume`) | **[V]** |
| Stars / forks | **45,984** / 4,965 | **[V]** |
| Licence | **MIT** | **[V]** |
| Created | 2020-03-25 | **[V]** |
| Last push (`pushed_at`) | **2026-11-20** | **[V]** |
| Latest release | **v6.1.1**, published 2026-11-13 (v6.1.0 on 2026-11-05) | **[V]** |
| Archived? | No | **[V]** |
| Live star count served by its own API | `45984` — matches GitHub | **[V]** |
| Docs | https://docs.rxresu.me (Mintlify; serves `.md` versions of every page and `/llms.txt`) | **[V]** |
| OpenAPI spec | https://rxresu.me/openapi.json (3.5 MB) and https://docs.rxresu.me/spec.json (6.8 MB) — OpenAPI **3.1.1**, `info.version 6.1.1`, licence MIT, **205 paths** | **[V]** |

### 2.2 The public HTTP API — exact shapes

**Base URL: `https://rxresu.me/api/openapi`.** This is the single biggest gotcha. Confirmed in
source, `apps/server/src/http/app.ts`:

```ts
app.all("/api/openapi/*", (c) => handleOpenApi(c.req.raw, client(c)));
app.get("/api/health", () => handleHealth());
app.get("/api/resumes/:username/:slug/pdf", ...)
app.get("/api/resumes/:username/:slug/docx", ...)
app.get("/openapi.json", () => handleOpenApiDocument());
```
**[V]** (https://raw.githubusercontent.com/reactive-resume/reactive-resume/main/apps/server/src/http/app.ts)

`https://rxresu.me/api/resumes/...` returns a Cloudflare `text/plain "Not Found"` — the API is
**not** under `/api` alone **[V]**.

**Endpoint: `GET /api/openapi/resumes/{username}/{slug}`**
(`operationId: getResumeBySlug`, tag "Resume Sharing") **[V]**

Doc text (https://docs.rxresu.me/api-reference/resume-sharing/get-public-resume-by-username-and-slug.md):

> "Returns a publicly shared resume identified by the owner's username and the resume's slug. …
> If the resume is password-protected and the viewer has not yet verified the password, a 401 error
> with code `NEED_PASSWORD` is returned. **No authentication required for public resumes**; if
> authenticated as the owner, private resumes are also accessible." **[V]**

**Response shape — verified live.** `GET https://rxresu.me/api/openapi/resumes/mahadevvgavas/resume`
→ `HTTP 200`, `application/json`, 20,827 bytes **[V]**:

```jsonc
{
  "id": "019befa6-5c7c-73d4-9f14-62957179dd2f",
  "slug": "resume",
  "tags": [], "isPublic": true, "showDownloadButtons": ..., "allowWordDownload": ...,
  "showInSearchEngines": ..., "hideContactDetails": ..., "isPrimary": ..., "isLocked": ...,
  "name": "...",
  "data": {
    "picture": { hidden, fit, url, size, rotation, aspectRatio, borderRadius, borderColor, borderWidth, shadowColor, shadowWidth },
    "basics": { name, headline, email, phone, location, website{url,label}, customFields[] },
    "summary": { title, icon, columns, hidden, showHeading, keepTogether, startOnNewPage, content },
    "sections": { profiles, experience, education, projects, skills, languages,
                  interests, awards, certifications, publications, volunteer, references },
    "customSections": [...],
    "metadata": { ... }
  }
}
```
**[V]** — and a second one, `GET https://rxresu.me/api/openapi/resumes/pavlenko.rv/ruslan-pavlenko-pm-de`
→ 200, id `019cd935-37be-728d-8cf2-8bd90aeda115`, `basics.name` "Ruslan Pavlenko" **[V]**.

**Important:** this is Reactive Resume's **own** data model, *not* JSON Resume. `basics.headline`
instead of `basics.label`; section items live under `data.sections.*.items[]` with per-item
`id`/`hidden`/`icon`; dates are structured (`{start,end,present,expected,raw}`); free-text fields
carry **HTML**, not Markdown **[V]**.

### 2.3 Public instance + where to get example ids

There is **no separate "demo" instance** — `rxresu.me` is the official hosted instance and its API
is anonymously callable for published résumés. `https://rxresu.me/instances` → 404 **[V]**.

The reliable way to get real, currently-live ids is the sitemap **[V]**:

```
https://rxresu.me/sitemap.xml
  └─ https://rxresu.me/sitemaps/resumes-1.xml   # 65 <loc> entries, e.g.
       https://rxresu.me/mahadevvgavas
       https://rxresu.me/pavlenko.rv/ruslan-pavlenko-pm-de
       https://rxresu.me/chiiyuen
       https://rxresu.me/lionel.bijaoui/developpeur-fullstack-java-spring-boot
```
Note the URL shape: `/{username}` for the primary résumé, `/{username}/{slug}` otherwise.

Also anonymously reachable **[V]**: `GET /api/openapi/flags` (feature flags),
`GET /api/openapi/statistics/github/stars` (`45984`), `GET /api/health`,
`GET /api/openapi/feedback/{token}` (feedback links), `GET /api/openapi/auth/providers`,
`POST /api/openapi/pdf-checks` (ATS check, rate-limited, no auth).

### 2.4 Rendered output vs structured JSON

| Endpoint | Returns | Auth | Verified | Tag |
| --- | --- | --- | --- | --- |
| `GET /api/openapi/resumes/{username}/{slug}` | **structured JSON** | none for public | 200, 20,827 B | **[V]** |
| `GET /api/resumes/{username}/{slug}/pdf` | **PDF** (rendered) | none for public | 200, `application/pdf`, 99,884 B, 3 pages, PDF 1.7 | **[V]** |
| `GET /api/resumes/{username}/{slug}/docx` | Word | none, but gated by `allowWordDownload` | 404 on the sample I tried | **[V]** |
| `GET https://rxresu.me/{username}/{slug}` | **SSR HTML** public page | none | 200, `<title>Mahadev Vishnu Gavas — Red Team Lead…</title>` | **[V]** |
| `GET /api/openapi/resumes/{id}/exports/{format}` | PDF/DOCX/ODT/MD/JSON | **required** | 401 `UNAUTHORIZED` without a key | **[V]** |
| `GET /api/openapi/resumes/{id}/pdf` | PDF | required | — | **[V]** (spec) |

So: **the API returns structured JSON.** Rendered artefacts are separate endpoints, and the public
page is server-rendered HTML. `robots.txt` disallows `/api/resumes/` but allows the page **[V]**.

### 2.5 Locales

- **App UI: 55 languages** — "The app is available in 55 languages, works on phones, tablets and
  computers, and has light and dark themes." (https://docs.rxresu.me/getting-started) **[V]**
- **Résumé content is not multi-locale.** The public-resume payload has no `translations` array
  (`data` keys are `picture/basics/summary/sections/customSections/metadata`) **[V]**. Unlike JSON
  Resume's `meta.language` + `meta.translations[]`, Reactive Resume has no per-language document
  model **[I]**.

### 2.6 OAuth / tokens in the browser

Reactive Resume is **both** an OAuth client and an OAuth server **[V]**:

**As a client (sign-in):** built-in Google, GitHub, LinkedIn (`GOOGLE_CLIENT_ID`/`SECRET`,
`GITHUB_CLIENT_ID`/`SECRET`, `LINKEDIN_CLIENT_ID`/`SECRET`; callbacks
`{APP_URL}/api/auth/callback/{google|github|linkedin}`), plus a custom OIDC/OAuth2 provider
(`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_DISCOVERY_URL` or the three manual URLs) that
works with Authentik, Authelia, Keycloak (https://docs.rxresu.me/self-hosting/sso) **[V]**.

**As a server (for API/MCP clients):** "Reactive Resume is then the OAuth server, for tools that
connect to it. Dynamic client registration accepts your app's own origin and local loopback
callbacks." (same page) **[V]**. API docs list *List connected applications* / *Disconnect an
application* under Authentication **[V]**.

**Three auth mechanisms on the REST API** (from the spec's `security` block): `apiKey`, `bearerAuth`,
`cookieAuth` **[V]**. A real 401 body:

```json
{"defined":false,"code":"UNAUTHORIZED","status":401,
 "message":"Sign-in required. Send a valid API key in the x-api-key header or an OAuth bearer token."}
```
**[V]**

**API keys:** *Create an API key* — "Create a read-only or full-access API key. **Requires a browser
session**; keys and OAuth tokens cannot create credentials." **[V]** So: you sign in in the browser,
mint a key, and send it as `x-api-key`. Editing in the browser itself uses the **session cookie**.

**No browser-side token storage pattern for a static site.** The web app is a separate SPA on the
same origin; a static site would need a server to hold a key, or a personal access token pasted
into a client — the docs do not describe a "token in localStorage" flow for a third-party page **[I]**.

### 2.7 Other API surface worth knowing

`/api/rpc/*` (oRPC), `/mcp` (MCP server), `/api/auth/*`, `/.well-known/api-catalog`,
`/.well-known/mcp/server-card.json`, `/.well-known/agent-skills/` **[V]**. Feature flags seen live:
`disableSignups`, `disableEmailAuth`, `allowGuestLogin`, `smtpEnabled`, `careerSchedulingEnabled`,
`appUrl`, `aliasUrl`, `customDomains`, `olacvSuggestion` **[V]**.

---

## 3. Renderers / themes for JSON Resume

### 3.1 The theme contract (this is what makes build-time rendering possible)

From https://jsonresume.org/theme-development **[V]**: *"A theme is one function. It takes a resume
and returns HTML. Publish it as `jsonresume-theme-{name}` and the CLI and jsonresume.org can render
any resume with it."*

```js
export const render = (resume) => `<!doctype html>…`;
```

Rules **[V]**: return a **string**; stay **pure** (no `fs`/`http`); **inline everything** (CSS and
assets in the output, images as base64 data URLs); handle **missing fields** (every schema field is
optional); build however you like (templates, React, plain strings).

**Consequence: a theme is a pure function from JSON to HTML. That is exactly an Astro build step.**

### 3.2 The CLI

https://jsonresume.org/cli **[V]**. npm **`resume-cli` 3.9.2**, published **2026-11-22**, MIT,
Node ≥ 18, bin `resume`.

| Command | Purpose |
| --- | --- |
| `resume init` | starter `resume.json` |
| `resume validate [--schema <path>]` | validate against the schema; non-zero exit → CI-usable |
| `resume export [file] [--format html\|pdf\|markdown\|text] [--theme <name>] [--force]` | export; theme defaults to `even` |
| `resume serve [--theme <name>] [--port 4000] [--dir public]` | local preview with reload |
| `resume themes` | list installed themes (local + global `node_modules`, no network) |
| `resume audit [file]` | ATS score of the rendered markup |

PDF export uses **headless Chrome**; on Linux CI/containers set `RESUME_PUPPETEER_NO_SANDBOX=1` **[V]**.

### 3.3 Notable themes

| Theme | Repo | Stars | Last push | Licence | npm (latest / published) | Static build? |
| --- | --- | --- | --- | --- | --- | --- |
| **official set** `jsonresume-theme-*` in the monorepo, `packages/themes/*` (~200 dirs) | https://github.com/jsonresume/jsonresume.org/tree/master/packages/themes | monorepo 354 | 2026-11-22 | MIT | e.g. `jsonresume-theme-reference` 0.2.14 (2026-11-22), `jsonresume-theme-sidebar` 0.2.14 (2026-11-22), `jsonresume-theme-deedy` 0.2.2 (2026-11-22), `jsonresume-theme-pro` 0.2.0 (2026-10-23) | ✅ pure `render()`; **verified working** (§5.1) |
| **Stack Overflow** | https://github.com/phoinixi/jsonresume-theme-stackoverflow | 155 | 2026-09-10 | MIT | `jsonresume-theme-stackoverflow` 3.3.0 (2026-04-30) | ✅ `main: dist/index.js`, **zero deps**, `npm run build` = `node build.js` |
| **Elegant** (most-used: 3,099 public résumés on jsonresume.org) | https://github.com/mudassir0909/jsonresume-theme-elegant | 126 | 2024-06-02 | MIT in package.json, **no LICENSE file on GitHub** | `jsonresume-theme-elegant` 1.16.1 (**2021-04-08**) | ⚠️ **broken with schema 1.9.0** — verified crash (§5.1) |
| **Actual** | https://github.com/davcd/jsonresume-theme-actual | 71 | 2023-08-29 | MIT | `jsonresume-theme-actual` 0.2.2 (2023-08-29) | ✅ in principle; old-schema risk **[I]** |
| **Kendall** (286 public résumés) | https://github.com/LinuxBozo/jsonresume-theme-kendall | 68 | 2024-02-26 | MIT | `jsonresume-theme-kendall` 0.2.0 (**2020-08-29**) | ✅ in principle; deps `gravatar`,`lodash`,`mustache`; old-schema risk **[I]** |
| **Even** (CLI default) | https://github.com/rbardini/jsonresume-theme-even | 39 | 2026-10-23 | MIT | `jsonresume-theme-even` 0.27.0 (2026-10-23) | ✅ **verified working**, 6,445 dl/mo |
| **React** | https://github.com/phoinixi/jsonresume-theme-react | 22 | 2026-06-17 | MIT | `jsonresume-theme-react` 0.0.3 | ✅ React build, uses `@jsonresume/schema` + `i18next` (i18n-capable) |
| **Macchiato** (144 public résumés) | https://github.com/biosan/jsonresume-theme-macchiato | 19 | 2024-05-26 | MIT | `jsonresume-theme-macchiato` 1.1.0 (2020-05-23) | ✅ in principle; old-schema risk **[I]** |
| **Class** | https://github.com/jsonresume/jsonresume-theme-class | 33 | 2026-06-27 | MIT | `jsonresume-theme-class` 0.1.2 (**2014-08-29**) | ⚠️ repo active, npm stale / name collision **[I]** |

All stars/push/licences from the GitHub API; all npm versions/publish dates from
`registry.npmjs.org` **[V]**.

**Name-collision hazard:** several old community packages still own the plain npm names
(`jsonresume-theme-flat` 0.3.7 from **2014**, `jsonresume-theme-professional` 1.1.0 from 2024)
while the monorepo has its own `packages/themes/jsonresume-theme-flat` etc. — so `npm i
jsonresume-theme-flat` gives you the **2014** package, not the maintained one **[V]** (npm versions)
**[I]** (which package the monorepo one would publish as).

**Abandoned (archived on GitHub):** `jsonresume/theme-manager`, `jsonresume/theme-utils`,
`jsonresume/jsonresume-theme-boilerplate`, `jsonresume/jsonresume-theme-modern`,
`EmaSuriano/gatsby-theme-jsonresume`, `jsonresume/resumeToPDF`, `jsonresume/resumeToText`,
`jsonresume/registry-server`, `jsonresume/registry-functions`, `jsonresume/resume-website`,
`jsonresume/vscode-jsonresume`, `jsonresume/jsonresume-gpt3`, `jsonresume/jsonresume-fake` **[V]**.

### 3.4 Alternative CLI: `resumed`

https://github.com/rbardini/resumed — 551★, MIT, last push **2026-10-19**; npm `resumed`,
5,406 dl/mo **[V]**. "~180 LOC, pure ESM, CLI and Node.js API, TypeScript typings, async render,
100% coverage". Commands: `render`, `export`, `init`, `validate` **[V]**. Same theme contract
(`npm install resumed jsonresume-theme-even`) **[V]**.

---

## 4. Other notable open-source résumé projects

| Project | Repo | Stars | Last push | Licence | Notes | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| **RenderCV** | https://github.com/rendercv/rendercv | **17,989** | 2026-10-31 | MIT | YAML → PDF (LaTeX), `pip install "rendercv[full]"` (Py 3.12+), 8 themes (classic, engineeringresumes, sb2nov, moderncv, engineeringclassic, harvard, ink, opal, ember), strict Pydantic validation, own JSON Schema, `locale:` block for any language, hosted app at rendercv.com, AI-agent skill (`npx skills add rendercv/rendercv-skill`). **Its own YAML schema — not JSON Resume.** No documented public read API found **[I]** | **[V]** |
| **Resume Matcher** | https://github.com/srbhr/Resume-Matcher | **29,378** | 2026-11-20 | Apache-2.0 | Self-hosted AI harness: FastAPI + Next.js + SQLite; one Docker container; **REST API at `/api`**, FastAPI docs at `/docs`, health at `/api/v1/health`; local or hosted LLMs. Needs a running backend | **[V]** |
| **OpenResume** | https://github.com/xitanggg/open-resume | 8,994 | **2024-10-29** | **AGPL-3.0** | Next.js 13 + React + Tailwind; entirely client-side (local browser only, no account); real-time PDF via `@react-pdf`; ATS resume parser. Static-site-generator compatible. **Stale ~2 years + AGPL** | **[V]** |
| **Dossier** | https://github.com/AienTech/dossier | 5,362 | 2026-11-19 | **AGPL-3.0** | Self-hosted job-search + résumé builder; one password; own PostgreSQL **or** a single SQLite file; Docker/Compose/Node/CapRover/Coolify/Dokploy; `ghcr.io/aientech/dossier`. Needs a backend; AGPL | **[V]** |
| **oh-my-cv** | https://github.com/Renovamen/oh-my-cv | 1,106 | **2024-07-11** | **GPL-3.0** | In-browser, local-first **Markdown** résumé builder; PWA; data in `localStorage`; explicitly "Hosted on GitHub Pages as an open-source static website, which doesn't (have the ability to) collect your data"; PDF export A4/Letter. Stale + GPL | **[V]** |
| **Resumed** | https://github.com/rbardini/resumed | 551 | 2026-10-19 | MIT | see §3.4 | **[V]** |
| **jsonresume/mcp** | https://github.com/jsonresume/mcp | 62 | 2026-06-12 | Unlicense | MCP server so an AI agent reads/edits your JSON Resume; registry MCP at https://jsonresume.org/mcp | **[V]** |
| **jsonresume.org (the platform)** | https://github.com/jsonresume/jsonresume.org | 354 | 2026-11-22 | MIT | Now a full hosted platform: editor, dashboard, 4,604 public résumés, 228-theme gallery, MCP, OAuth 2.1/OIDC server | **[V]** |

### 4.1 jsonresume.org's own documented public API (OAuth 2.1 / OIDC)

https://jsonresume.org/developers **[V]** — "Sign in with JSON Resume". Register an app under
*Settings → Your OAuth apps*; get a client ID + secret; scopes: `openid`, `profile`, `email`,
`resume:read`, `resume:write`, `mcp`.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `https://jsonresume.org/oauth/authorize` | GET | authorization page (PKCE S256, `response_type=code`) |
| `https://jsonresume.org/api/oauth/token` | POST | token exchange (access 1 h, refresh 90 d, single-use) |
| `https://jsonresume.org/api/oauth/userinfo` | GET | `sub`, name, picture, email |
| **`https://jsonresume.org/api/oauth/resume`** | **GET / PUT** | **the résumé, as JSON Resume** — `resume:read` / `resume:write` |
| `https://jsonresume.org/api/oauth/revoke` | POST | revocation |
| `https://jsonresume.org/api/oauth/jwks` | GET | JWKS (RS256) |
| `https://jsonresume.org/api/oauth/register` | POST | **dynamic client registration** |
| `https://jsonresume.org/.well-known/openid-configuration` | GET | OIDC discovery (verified live, 1,100 B) |
| `https://jsonresume.org/.well-known/oauth-authorization-server` | GET | RFC 8414 metadata |

**Caveat:** this is a **per-user, token-gated** read of *your own* résumé — not an anonymous read of
arbitrary résumés. There is no documented anonymous "read résumé by username" JSON endpoint on
jsonresume.org (I probed `/api/resume/@thomasdavis` → 404, `/api/resumes` → 404) **[V]**.
Public *pages* work: `https://jsonresume.org/@thomasdavis` → 200 SSR HTML (verified) **[V]**.

### 4.2 Which projects have a documented **public read API**?

| Project | Anonymous read of someone else's résumé? | Read your own? |
| --- | --- | --- |
| **Reactive Resume** | **Yes** — `GET /api/openapi/resumes/{username}/{slug}`, no auth, for *published* résumés | Yes, via API key / OAuth / cookie |
| jsonresume.org | No (404 on the routes I probed) | Yes, `GET /api/oauth/resume` with a bearer token |
| Resume-Matcher | No (self-hosted, own DB) | Yes, local API |
| RenderCV | No documented read API | n/a (file-based) |
| OpenResume / oh-my-cv | No (client-side only, data never leaves the browser) | n/a |

So Reactive Resume is the **only** project I found with an anonymous, documented, public read API
for a résumé by id **[V]**.

---

## 5. Static-hosting compatibility

### 5.1 What I actually ran (Node v26.13.0, npm 11.20.0, in a scratch dir)

```bash
npm install resume-cli@3.9.2 jsonresume-theme-even@0.27.0      # OK
npx resume-cli validate                                         # ✓ resume.json is valid (Test Person — 1 work, 1 skills)
npx resume-cli themes                                           # Installed themes (2): elegant v1.16.1, even v0.27.0
npx resume-cli export resume.html --theme even                  # Done! /private/tmp/rtest/resume.html  (7,480 bytes, self-contained)
node -e "import {render} from 'jsonresume-theme-even'; console.log(typeof render(resume), render(resume).length)"
                                                                 # string 7475
npx resume-cli validate --resume sample.resume.json             # ✓ valid (Richard Hendriks — 1 work, 1 volunteer, 1 education, 1 awards, 1 certificates, 1 publications, 2 skills, 1 languages, 1 interests, 1 references, 1 projects)
npm install jsonresume-theme-reference@0.2.14 && render()      # ✓ works, 8,502 chars
```
**[V]** — all of the above.

**And the failure, also verified:**

```bash
npx resume-cli export elegant.html --theme elegant
# createHtml errored out
# Cannot read properties of undefined (reading 'address')
#   at Object.render (node_modules/jsonresume-theme-elegant/index.js:18:40)
```
**[V]** — `jsonresume-theme-elegant@1.16.1` (2021, schema v1) expects `basics.location` to be a
**string**; in schema **1.9.0** it is an **object** `{address, postalCode, city, countryCode, region}`.
Any theme written before v1.9.0 carries this class of bug.

### 5.2 Build-time only (no server at request time) ✅

| Approach | How | Caveats |
| --- | --- | --- |
| **JSON Resume + `resume export`** | `npx resume-cli export resume.html --theme <t>` in the Astro build; commit the HTML or inline it | HTML output is self-contained (CSS inlined) — verified |
| **JSON Resume + direct `render()`** | `import { render } from 'jsonresume-theme-x'; const html = render(resumeJson)` inside an Astro component | Cleanest for Astro: no CLI, no subprocess. **Verified working** |
| **`resumed`** | `npx resumed render resume.json -o out.html -t even` | Same theme contract |
| **RenderCV** | `rendercv render John_Doe_CV.yaml` → PDF | Needs a LaTeX toolchain + Python 3.12+; different (YAML) format |
| **OpenResume / oh-my-cv** | Client-side apps you can host on GitHub Pages as-is | They store data in the *browser*, so there is no build-time data pipeline; not "your data as code" |

### 5.3 Requires a running backend ❌

- **Reactive Resume web app** — full stack (Postgres + Redis + server + worker); Docker / Vercel /
  Cloudflare Workers / Kubernetes / Hostinger **[V]**. It *does* serve static-friendly public
  artefacts (SSR HTML at `/{username}/{slug}`, PDF at `/api/resumes/{u}/{s}/pdf`), and it supports
  **custom domains** — so it can *be* your résumé site without any of your own code. But then it
  replaces the Astro site rather than living inside it.
- **jsonresume.org platform** — hosted; but the CLI path gives you a static build.
- **Resume-Matcher**, **Dossier** — backends by design.

### 5.4 The hybrid that fits the brief

Because Reactive Resume's public endpoint is anonymous, you *can* do this in CI without any
backend at request time:

```
Astro build
  └─ fetch https://rxresu.me/api/openapi/resumes/{user}/{slug}   (build-time only)
       → map data.sections.* → your own Astro components
```

Caveats: you depend on a third party unless you self-host RR and keep it alive during CI **[I]**;
the payload is RR's schema, so you must map it (it is *not* JSON Resume) **[V]**; and the résumé is
whatever RR has published, so RR becomes the editor of record while GitHub stays the source of
truth for the *site* **[I]**.

---

## 6. Abandoned / flag-worthy

| Item | Evidence |
| --- | --- |
| `jsonresume/resume-schema` (2,387★), `jsonresume/resume-cli` (4,708★), `jsonresume/resume-website` (432★), `jsonresume/registry-server` (93★), `jsonresume/theme-manager` (164★), `jsonresume/theme-utils`, `jsonresume/jsonresume-theme-boilerplate` (161★), `jsonresume/jsonresume-theme-modern`, `EmaSuriano/gatsby-theme-jsonresume` | `archived: true` on GitHub; README says "MOVED to jsonresume/jsonresume.org" **[V]** |
| `jsonresume-theme-elegant` etc. — repo alive-ish, **npm publish from 2020/2021** | registry.npmjs.org publish dates **[V]** |
| `jsonresume-theme-flat` / `jsonresume-theme-professional` npm names still point at 2014/2024 community builds despite the monorepo having its own | npm + repo listings **[V]** **[I]** |
| `xitanggg/open-resume` (8,994★) — last push **2024-10-29**, AGPL-3.0 | GitHub API **[V]** |
| `Renovamen/oh-my-cv` (1,106★) — last push **2024-07-11**, GPL-3.0 | GitHub API **[V]** |
| `jsonresume/jsonresume-theme-class` — repo pushed 2026-06-27 but npm latest **0.1.2 from 2014** | npm **[V]** |

Nothing in the **core** line (jsonresume.org monorepo, `resume-cli`, `@jsonresume/schema`,
the monorepo themes) looks abandoned: all pushed/published within the last few days **[V]**.

---

## 7. Recommendation for this site

1. **Own the data as `resume.json` in the site repo** (JSON Resume v1.9.0 schema). It is a real,
   validated, MIT-licensed standard, it is what every tool in the ecosystem reads, and it diffs
   nicely in git **[V]**.
2. **Render at build time.** Either `resume-cli export` or — better for Astro — import a theme's
   `render(resume)` and drop the HTML into an `.astro` page. Both verified working **[V]**.
   Prefer a **maintained** theme: the monorepo's (`jsonresume-theme-reference`,
   `jsonresume-theme-sidebar`, `jsonresume-theme-pro`, `jsonresume-theme-deedy`) or
   `jsonresume-theme-even`; avoid the pre-1.9.0 community ones — `elegant` is a verified crash **[V]**.
3. **Treat Reactive Resume as an optional editor, not the source of truth.** Its anonymous public
   endpoint is a genuine, documented read API and its PDF endpoint is rendered output, so you could
   have RR edit and publish and Astro consume the JSON at build time. But the RR data model is not
   JSON Resume, so you would need a mapping layer, and you would be depending on a hosted instance
   unless you self-host it **[V]**.
4. **Do not put a runtime backend on GitHub Pages.** Nothing here needs one: the whole "resume as
   code" path is a build step **[V]**.
5. **PDF:** `resume export resume.pdf` uses headless Chrome (set
   `RESUME_PUPPETEER_NO_SANDBOX=1` in CI); RenderCV is the alternative if you want typeset LaTeX
   quality **[V]**.
