# Editing a GitHub-Pages-backed static site with no backend

Research notes. Every claim is tagged **[V]** = verified by fetching a doc page / probing a live URL,
or **[I]** = inferred. Target repo: `Dachui61/Dachui61.github.io` (public, default branch `main`,
Pages enabled, `content/work/*.md` is the content collection; existing entries:
`data-source-feasibility-and-compliance.md`, `diversity-ranking-and-ad-filtering-algorithms.md`,
`electron-python-sidecar-integration.md`, `metric-backends.md`, `oss-hotlist-aggregation-landscape.md`,
`private-apis-and-degradation.md`, `radar.md`, `temperature-backend-and-degradation.md`, `vitals.md`,
`why-no-privileged-component.md`). Routes: `src/pages/work/[slug].astro`, `src/pages/work/index.astro`.
Deploy: `.github/workflows/deploy.yml`. There is **no** `.github/ISSUE_TEMPLATE` directory today.

---

## 1. GitHub's built-in web editor URL scheme

All probed live with `curl -o /dev/null -w "%{http_code} -> %{redirect_url}"` against
`https://github.com/Dachui61/Dachui61.github.io/...` **[V]**. A `302 -> /login?return_to=...`
means "route is valid, login required"; a `200` means the page renders for anonymous visitors.

