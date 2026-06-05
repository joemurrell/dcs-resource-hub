# decap-proxy — Cloudflare Worker

OAuth proxy that lets the GitHub-Pages-hosted Decap CMS log in with GitHub.

- **Deployed as:** `decap-proxy` in Cloudflare (Workers & Pages).
- **Public URL:** `https://decap-proxy.dcs-resource-hub.workers.dev`
- **Source:** [`src/index.js`](src/index.js) — a mirror of the deployed code. The
  Cloudflare dashboard copy is what actually runs; keep them in sync.

Full setup, secrets, the GitHub OAuth app, and debugging notes are documented in
[`../admin/README.md`](../admin/README.md).

> Note: the live Worker may also contain temporary `console.log` lines used while
> debugging. They're intentionally left out of this mirror — strip them from the
> dashboard too once you no longer need them (they log the client id).
