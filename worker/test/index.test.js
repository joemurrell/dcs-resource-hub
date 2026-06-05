// Unit tests for the Decap CMS GitHub OAuth proxy worker.
//
// Runs on Node's built-in test runner (`node --test`) — no dependencies. The
// worker relies only on Web-standard globals (URL, Request, Response, fetch,
// crypto), all of which Node provides, so we can import its default export and
// call `fetch(request, env)` directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const ENV = {
  GITHUB_OAUTH_ID: "client123",
  GITHUB_OAUTH_SECRET: "secret456",
  GITHUB_REPO_PRIVATE: "0",
};

const call = (url, env = ENV) => worker.fetch(new Request(url), env);

test("/auth redirects to GitHub with the public_repo scope for a public repo", async () => {
  const res = await call("https://proxy.example/auth?provider=github");
  assert.equal(res.status, 302);

  const loc = res.headers.get("Location");
  assert.match(loc, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
  assert.match(loc, /client_id=client123/);
  assert.match(loc, /scope=public_repo,user/);
  assert.match(loc, /redirect_uri=https:\/\/proxy\.example\/callback\?provider=github/);
  // Must not be cached, or the browser stops hitting the worker on later logins.
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("/auth requests the full repo scope when the repo is private", async () => {
  const res = await call("https://proxy.example/auth?provider=github", {
    ...ENV,
    GITHUB_REPO_PRIVATE: "1",
  });
  assert.match(res.headers.get("Location"), /scope=repo,user/);
});

test("/auth rejects a non-github provider", async () => {
  const res = await call("https://proxy.example/auth?provider=gitlab");
  assert.equal(res.status, 400);
});

test("/callback without a code returns 400", async () => {
  const res = await call("https://proxy.example/callback?provider=github");
  assert.equal(res.status, 400);
  assert.equal(await res.text(), "Missing code");
});

test("/callback exchanges the code and returns a success page", async (t) => {
  const original = globalThis.fetch;
  let exchangeUrl;
  globalThis.fetch = async (url) => {
    exchangeUrl = url;
    return new Response(JSON.stringify({ access_token: "tok_abc" }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = original;
  });

  const res = await call("https://proxy.example/callback?provider=github&code=xyz");
  const body = await res.text();

  assert.equal(exchangeUrl, "https://github.com/login/oauth/access_token");
  assert.match(body, /authorization:github:success/);
  assert.match(body, /tok_abc/);
});

test("/callback surfaces token-exchange errors instead of hanging", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "bad_verification_code",
        error_description: "The code passed is incorrect or expired.",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  t.after(() => {
    globalThis.fetch = original;
  });

  const res = await call("https://proxy.example/callback?provider=github&code=bad");
  const body = await res.text();

  assert.match(body, /authorization:github:error/);
  assert.match(body, /incorrect or expired/);
});

// Mocks both fetches in the callback path: the token exchange and the
// subsequent GET /user used by the allowlist.
function mockGithub(login) {
  return async (url) => {
    if (String(url).includes("access_token")) {
      return new Response(JSON.stringify({ access_token: "tok_abc" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (String(url).includes("api.github.com/user")) {
      return new Response(JSON.stringify({ login }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error("unexpected fetch: " + url);
  };
}

test("/callback allows a user on the ALLOWED_GITHUB_USERS list", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = mockGithub("joemurrell");
  t.after(() => {
    globalThis.fetch = original;
  });

  const res = await worker.fetch(
    new Request("https://proxy.example/callback?provider=github&code=xyz"),
    { ...ENV, ALLOWED_GITHUB_USERS: "joemurrell" },
  );
  const body = await res.text();
  assert.match(body, /authorization:github:success/);
  assert.match(body, /tok_abc/);
});

test("/callback rejects a user not on the allowlist", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = mockGithub("someone-else");
  t.after(() => {
    globalThis.fetch = original;
  });

  const res = await worker.fetch(
    new Request("https://proxy.example/callback?provider=github&code=xyz"),
    { ...ENV, ALLOWED_GITHUB_USERS: "joemurrell" },
  );
  const body = await res.text();
  assert.match(body, /authorization:github:error/);
  assert.match(body, /not authorized/);
  // The token must not be handed back to a rejected user.
  assert.doesNotMatch(body, /tok_abc/);
});

test("the allowlist match is case-insensitive", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = mockGithub("JoeMurrell");
  t.after(() => {
    globalThis.fetch = original;
  });

  const res = await worker.fetch(
    new Request("https://proxy.example/callback?provider=github&code=xyz"),
    { ...ENV, ALLOWED_GITHUB_USERS: "joemurrell, someoneelse" },
  );
  assert.match(await res.text(), /authorization:github:success/);
});

test("an unknown path returns the health-check response", async () => {
  const res = await call("https://proxy.example/");
  assert.match(await res.text(), /Hello/);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});