| Purpose | URL pattern | Probe result on this repo |
| --- | --- | --- |
| Edit an existing file | `https://github.com/{owner}/{repo}/edit/{branch}/{path}` | `302 -> login?return_to=…%2Fedit%2Fmain%2Fcontent%2Fwork%2Fradar.md` |
| Create a new file | `https://github.com/{owner}/{repo}/new/{branch}/{path}` | `302 -> login` (both `/new/main/content/work` and `/new/main/content/work/resume.md`) |
| Upload files | `https://github.com/{owner}/{repo}/upload/{branch}/{path}` | `200` |
| Delete a file | `https://github.com/{owner}/{repo}/delete/{branch}/{path}` | `302 -> login` |
| Rename/move | *(no `/move/` route — renaming is a UI action in the file tree)* | `404` on `/move/main/…` **[V]** |
| View file | `https://github.com/{owner}/{repo}/blob/{branch}/{path}` | `200` |
| Raw file | `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` | 200 (used in the API response's `download_url`) |
| New PR from a branch | `https://github.com/{owner}/{repo}/pull/new/{branch}` | `302 -> login` |
| Compare / new PR with prefill | `https://github.com/{owner}/{repo}/compare/{base}?expand=1&title=…&body=…` | `200` (form renders anonymously) |

Concrete instances for this repo:

```
https://github.com/Dachui61/Dachui61.github.io/edit/main/content/work/radar.md
https://github.com/Dachui61/Dachui61.github.io/new/main/content/work?filename=resume.md
https://github.com/Dachui61/Dachui61.github.io/delete/main/content/work/radar.md
```

**Prefilling a brand-new file's name and body** — `?filename=` and `?value=` are accepted on the
`/new/` route **[V]** (verified in production, not in GitHub's prose docs): kubernetes.io links to

```
https://github.com/kubernetes/website/new/main/content/en/docs/tasks/configure-pod-container/assign-memory-resource.md?filename=change-me.md&value=---\ntitle: "Long Page Title"\n…
```

**"Suggested change" / PR-based edit flow.** There is **no separate "suggested change" URL**. **[V]**
A grep of the entire `github/docs` content tree for `suggested change` returns only Copilot
suggestions — nothing about file editing. The PR-based edit flow is reached through the *same*
`/edit/{branch}/{path}` URL: GitHub Docs → "Editing files in another user's repository" says
*"When you edit a file in another user's repository, we'll automatically fork the repository and open
a pull request for you"*, and the final button is **"Propose changes"**.
- https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files
- https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files
  (same doc says: *"If you try to create a new file in a repository that you don't have access to, we
  will fork the project to your personal account and help you send a pull request"*)
- Docs also mention `github.dev` as an alternative in-browser editor, chosen from the dropdown on the
  file view.

So the tokenless, no-secret path for a visitor is: *"open this URL, log in with your own GitHub
account, type, click Propose changes"* — the site never holds a credential.

**Prefilled pull-request URLs** (documented, no token anywhere):
https://docs.github.com/en/pull-requests/reference/using-query-parameters-to-create-a-pull-request
— add query parameters to a compare URL:

| Parameter | Purpose |
| --- | --- |
| `quick_pull` | `?quick_pull=1` opens the "Open a pull request" page for the compared branches |
| `title` | PR title (`+` for spaces) |
| `body` | PR body |
| `labels` | comma-separated |
| `milestone`, `assignees`, `projects`, `template` | as listed in the doc |

Example: `https://github.com/Dachui61/Dachui61.github.io/compare/main...Dachui61:edit-resume?quick_pull=1&title=Update+resume&body=…`
*"Invalid query parameters or insufficient permissions return a 404 Not Found error. URLs that exceed
the server limit return a 414 URI Too Long error."*

---

## 2. The GitHub REST API write endpoints

### `PUT /repos/{owner}/{repo}/contents/{path}` — create or update a file

Docs: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents **[V]**

```
PUT https://api.github.com/repos/Dachui61/Dachui61.github.io/contents/content/work/radar.md
Accept: application/vnd.github+json
Authorization: Bearer <TOKEN>
X-GitHub-Api-Version: 2022-11-28
{
  "message": "Update resume",          // required — commit message
  "content": "<base64 of new file>",    // required — Base64 encoded
  "sha": "<blob sha of file being replaced>",  // required when updating
  "branch": "main",                     // optional; defaults to repo default branch
  "committer": { "name": "...", "email": "..." },   // optional
  "author":    { "name": "...", "email": "..." }    // optional
}
```

Scopes / permissions (verbatim from the docs) **[V]**:
> "OAuth app tokens and personal access tokens (classic) need the `repo` scope to use this endpoint.
> The `workflow` scope is also required in order to modify files in the `.github/workflows` directory."

> "The fine-grained token must have at least one of the following permission sets:
> `Contents` repository permissions (write) … `Contents` (write) and `Workflows` (write)"

Return **[V]**: `201 Created` for a new file, `200 OK` for an update; body is
`{ "content": { "sha": "<new blob sha>", "path", "html_url", "download_url", … },
   "commit":  { "sha": "<commit sha>", "html_url", "tree", "parents", … } }`
→ **the new blob SHA is `content.sha`; the commit SHA is `commit.sha`.**
Other statuses: `404` not found, `409 Conflict` (e.g. sha mismatch / concurrent write),
`422` validation failure or endpoint spammed. Docs note: don't call this and "Delete a file"
concurrently.

### `GET /repos/{owner}/{repo}/contents/{path}` — read a file (and its `sha`)

Same URL with `GET` **[V]**. Response for a file includes
`"type":"file"`, `"encoding":"base64"`, `"content"`, **`"sha"` (the blob SHA required by the PUT)**,
`"size"`, `"path"`, `"html_url"`, `"download_url"`, `"git_url"`, `_links`.
Optional `?ref={branch|tag|sha}` (defaults to the default branch). Works **without authentication**
for public repos. Custom media types: `application/vnd.github.raw+json`, `…html+json`, `…object+json`.
Note: files > 1 MB are limited to raw/object media types; > 100 MB unsupported.

### Fine-grained PAT: one repo ✅, one file path ❌

**[V]** "Managing your personal access tokens"
(https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens):
> "Each token is limited to access resources owned by a single user or organization.
> Each token can be further limited to only access specific repositories for that user or organization.
> Each token is granted specific, fine-grained permissions…"

The creation UI offers only *Resource owner → Repository access (All / Only select repositories /
Public only) → Permissions (repository / organization / account)*. **There is no path field** — the
word "path" does not appear anywhere in that document, and the fine-grained permission list
(https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
is a flat list of repository permissions (Contents, Issues, Pull requests, …).
→ **A fine-grained PAT can be limited to a single repository, but NOT to a single file path.**

**[V] Path-level scoping does exist — for GitHub Apps, not PATs.**
"Registering a GitHub App using URL parameters"
(https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-using-url-parameters):
> `single_file_name` | `string` | "This is a narrowly-scoped permission that allows the app to
> access a single file in any repository. When you set the `single_file` permission to `read` or
> `write`, this field provides the path to the single file your GitHub App will manage. If you need to
> manage multiple files, see `single_file_paths` below."
> `single_file_paths` | `array of strings` | "This allows the app to access up ten specified files in
> a repository…"

Caveat **[I]**: a GitHub App installation token must be minted server-side, so this reintroduces a
backend (or a GitHub-Actions step) — it defeats the "no backend" constraint.

**Alternative mitigation if you do put a token in the browser** **[V]**: a repository **ruleset** push
rule "Restrict file paths" (https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#restrict-file-paths)
— "Prevent commits that include changes in specified file paths from being pushed to the repository.
Limit is 200 entries…" — so the token can be neutered down to `content/**` at the repo level.

### Can the REST API commit from a browser with a token held only in the browser?

**Technically yes; GitHub's documented guidance says don't.** **[V]**

*Technically yes*: `api.github.com` answers with CORS open to any origin — probed live:

```
$ curl -s -D - -o /dev/null -H "Origin: https://example.com" \
    https://api.github.com/repos/Dachui61/Dachui61.github.io/contents/content/work/radar.md
HTTP/2 200
access-control-allow-origin: *
x-ratelimit-limit: 60
x-ratelimit-resource: core
```
so a page's JS can `PUT` with `Authorization: Bearer <pat>` and GitHub will accept it.

*Guidance* — exact quotes:

1. https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure
   > "**Never hardcode authentication credentials like tokens, keys, or app-related secrets into your
   > code.** Instead, consider using a secret manager such as Azure Key Vault or HashiCorp Vault."
   > "Don't push unencrypted authentication credentials like tokens or keys to any repository, even if
   > the repository is private."

2. https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app
   > "If your app is a public client (a native app that runs on the user's device, CLI utility, or
   > single-page web application), you cannot secure your client secret. You will have to ship the
   > client secret in the application's code, and you should use PKCE to better secure the
   > authentication flow."
   > "If your app is a website or web app, you should encrypt the tokens on your back end…"

3. https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
   > "Never include your app's client secret in client-side code or in code that runs on a user device."

4. https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
   > "Personal access tokens are like passwords, and they share the same inherent security risks."

Practical reading **[I]**: a PAT shipped in browser JS is readable by every visitor and by any
browser extension; it is equivalent to publishing it. Also note GitHub secret scanning will flag it
if it is committed to the repo.

---

## 3. Tokenless / no-secret patterns

### Unauthenticated commit to the repo?
**No.** **[V]** The Contents API's create/update endpoint requires a token (`repo` scope for classic,
`Contents: write` for fine-grained); there is no anonymous-commit path. The same is true for
creating issues: `POST /repos/{owner}/{repo}/issues` requires authentication
(https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#create-an-issue).

### GitHub Issues as an edit queue (visitor submits, owner merges)

The URL scheme is **officially documented** **[V]** —
https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query

> "You can use query parameters to open issues… You must have the proper permissions for any action
> to use the equivalent query parameter… If you create an invalid URL using query parameters, or if
> you don't have the proper permissions, the URL will return a `404 Not Found` error page. If you
> create a URL that exceeds the server limit, the URL will return a `414 URI Too Long` error page."

| Parameter | Example (from the doc) |
| --- | --- |
| `title` | `https://github.com/octo-org/octo-repo/issues/new?labels=bug&title=New+bug+report` |
| `body` | `…/issues/new?title=New+bug+report&body=Describe+the+problem.` |
| `labels` | `…/issues/new?labels=help+wanted,bug` |
| `milestone` | `…/issues/new?milestone=testing+milestones` |
| `assignees` | `…/issues/new?assignees=octocat` |
| `projects` | `…/issues/new?title=Bug+fix&projects=octo-org/1` |
| `template` | `…/issues/new?template=issue_template.md` (templates live in `ISSUE_TEMPLATE`, `docs/`, or `.github/`) |

Query parameters also work for custom fields of **issue form** templates.

**Live production example — MDN** **[V]**: developer.mozilla.org's "report this page" button links to

```
https://github.com/mdn/content/issues/new?template=page-report.yml&mdn-url=https%3A%2F%2Fdeveloper.mozilla.org%2F…&metadata=%3C%21--…%0AFolder%3A+%60en-us%2Fweb%2Fhtml%60…
```

i.e. exactly the "issue as edit queue" pattern, prefilled with the page identity.

For this repo the equivalent would be:

```
https://github.com/Dachui61/Dachui61.github.io/issues/new?title=Edit+résumé&body=…&labels=edit
https://github.com/Dachui61/Dachui61.github.io/issues/new/choose      # template chooser
```
(`template=` would only work after adding `.github/ISSUE_TEMPLATE/` — not present today. **[V]**)

**Open-source implementations of "GitHub Issues as the CMS"** (found via the GitHub repository
search API, descriptions verbatim) **[V]**:

| Repo | Stars | Description |
| --- | --- | --- |
| https://github.com/renatorib/github-blog | 409 | "Turn your github issues into a CMS for your blog." — npm `@rena.to/github-blog`; each issue = a post; labels carry taxonomy (`type:post`, `state:published`, `tag:…`, `flag:…`, `slug`) |
| https://github.com/oscarnevarezleal/gh-cms | 179 | "Headless CMS using Github Issues and Github Actions" |
| https://github.com/m4xshen/github-issue-blog | 109 | "Use GitHub issues as your blog." |
| https://github.com/AranScope/gityll | 15 | "Transform your issues into a blog. Using Github issues as a CMS." |
| https://github.com/rokuosan/github-issue-cms | 8 | "GitHub Issue-based Headless CMS for Hugo" |
| https://github.com/rootEnginear/gh-issues-cms | 6 | "Using GitHub issues as a CMS with Astro 🚀" |
| https://github.com/stack-wuh/x.wuh.site | 2 | "GitHub Issues 即 CMS" (Chinese personal site) |

**[I]** All of these need a *sync* step (GitHub Actions webhook, or a server) to turn issues into
build inputs; the "owner merges it" step is where the owner (or a bot) applies the change to
`content/work/*.md`. The purely static variants keep the issue only as a *request*, and the owner
hand-applies it.

Contrasts worth knowing **[I, names verified by repo search]**:
- Decap CMS — https://github.com/decaporg/decap-cms (GitHub backend, writes directly; needs OAuth/PKCE token or a proxy)
- Sveltia CMS — https://github.com/sveltia/sveltia-cms (Decap's successor)
- Staticman — https://github.com/Staticman/Staticman (posts comments/PRs; needs Netlify functions or a GitHub App)
- utterances / gitalk — https://github.com/utterance/utterances, https://github.com/gitalk/gitalk (use Issues as a *comment* store, i.e. the reverse direction)

### Prefilled PR URL so no token is ever needed in the browser
Covered in §1 — `https://github.com/{owner}/{repo}/compare/{base}...{head}?quick_pull=1&title=…&body=…`
plus the `/edit/` "Propose changes" (fork→branch→PR) route. The visitor's own GitHub session is the
only credential involved; nothing secret is stored in the site.

### GitHub Discussions as a queue
**[I / unverified]** `POST /repos/{owner}/{repo}/discussions` exists in the REST API, but I could not
fetch its reference page — `https://docs.github.com/en/rest/discussions/discussions` returned **404**
and the `github/docs` tree has no `content/rest/discussions/` page. Treat the Discussions API
details as unconfirmed; Issues are the documented, verified route.

---

## 4. Rate limits relevant to a browser-only integration

Source: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api **[V]**

**Primary**
- Unauthenticated: **60 requests/hour**, keyed to the **originating IP address**, not the user.
  (Live proof: an unauthenticated `GET .../contents/...` returned `x-ratelimit-limit: 60`,
  `x-ratelimit-resource: core`; and during this research a later unauthenticated API call failed with
  *"API rate limit exceeded for 220.202.224.35"*.)
- Authenticated (PAT / OAuth app / GitHub App user token): **5,000 requests/hour per user**; 15,000/hour
  if the app is owned by a GitHub Enterprise Cloud org. A higher-limit app reduces your PAT budget.
- GitHub App **installation** token: min 5,000/hour, +50/hour per repository beyond 20 repos,
  +50/hour per user beyond 20 (GHEC orgs), capped at 12,500; 15,000/hour for GHEC orgs.
- OAuth app using only client id+secret to read public data: 5,000/hour per app (15,000 on GHEC).
- `GITHUB_TOKEN` in Actions: **1,000 requests/hour per repository** (15,000 for GHEC).
- Git LFS: 300 requests/min unauthenticated, 3,000/min authenticated (separate bucket).

**Resource families** (`GET /rate_limit`) **[V]**: `core`, `search`, `code_search`, `graphql`,
`integration_manifest`, `dependency_snapshots`, `code_scanning_upload`, `actions_runner_registration`.
**There is no separate "write" family** — creating issues and creating commits consume `core`.

**Secondary limits** (same doc; identical wording in the GraphQL rate-limit doc) **[V]**:
- ≤ **100 concurrent requests** (shared REST + GraphQL).
- ≤ **900 points/minute** for REST endpoints (2,000/min for GraphQL).
- ≤ 90 s CPU time per 60 s.
- **Content creation: "no more than 80 content-generating requests per minute and no more than 500
  content-generating requests per hour are allowed. Some endpoints have lower content creation limits.
  Content creation limits include actions taken on the GitHub web interface as well as via the REST
  API and GraphQL API."**
- ≤ 2,000 OAuth access-token requests/hour.
- Point costs: GET/HEAD/OPTIONS = **1 point**; POST/PATCH/PUT/DELETE = **5 points** (so one
  `PUT /contents` = 5 points).
- "If you are making a large number of POST, PATCH, PUT, or DELETE requests, wait at least one second
  between each request."
- Endpoint-specific note on creating issues **[V]**: "This endpoint triggers notifications. Creating
  content too quickly using this endpoint may result in secondary rate limiting."
- Exceeding a primary limit → `403`/`429` with `x-ratelimit-remaining: 0`; a secondary limit →
  `403`/`429` with a `retry-after` header.

---

## 5. GitHub Pages' "Edit on GitHub" / `edit_url`

**GitHub Pages has no editing UI. The "Edit this page on GitHub" link is a convention that site
authors implement themselves.** Evidence **[V]**:
1. A grep of the *entire* `github/docs` content tree for `edit this page|edit on github|edit_url|editUrl`
   returns **zero** hits — GitHub's own docs never describe such a Pages feature.
2. The Pages settings docs (https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
   expose only *Build and deployment → Source (branch or GitHub Actions)*, custom domain, HTTPS and
   visibility. No edit control.
3. **Empirical, on this very site**: the deployed https://dachui61.github.io/ contains no injected
   edit link — the only GitHub href is the author's own `https://github.com/Dachui61/Dachui61.github.io`.
   (GitHub Pages serves static files; it cannot inject a link into arbitrary HTML.)
4. GitHub's *own* docs site hand-rolls it: `github/docs/src/frame/components/page-footer/Contribution.tsx`
   builds `https://github.com/github/docs/blob/main/content/${relativePath}` in code — a convention,
   not a platform feature.

**Real examples of the convention** **[V]** (links extracted from the live sites):
- Astro docs — https://docs.astro.build/en/guides/content-collections/ links to
  `https://github.com/withastro/docs/edit/main/src/content/docs/en/guides/content-collections.mdx`
- Kubernetes — `https://github.com/kubernetes/website/edit/main/content/en/docs/tasks/configure-pod-container/assign-memory-resource.md`,
  and the prefilled "create a new page" variant
  `https://github.com/kubernetes/website/new/main/content/en/docs/…md?filename=change-me.md&value=---…`
- MDN — uses the *issue* variant instead (see §3)
- GitHub's own docs — `/blob/main/content/...` link built in code

**Framework keys for the convention** — Starlight (Astro's docs framework) has it built in:
`editLink: { baseUrl: 'https://github.com/withastro/starlight/edit/main/', pattern: … }`
(https://starlight.astro.build/reference/configuration/#editlink) **[V]**.
Other ecosystems' key names (Docusaurus `editUrl`, VitePress `editLink`, Nextra `editLink`,
MkDocs `edit_uri`, Docsy `edit_link`) are **[I]** from memory, not verified here.

---

## Concrete URL set for this repo (copy-paste ready)

```
# view
https://github.com/Dachui61/Dachui61.github.io/blob/main/content/work/radar.md
https://raw.githubusercontent.com/Dachui61/Dachui61.github.io/main/content/work/radar.md

# owner edits in the browser (no token anywhere)
https://github.com/Dachui61/Dachui61.github.io/edit/main/content/work/<slug>.md
https://github.com/Dachui61/Dachui61.github.io/new/main/content/work?filename=<slug>.md
https://github.com/Dachui61/Dachui61.github.io/delete/main/content/work/<slug>.md

# visitor files an edit request as an issue (tokenless)
https://github.com/Dachui61/Dachui61.github.io/issues/new?title=Edit+<slug>&body=<proposal>&labels=edit
https://github.com/Dachui61/Dachui61.github.io/issues/new/choose

# prefilled PR (tokenless; the visitor's own session authors it)
https://github.com/Dachui61/Dachui61.github.io/compare/main...Dachui61:<branch>?quick_pull=1&title=…&body=…

# API read (unauthenticated OK; 60/h per IP)
GET https://api.github.com/repos/Dachui61/Dachui61.github.io/contents/content/work/<slug>.md?ref=main

# API write (needs Contents:write fine-grained PAT scoped to this repo, or classic PAT with repo scope)
PUT https://api.github.com/repos/Dachui61/Dachui61.github.io/contents/content/work/<slug>.md
```

## Recommendation implied by the evidence

1. **Best fit for "owner edits their own résumé, no backend": the `/edit/{branch}/{path}` link.**
   Zero credentials, zero rate-limit exposure, works today, GitHub handles the commit.
2. **Best fit for "a visitor proposes an edit": the prefilled `/issues/new?title=&body=` link**
   (officially documented parameter table), optionally with a `.github/ISSUE_TEMPLATE/` form, and the
   owner applies it via the `/edit/` link.
3. **Avoid a browser-held PAT.** It is technically possible (CORS is open) but it publishes a
   credential; if you must, scope it to the single repo (`Contents: write`) *and* add a repo ruleset
   "Restrict file paths" push rule, and prefer GitHub-Actions (`GITHUB_TOKEN`, 1,000/h) as the
   write path instead of the browser.
4. A **GitHub App with the `single_file` permission** is the only officially supported way to scope
   a credential to a single file path — but it needs a server to mint the installation token, which
   conflicts with "no backend".
