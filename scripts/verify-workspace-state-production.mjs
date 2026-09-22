import assert from "node:assert/strict";

const baseUrl = (process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/workspace-state/status`, {
  headers: { accept: "application/json" },
});
const body = await response.json().catch(() => ({}));

assert.equal(response.status, 200, `Workspace state status failed: ${response.status}`);
assert.equal(body.status, "success");
assert.equal(body.storageDriver, "durable-d1");
assert.equal(body.durable, true);
assert.equal(body.tableReady, true);
assert.equal(body.sourceOfTruth, "numeria-d1-workspace-state");
assert.equal(body.workspaceStateContractVersion, "numeria-d1-workspace-state.v1");
assert.equal(body.userDataReturned, false);

console.log("Production D1 workspace state status verified.");
