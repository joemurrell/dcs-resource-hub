# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The DCS Resource Hub is a curated link directory for Digital Combat Simulator,
built as a **Jekyll static site** (Jekyll Now lineage) hosted on **GitHub Pages**
at `https://joemurrell.github.io/dcs-resource-hub/`. There is no application
server: all dynamic behaviour is either build-time Liquid or client-side JS.
Content is edited by non-developers through a **Decap CMS** UI at `/admin`,
authenticated by a small **Cloudflare Worker** OAuth proxy.

Site URL config lives in `_config.yml`: `url: https://joemurrell.github.io` +
`baseurl: "/dcs-resource-hub"`. Always build internal links with
`{{ site.baseurl }}` — omitting it breaks links on the live Project Pages path.

## Commands

`script/test.sh` runs the **exact same checks as CI**, in order. Prefer it over
running steps ad hoc:

```bash
script/test.sh                          # full local CI: validate data, check + test worker, build, proof HTML
ruby script/validate_resources.rb       # validate _data/resources.yml only (fast gate)
bundle exec jekyll serve                 # local dev server with live reload
bundle exec jekyll build --trace         # production build into _site/
( cd worker && node --test )            # worker unit tests
node --test worker/test/index.test.js   # a single worker test file
ruby script/check_links.rb              # external link-health check (slow; scheduled, not in the build gate)
```

Ruby toolchain is pinned via the `github-pages` gem (Gemfile) to match what
GitHub Pages runs — `bundle install` before building. A **UTF-8 locale is
required** (`LANG=C.UTF-8 LC_ALL=C.UTF-8`); the SCSS converter aborts on the
em-dashes in stylesheet comments under an ASCII locale. `script.test.sh` and CI
set this for you.

## Architecture & key conventions

### Content is data, not pages

Every resource lives as one entry in **`_data/resources.yml`** under a top-level
`items:` list. There are no per-resource files. `index.html` renders the whole
list at build time with Liquid. Adding/editing a resource = editing this one YAML
file (directly, or via the CMS which commits it back to `main`).

### `admin/config.yml` is the single source of truth for allowed values

The Decap CMS `select` field options (the **tags** list and **difficulty** list)
are defined once in `admin/config.yml`. `script/validate_resources.rb` reads
those options back out of that file and validates `resources.yml` against them —
it deliberately does **not** hard-code its own copy. When you add a new allowed
tag or difficulty level, change `admin/config.yml`; the validator and CMS stay in
sync automatically. Do not duplicate these lists elsewhere.

The validator enforces: required non-blank `title` and well-formed unique http(s)
`url`; `tags`/`difficulty` must be known CMS options; optional `date` must parse.

### The "Parent / Child" tag hierarchy

Tags use a `"Parent / Child"` convention with **spaces around the slash** (e.g.
`"Air-to-Ground / CAS"`). The spaces are load-bearing: they distinguish a
hierarchy from literal names like `"F/A-18C"`. Across `index.html` and
`resource-filter.js`:

- The parent segment (before `" / "`) drives **category grouping** and **parent
  filter chips**; children render as nested chips.
- A resource's `data-tags` attribute carries each tag *and* its derived parent
  (lowercased), so selecting a parent chip also matches resources tagged only
  with a child.
- Resources are grouped under the parent of their **first** tag (`item.tags[0]`).

### Rendering & filtering split

- **`index.html`** (Liquid, build time): builds the tag/difficulty facets,
  groups resources by category, sorts each group newest-first by `date` (undated
  entries follow dated ones), numbers entries with a continuous counter, and adds
  a `NEW` badge for entries dated within the last 30 days.
- **`assets/js/resource-filter.js`** (client side): progressive enhancement only
  — the full list is server-rendered, so it works with JS disabled. JS just
  hides/shows entries. Filter logic: search text AND tag-facet AND difficulty-
  facet, with OR *within* each facet.

Keep these two in sync — e.g. the difficulty order strings (`Beginner,
Intermediate, Advanced`) and the lowercased `data-*` values both files rely on.

### The Cloudflare Worker is a mirror

`worker/src/index.js` is a **mirror** of the `decap-proxy` Worker deployed in the
Cloudflare dashboard, which is the copy that actually runs. **Changing one
requires updating the other.** It implements the GitHub OAuth flow for the CMS
(`/auth` → GitHub authorize, `/callback` → token exchange, anything else →
health check). See `admin/README.md` for the full setup, OAuth app, secrets, and
hard-won gotchas (notably: the `/auth` redirect **must be 302, not 301** — a
cached 301 silently breaks login).

## CI

- `.github/workflows/ci.yml` runs on push to `main` and all PRs: `validate-data`
  (fast gate), `build` (Jekyll build + HTMLProofer with external links disabled),
  and `test-worker` (`node --check` + `node --test`).
- `.github/workflows/link-check.yml` runs `script/check_links.rb` on a schedule
  to flag dead resource URLs — kept off the PR gate because external requests are
  slow/flaky.

## Roadmap

`ROADMAP.md` is a quick at-a-glance index of done/backlog items; the source of
truth for work items is GitHub Issues.
