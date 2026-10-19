import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import preview from "../src/lp-preview-worker.js";
const config = JSON.parse(readFileSync("wrangler.lp-preview.jsonc", "utf8"));
assert.equal(config.name, "numeria-studio-lp-preview");
assert.equal(config.assets.run_worker_first, true);
assert.equal(config.assets.directory, "./lp-preview-dist");
for (const key of ["d1_databases", "services", "vars", "durable_objects", "r2_buckets", "kv_namespaces", "queues", "routes", "route", "triggers"]) {
  assert.equal(Object.hasOwn(config, key), false, "Preview must not access protected resources: " + key);
}
const requests = [];
const html = readFileSync("assets/welcome.html", "utf8");
const env = { ASSETS: { async fetch(request) { requests.push(new URL(request.url).pathname); return new Response(html, {headers:{"Content-Type":"text/html; charset=utf-8"}}); } } };
const get = p => new Request("https://example.workers.dev" + p, {headers:{"Accept":"text/html"}});
for (const p of ["/", "/welcome", "/welcome/"]) {
  const response = await preview.fetch(get(p), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
  assert.match(response.headers.get("Content-Security-Policy"), /connect-src 'none'/);
  assert.equal(requests.at(-1), "/");
}
const api = await preview.fetch(get("/api/usage"), env);
assert.equal(api.status, 404, "No authenticated API may be exposed on the preview domain.");
const post = await preview.fetch(new Request("https://example.workers.dev/welcome", {method:"POST"}), env);
assert.equal(post.status, 405);
assert.equal(existsSync("assets/welcome.html"), true);
console.log("Isolated LP Worker routing, CSP, noindex, API denial and no service bindings: passed.");
