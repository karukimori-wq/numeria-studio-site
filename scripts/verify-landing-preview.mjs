import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import coreWorker from "../src/worker.js";

const html = readFileSync("assets/welcome.html", "utf8");
const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));

assert.equal(wrangler.assets.run_worker_first.includes("/welcome"), true, "Worker must intercept /welcome before SPA fallback.");
assert.match(html, /<meta name="robots" content="noindex,nofollow">/, "Preview HTML should not be indexed.");
assert.equal((html.match(/<section\b/g) || []).length, 9, "Expected nine landing sections.");
assert.match(html, /data-method="numerology"/);
assert.match(html, /data-method="tarot"/);
assert.match(html, /data-layout="magazine"/);
assert.match(html, /架空のサンプル/, "The report demo should be identified as illustrative.");
assert.doesNotMatch(html, /https?:\/\/(?:api\.openai|api\.clerk|api\.stripe)\.com/, "Demo should not contain external API calls.");

const requested = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      requested.push(pathname);
      if (pathname === "/assets/welcome") {
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
      }
      if (pathname === "/original.html") {
        return new Response("<!doctype html><title>Legacy Numeria app</title>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
      return new Response("not found", { status: 404 });
    },
  },
};

const request = (path, method = "GET") => new Request("https://numeria-studio.com" + path, {
  method,
  headers: { Accept: "text/html" },
});

const preview = await coreWorker.fetch(request("/welcome"), env, {});
assert.equal(preview.status, 200);
assert.match(await preview.text(), /INTERACTIVE DEMO/);
assert.equal(preview.headers.get("Cache-Control"), "no-store, max-age=0");
assert.equal(preview.headers.get("X-Robots-Tag"), "noindex, nofollow");
assert.equal(requested.at(-1), "/assets/welcome");

const head = await coreWorker.fetch(request("/welcome", "HEAD"), env, {});
assert.equal(head.status, 200);
assert.equal(await head.text(), "");
assert.equal(head.headers.get("X-Robots-Tag"), "noindex, nofollow");

for (const path of ["/", "/original", "/original.html", "/app"]) {
  const response = await coreWorker.fetch(request(path), env, {});
  assert.equal(response.status, 200, "Old app route should remain valid: " + path);
  assert.match(await response.text(), /Legacy Numeria app/);
  assert.equal(requested.at(-1), "/original.html");
}
console.log("LP preview route and legacy app route regression checks passed.");
