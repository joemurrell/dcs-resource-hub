# Roadmap

Backlog of features and enhancements for the DCS Resource Hub. Tracked in
[GitHub Issues](https://github.com/joemurrell/dcs-resource-hub/issues); this
file is a quick at-a-glance index.

## Done

- [x] **CI pipeline** — data validation, Jekyll build + HTMLProofer, worker
      lint. _(PR #10)_
- [x] **Client-side search + tag filtering** — search box and clickable tag
      chips over the resource index. _(#12, PR #11)_

## In progress

- [ ] **Group resources by category** — render entries under category headings
      instead of one flat list, composing with search/tag filtering. _(#13)_

## Next up

- [ ] **Content cleanup** — placeholder data and stock Jekyll Now boilerplate
      pages. _(#14)_
- [ ] **External link-health check** — scheduled CI job that flags dead resource
      URLs. _(#15)_
- [ ] **"Date added" + sorting** — optional date per resource; newest-first
      sort and/or a "recently added" badge. _(#16)_
- [ ] **Richer per-resource metadata** — author/source, difficulty, module
      icons. _(#17)_
- [ ] **Worker unit tests** — cover the Cloudflare OAuth proxy logic. _(#18)_
- [ ] **Social previews + About page** — Open Graph cards and a real About
      page. _(#19)_
