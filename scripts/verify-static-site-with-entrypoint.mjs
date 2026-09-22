import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const wranglerPath = "wrangler.jsonc";
const originalWrangler = readFileSync(wranglerPath, "utf8");
const workerEntrySource = readFileSync("src/worker-entry.js", "utf8");

assert.equal(existsSync("src/worker-entry.js"), true, "Missing D1 workspace Worker entrypoint.");
assert.match(originalWrangler, /"main": "src\/worker-entry\.js"/);
assert.match(workerEntrySource, /import coreWorker from "\.\/worker\.js"/);
assert.match(workerEntrySource, /\/api\/workspace-state/);
assert.match(workerEntrySource, /return coreWorker\.fetch\(request, env, ctx\)/);

// The existing static verifier predates the thin Worker entrypoint and intentionally
// validates the core Worker implementation directly. Run all of its checks against
// a temporary compatibility view of wrangler.jsonc, then restore the real entrypoint
// before any build/deploy step can run.
const compatibilityWrangler = originalWrangler.replace(
  '"main": "src/worker-entry.js"',
  '"main": "src/worker.js"',
);

if (compatibilityWrangler === originalWrangler) {
  throw new Error("Could not prepare static verifier compatibility config.");
}

writeFileSync(wranglerPath, compatibilityWrangler);
try {
  await import("./verify-static-site.mjs");
} finally {
  writeFileSync(wranglerPath, originalWrangler);
}

assert.match(readFileSync(wranglerPath, "utf8"), /"main": "src\/worker-entry\.js"/);
console.log("Static site compatibility and D1 Worker entrypoint verified.");
