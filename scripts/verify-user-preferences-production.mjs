import assert from "node:assert/strict";

const baseUrl = String(process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/user-preferences/status`, { headers: { accept: "application/json" } });
const body = await response.json().catch(() => ({}));

assert.equal(response.status, 200, `user-preferences status HTTP ${response.status}`);
assert.equal(body.status, "success");
assert.equal(body.storageDriver, "durable-d1");
assert.equal(body.durable, true);
assert.equal(body.tableReady, true);
assert.equal(body.sourceOfTruth, "numeria-d1-user-preferences");
assert.equal(body.userDataReturned, false);

console.log("Production D1 user preferences status verified.");
