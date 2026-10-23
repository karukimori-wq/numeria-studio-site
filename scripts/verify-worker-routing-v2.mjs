import assert from "node:assert/strict";
import worker from "../src/worker.js";

const calls = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      calls.push({ pathname, method: request.method });
      if (pathname === "/index.html") return new Response("PUBLIC_LP", { headers: { "Content-Type": "text/html" } });
      if (pathname === "/original.html") return new Response("PRIVATE_APP_SHELL", { headers: { "Content-Type": "text/html" } });
      if (["/terms/index.html", "/privacy/index.html", "/contact/index.html"].includes(pathname)) return new Response("PUBLIC_INFO", { headers: { "Content-Type": "text/html" } });
      return new Response("missing", { status: 404, headers: { "Content-Type": "text/plain" } });
    },
  },
};

function request(path, method = "GET", accept = "text/html") {
  return new Request(`https://example.test${path}`, { method, headers: { Accept: accept } });
}

const root = await worker.fetch(request("/"), env, {});
assert.equal(await root.text(), "PUBLIC_LP");
assert.equal(root.headers.get("Cache-Control"), "private, no-store, max-age=0");
assert.match(root.headers.get("Vary") || "", /Cookie/);

const rootHead = await worker.fetch(request("/", "HEAD"), env, {});
assert.equal(rootHead.status, 200);
assert.equal(await rootHead.text(), "");

const welcome = await worker.fetch(request("/welcome"), env, {});
assert.equal(await welcome.text(), "PUBLIC_LP");
assert.equal(welcome.headers.get("X-Robots-Tag"), "noindex, nofollow");

const previewEnv = { ...env, NUMERIA_PREVIEW_NOINDEX: "1" };
const previewRoot = await worker.fetch(request("/"), previewEnv, {});
assert.equal(previewRoot.headers.get("X-Robots-Tag"), "noindex, nofollow");
const previewApp = await worker.fetch(request("/app/home"), previewEnv, {});
assert.equal(previewApp.headers.get("X-Robots-Tag"), "noindex, nofollow");

for (const path of ["/app", "/app/home", "/app/clients/client_demo", "/app/readings/new", "/app/reports/report_demo", "/app/settings/report-formats", "/original", "/original.html", "/ai-reading"]) {
  const response = await worker.fetch(request(path), env, {});
  assert.equal(response.status, 200, `${path} should return the private application shell.`);
  assert.equal(await response.text(), "PRIVATE_APP_SHELL");
}

for (const path of ["/terms", "/privacy", "/contact"]) {
  const response = await worker.fetch(request(path), env, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "PUBLIC_INFO");
}

const unknown = await worker.fetch(request("/not-a-real-route"), env, {});
assert.equal(unknown.status, 404);
assert.equal(await unknown.text(), "missing");

const asset = await worker.fetch(request("/assets/missing.png", "GET", "image/png"), env, {});
assert.equal(asset.status, 404);

const nestedAsset = await worker.fetch(request("/app/assets/missing.css", "GET", "text/css"), env, {});
assert.equal(nestedAsset.status, 404);
assert.notEqual(await nestedAsset.text(), "PRIVATE_APP_SHELL");

assert.ok(calls.some((call) => call.pathname === "/index.html"));
assert.ok(calls.some((call) => call.pathname === "/original.html"));
console.log("Worker routing V2 verified: LP/app split, GET/HEAD, legacy entries, public info pages, and strict unknown-route 404.");
