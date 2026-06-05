// Decap CMS GitHub OAuth proxy — Cloudflare Worker.
//
// This is a mirror of the Worker deployed as `decap-proxy` in Cloudflare
// (Workers & Pages → decap-proxy). The Cloudflare dashboard copy is the one that
// actually runs; keep this file in sync when you change either one.
//
// See ../../admin/README.md for the full setup, the OAuth app, and the gotchas.
//
// Required environment variables (decap-proxy → Settings → Variables and Secrets):
//   GITHUB_OAUTH_ID      (Secret)    OAuth App Client ID
//   GITHUB_OAUTH_SECRET  (Secret)    OAuth App Client secret
//   GITHUB_REPO_PRIVATE  (Plaintext) "0" for a public repo

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Page returned to the OAuth popup. It hands the result back to the CMS window
// (window.opener) via postMessage using Decap's expected message format.
function callbackPage(status, payload) {
  return new Response(
    `<!doctype html><html><head><script>
      const receiveMessage = (message) => {
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify(payload)}', '*'
        );
        window.removeEventListener("message", receiveMessage, false);
      };
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    </script></head><body><p>Authorizing Decap… (${status})</p></body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientId = env.GITHUB_OAUTH_ID;
    const clientSecret = env.GITHUB_OAUTH_SECRET;

    // Step 1: kick off the OAuth flow — redirect to GitHub's authorize page.
    if (url.pathname === "/auth") {
      if (url.searchParams.get("provider") !== "github") {
        return new Response("Invalid provider", { status: 400 });
      }
      const priv =
        env.GITHUB_REPO_PRIVATE != null && env.GITHUB_REPO_PRIVATE !== "0";
      const scope = priv ? "repo,user" : "public_repo,user";
      const redirectUri = `https://${url.hostname}/callback?provider=github`;
      const authorizeUrl =
        `https://github.com/login/oauth/authorize?response_type=code` +
        `&client_id=${clientId}&redirect_uri=${redirectUri}` +
        `&scope=${scope}&state=${randomHex(4)}`;

      // IMPORTANT: 302 (temporary) + no-store. A 301 here gets permanently
      // cached by the browser and the login silently stops hitting this Worker.
      return new Response(null, {
        status: 302,
        headers: { Location: authorizeUrl, "Cache-Control": "no-store" },
      });
    }

    // Step 2: GitHub redirects back here with a code; exchange it for a token.
    if (url.pathname === "/callback") {
      if (url.searchParams.get("provider") !== "github") {
        return new Response("Invalid provider", { status: 400 });
      }
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const resp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `https://${url.hostname}/callback?provider=github`,
        }),
      });
      const data = await resp.json();

      if (!data.access_token) {
        // Surface the real failure instead of hanging on "Authorizing…".
        return callbackPage("error", {
          message: data.error_description || data.error || "no access_token",
        });
      }
      return callbackPage("success", { token: data.access_token, provider: "github" });
    }

    // Health check.
    return new Response("Hello 👋", { headers: { "Cache-Control": "no-store" } });
  },
};
