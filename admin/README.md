# DCS Resource Hub — CMS / Admin Setup

This folder powers the editing UI at
**https://joemurrell.github.io/dcs-resource-hub/admin/**

It runs [Decap CMS](https://decapcms.org/) (the successor to Netlify CMS) with a
**GitHub backend**. Because the site is hosted on GitHub Pages (a static host with
no server), the GitHub OAuth login is handled by a small **Cloudflare Worker** that
acts as the OAuth proxy. Editors log in with their GitHub account; saving an entry
commits directly to this repository.

```
Browser (admin UI)  ──►  Cloudflare Worker (OAuth proxy)  ──►  GitHub OAuth
   decap-cms.js            decap-proxy.<sub>.workers.dev         login + token
        ▲                          │
        └──────── access token ────┘   then Decap commits to the repo via GitHub API
```

## Pieces

| Piece | Where | Notes |
|-------|-------|-------|
| CMS UI | `admin/index.html` | Loads `decap-cms@^3.0.0` from unpkg. |
| CMS config | `admin/config.yml` | Backend, collections, fields. |
| OAuth proxy | Cloudflare Worker `decap-proxy` | Source mirrored in [`worker/`](../worker/). |
| OAuth app | GitHub → Settings → Developer settings → OAuth Apps | Provides the client id/secret. |
| Content | `_data/resources.yml` | The data the CMS edits. |

## `admin/config.yml` backend

```yaml
backend:
  name: github
  repo: joemurrell/dcs-resource-hub
  branch: main
  base_url: https://decap-proxy.dcs-resource-hub.workers.dev   # the Cloudflare Worker
  auth_endpoint: /auth                                          # Decap trims the leading slash
```

- `base_url` is the Worker's URL — **not** GitHub and **not** the site.
- `auth_endpoint` may be `/auth` or `auth`; Decap trims slashes, so both resolve to
  `…workers.dev/auth`.

## The Cloudflare Worker (`decap-proxy`)

Source is mirrored in [`worker/src/index.js`](../worker/src/index.js). The deployed
copy lives in the Cloudflare dashboard (**Workers & Pages → decap-proxy → Edit code**).
**If you change one, update the other** — the dashboard is the source of truth for
what's actually running.

Routes:

| Path | Purpose |
|------|---------|
| `/auth?provider=github` | Redirects (302) to GitHub's authorize page. |
| `/callback?provider=github&code=…` | Exchanges the code for an access token and hands it back to the CMS popup via `postMessage`. |
| anything else | `Hello 👋` (a quick "is the worker alive?" check). |

### Worker environment variables / secrets

Set under **decap-proxy → Settings → Variables and Secrets**. Names are
**case-sensitive and must match exactly**:

| Name | Type | Value |
|------|------|-------|
| `GITHUB_OAUTH_ID` | Secret | OAuth App **Client ID** (e.g. `Ov23li…`). |
| `GITHUB_OAUTH_SECRET` | Secret | OAuth App **Client secret**. |
| `GITHUB_REPO_PRIVATE` | Plaintext | `0` for a public repo (controls the requested scope). |

## The GitHub OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → DCS Resource Hub CMS**:

- **Homepage URL:** `https://joemurrell.github.io/dcs-resource-hub`
- **Authorization callback URL:** `https://decap-proxy.dcs-resource-hub.workers.dev/callback`
  (must include `/callback`)
- The **Client ID** and a **Client secret** go into the Worker secrets above. If the
  token exchange ever fails with `incorrect_client_credentials`, regenerate the
  client secret here and re-paste it into the Worker, then redeploy.

## Login flow (what happens when you click "Login with GitHub")

1. Decap opens a popup to `…workers.dev/auth?provider=github`.
2. Worker **302-redirects** to `github.com/login/oauth/authorize?...&client_id=…`.
3. You approve → GitHub redirects to `…workers.dev/callback?...&code=…`.
4. Worker exchanges the `code` (+ client secret) for an access token.
5. Worker returns a tiny page that `postMessage`s the token to the CMS window; the
   popup closes and you're logged in.

## Gotchas (hard-won — read before debugging)

- **Use 302, not 301, for the `/auth` redirect.** A `301 Moved Permanently` gets
  **permanently cached by the browser**. Since Decap always opens the identical
  `/auth?provider=github` URL, a cached 301 makes the browser jump straight to a
  *stale* GitHub URL **without ever hitting the Worker** (no Worker logs, login
  silently broken). The Worker now sends `302` + `Cache-Control: no-store`. If you
  ever revert this, you'll see "login does nothing and there are no Worker logs,
  but manually visiting the URLs works" — that's the cached 301.
- **`client_id=undefined` on the GitHub page** means the Worker's `GITHUB_OAUTH_ID`
  secret isn't reaching the running deployment. Check the secret **name** matches
  exactly, and **redeploy** the Worker (Edit code → Deploy) so the new version
  picks up the binding.
- **Visiting `/callback` directly** just shows "Authorizing Decap…" forever — that's
  expected. That page only does something when it's a popup with a CMS window as
  `window.opener`. Test the real flow from `/admin/`, not by pasting the URL.
- **Debugging redirect caching:** test in an **Incognito/Private window** (no cache)
  or with DevTools → Network → "Disable cache". A plain hard-refresh won't always
  drop a cached 301.
- **Worker live logs:** decap-proxy → **Observability → Logs → Begin log stream**.

## Quick health checks

- `https://decap-proxy.dcs-resource-hub.workers.dev/` → should show `Hello 👋`.
- `https://decap-proxy.dcs-resource-hub.workers.dev/auth?provider=github` → should
  redirect to `github.com/login/oauth/authorize` with a **real** `client_id`.
