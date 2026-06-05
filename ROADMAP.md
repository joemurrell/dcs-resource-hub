# Roadmap

Backlog of features and enhancements for the DCS Resource Hub. (GitHub Issues
is disabled on this repo, so the backlog lives here.)

## In progress / done

- [x] **CI pipeline** — data validation, Jekyll build + HTMLProofer, worker
      lint. _(PR #10, merged)_
- [x] **Client-side search + tag filtering** — search box and clickable tag
      chips over the resource index; progressive enhancement, live result
      count, empty state. _(this PR)_

## Next up

- [ ] **Group resources by category** — render entries under tag/category
      headings instead of one flat list. Needs to compose with the search/tag
      filtering. A resource with multiple tags either appears under each or
      under a single primary category (decide which).
- [ ] **Content cleanup** — `_data/resources.yml` still has a placeholder
      `asdf` entry and a mis-linked "BVR Timeline Generator"; `about.md` and
      `_posts/2014-3-3-Hello-World.md` are stock Jekyll Now boilerplate.

## Later

- [ ] **External link-health check** — scheduled CI job (e.g. weekly cron)
      that pings every resource URL and flags 404s. Dead links are the main
      rot risk for a link directory.
- [ ] **"Date added" + sorting** — optional date per resource; newest-first
      sort and/or a "recently added" badge.
- [ ] **Richer per-resource metadata** — author/source, difficulty level, or
      DCS module icons.
- [ ] **Worker unit tests** — the Cloudflare OAuth proxy has real logic worth
      testing (would need a small Node/Vitest harness; note `package.json` is
      currently gitignored).
- [ ] **Social previews** — Open Graph / Twitter card images and a proper
      About page.
