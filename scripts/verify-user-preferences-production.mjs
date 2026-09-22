import assert from "node:assert/strict";

const baseUrl = String(process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");

let response;
let body = {};
for (let attempt = 1; attempt <= 10; attempt += 1) {
  response = await fetch(`${baseUrl}/user-preferences/status`, { headers: { accept: "application/json" } });
  const contentType = response.headers.get("content-type") || "";
  body = /application\/json/.test(contentType) ? await response.json().catch(() => ({})) : {};
  if (
    response.status === 200
    && body.status === "success"
    && body.sourceOfTruth === "numeria-d1-user-preferences"
    && body.userPreferencesContractVersion === "numeria-d1-user-preferences.v1"
  ) break;
  await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
}

assert.equal(response?.status, 200, `user-preferences status HTTP ${response?.status}`);
assert.equal(body.status, "success");
assert.equal(body.storageDriver, "durable-d1");
assert.equal(body.durable, true);
assert.equal(body.tableReady, true);
assert.equal(body.sourceOfTruth, "numeria-d1-user-preferences");
assert.equal(body.userPreferencesContractVersion, "numeria-d1-user-preferences.v1");
assert.equal(body.userDataReturned, false);

console.log("Production D1 user preferences status verified.");
