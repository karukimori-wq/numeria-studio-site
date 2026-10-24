import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const worker = readFileSync("src/worker.js", "utf8");
const routePatch = readFileSync("scripts/patch-app-route-dispatch.mjs", "utf8");
const routeRuntime = readFileSync("src/app-route-runtime.js", "utf8");
const formatPatch = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
const wrangler = readFileSync("wrangler.jsonc", "utf8");

for (const id of ["features", "transformation", "demo", "workflow", "style", "gallery", "pricing", "final"]) {
  assert.match(html, new RegExp(`id="${id}"`), `LP section ${id} is missing.`);
}
assert.equal((html.match(/<section class="hero"/g) || []).length, 1, "LP hero must be unique.");
assert.equal((html.match(/data-pain="[0-4]"/g) || []).length, 5, "LP must expose five problem themes.");
assert.equal((html.match(/data-method="(?:numerology|tarot)"/g) || []).length, 2);
assert.equal((html.match(/data-theme="(?:midnight|pearl)"/g) || []).length, 2);
assert.equal((html.match(/data-layout="(?:standard|magazine)"/g) || []).length, 2);
assert.match(html, /touchstart/);
assert.match(html, /ArrowRight/);
assert.match(html, /data-auth="sign-up"/);
assert.match(html, /data-auth="sign-in"/);
assert.match(html, /openSignUp/);
assert.match(html, /openSignIn/);
assert.match(html, /raw\.startsWith\("\/app"\)/);
assert.match(html, /!raw\.startsWith\("\/\/"\)/);
assert.doesNotMatch(html, /data-pending/);
assert.doesNotMatch(html, /\/api\/(?:appraisals|workspace-state|ai\/)/, "LP demo must not call private or appraisal APIs.");

assert.match(worker, /landingHtmlResponse/);
assert.match(worker, /url\.pathname === "\/"/);
assert.match(worker, /url\.pathname === "\/welcome"/);
assert.match(worker, /\["GET", "HEAD"\]/);
assert.match(worker, /url\.pathname\.startsWith\("\/app\/"\)/);
assert.match(worker, /return noStoreHtml\(await env\.ASSETS\.fetch\(request\)\)/);
assert.doesNotMatch(worker, /return originalHtmlResponse\(request, env\);\s*\n\s*}\s*\n\s*};\s*$/, "Unknown routes must not fall back to private HTML.");
assert.match(wrangler, /"not_found_handling": "404-page"/);
assert.match(wrangler, /"run_worker_first": true/);

for (const path of ["/app/home", "/app/clients", "/app/readings/new", "/app/reports", "/app/settings/report-formats"]) {
  assert.ok(routeRuntime.includes(path), `Missing app route ${path}`);
}
assert.match(routeRuntime, /location\.assign\("\/"\)/, "Logout must return to the public LP.");
assert.match(routeRuntime, /safeReturnPath/);
assert.match(routeRuntime, /api\.resumeSession\(data\.clientRef, data\.session\)/);
assert.match(routeRuntime, /dataset\.routeScreen/);
assert.match(routePatch, /numeria-app-routes-/);

for (const label of ["基本情報", "背景", "レイアウト", "配色", "文字サイズ", "ビジュアル", "掲載ページ"]) {
  assert.ok(formatPatch.includes(label), `Missing report-format setting: ${label}`);
}
assert.match(readFileSync("src/worker-entry.js", "utf8"), /scope\.planId === "pro" \? 30 : 3/);

for (const path of ["public/terms/index.html", "public/privacy/index.html", "public/contact/index.html"]) {
  assert.equal(existsSync(path), true, `Missing public page: ${path}`);
}

console.log("Site V2 verified: nine-section LP, isolated demo, Clerk entry, app routes, seven format settings, and strict Worker routing.");
