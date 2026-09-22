import assert from "node:assert/strict";
import worker from "../src/worker-entry.js";

class MockD1 {
  constructor() {
    this.workspaceStates = new Map();
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }
}

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM workspace_states")) {
      return this.db.workspaceStates.get(this.args[0]) || null;
    }
    if (this.sql.includes("FROM usage_records")) return null;
    return null;
  }

  async all() {
    return { results: [] };
  }

  async run() {
    if (this.sql.includes("INTO workspace_states")) {
      const [scopeKey, workspaceId, userId, workspaceStateJson, updatedAt] = this.args;
      this.db.workspaceStates.set(scopeKey, {
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        workspace_state_json: workspaceStateJson,
        updated_at: updatedAt,
      });
    }
    return { success: true };
  }
}

async function jsonFetch(path, options = {}, env) {
  const response = await worker.fetch(new Request(`https://local.test${path}`, options), env);
  const body = await response.json();
  return { response, body };
}

const env = { NUMERIA_DB: new MockD1() };
const headers = {
  "content-type": "application/json",
  "x-workspace-id": "ws_d1_state",
  "x-user-id": "user_d1_state",
};

const empty = await jsonFetch("/api/workspace-state?workspaceId=ws_d1_state", { headers }, env);
assert.equal(empty.response.status, 200);
assert.equal(empty.body.status, "success");
assert.equal(empty.body.workspaceState, null);
assert.equal(empty.body.migrationRequired, true);
assert.equal(empty.body.sourceOfTruth, "numeria-d1-workspace-state");

const workspaceState = {
  appraisal_profiles: [{ id: "client-1", name: "Test Client", history: [{ id: "h1", theme: "test" }] }],
  saved_presets: [{ id: "preset-1", name: "Default" }],
  feedback_items: [{ id: "feedback-1", category: "使いにくい" }],
  app_settings: { template: "celestial-gate", practitionerName: "Tester" },
};

const saved = await jsonFetch("/api/workspace-state", {
  method: "PUT",
  headers,
  body: JSON.stringify({ workspaceId: "ws_d1_state", workspaceState }),
}, env);
assert.equal(saved.response.status, 200);
assert.equal(saved.body.status, "success");
assert.equal(saved.body.sourceOfTruth, "numeria-d1-workspace-state");
assert.equal(saved.body.workspaceState.appraisal_profiles[0].id, "client-1");
assert.equal(saved.body.workspaceState.saved_presets[0].id, "preset-1");

const reloaded = await jsonFetch("/api/workspace-state?workspaceId=ws_d1_state", { headers }, env);
assert.equal(reloaded.response.status, 200);
assert.equal(reloaded.body.migrationRequired, false);
assert.equal(reloaded.body.workspaceState.appraisal_profiles[0].history[0].id, "h1");
assert.equal(reloaded.body.workspaceState.app_settings.practitionerName, "Tester");

const health = await jsonFetch("/health", {}, env);
assert.equal(health.response.status, 200);
assert.equal(health.body.status, "success");

console.log("D1 workspace state entrypoint verified.");
