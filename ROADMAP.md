# Roadmap

Backlog of features and enhancements for the DCS Resource Hub. Tracked in
[GitHub Issues](https://github.com/joemurrell/dcs-resource-hub/issues); this
file is a quick at-a-glance index.

## Done

- [x] **CI pipeline** — data validation, Jekyll build + HTMLProofer, worker
      lint. _(PR #10)_
- [x] **Client-side search + tag filtering** — search box and clickable tag
      chips over the resource index. _(#12, PR #11)_
- [x] **Group resources by category** — entries rendered under category
      headings, composing with search/tag filtering. _(#13, PR #20)_
- [x] **External link-health check** — scheduled CI job that flags dead
      resource URLs. _(#15)_
- [x] **"Date added" + sorting** — optional date per resource; newest-first
      ordering and a NEW badge. _(#16)_
- [x] **Worker unit tests** — cover the Cloudflare OAuth proxy logic. _(#18)_
- [x] **Content cleanup** — real About page, removed stock sample post. _(#14)_
- [x] **Richer per-resource metadata** — optional author/source and difficulty.
      _(#17)_
- [x] **Social previews** — Open Graph / Twitter card tags (image is
      config-driven via `og_image`). _(#19)_

## Ideas / backlog

- [ ] **DCS module icons** — per-resource airframe icons (needs icon art).
- [ ] **Social card image** — a 1200x630 `og_image` once art exists.
- [ ] **README cleanup** — the lower half is still stock Jekyll Now text.
