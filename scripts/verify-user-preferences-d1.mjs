import assert from "node:assert/strict";
import worker from "../src/worker-entry.js";

class MockD1 {
  constructor() {
    this.preferences = new Map();
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
    if (this.sql.includes("sqlite_master")) {
      const tableName = this.args[0];
      if (["user_preferences", "workspace_states"].includes(tableName)) return { name: tableName };
      return null;
    }
    if (this.sql.includes("FROM user_preferences")) {
      return this.db.preferences.get(this.args[0]) || null;
    }
    if (this.sql.includes("FROM usage_records")) return null;
    return null;
  }
  async all() {
    return { results: [] };
  }
  async run() {
    if (this.sql.includes("INTO user_preferences")) {
      const [scopeKey, workspaceId, userId, primaryDivination, enabledJson, updatedAt] = this.args;
      this.db.preferences.set(scopeKey, {
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        primary_divination: primaryDivination,
        enabled_divinations_json: enabledJson,
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
  "x-workspace-id": "ws_preferences",
  "x-user-id": "user_preferences",
};

const status = await jsonFetch("/user-preferences/status", {}, env);
assert.equal(status.response.status, 200);
assert.equal(status.body.status, "success");
assert.equal(status.body.storageDriver, "durable-d1");
assert.equal(status.body.tableReady, true);
assert.equal(status.body.userDataReturned, false);
assert.equal(status.body.sourceOfTruth, "numeria-d1-user-preferences");

const empty = await jsonFetch("/api/user-preferences?workspaceId=ws_preferences", { headers }, env);
assert.equal(empty.response.status, 200);
assert.equal(empty.body.initializationRequired, true);
assert.deepEqual(empty.body.preferences, {
  primary_divination: "numerology",
  enabled_divinations: ["numerology"],
});
assert.equal(empty.body.planStoredHere, false);
assert.equal(empty.body.roleStoredHere, false);

const saved = await jsonFetch("/api/user-preferences", {
  method: "PUT",
  headers,
  body: JSON.stringify({
    workspaceId: "ws_preferences",
    primary_divination: "four-pillars",
    enabled_divinations: ["numerology", "four-pillars", "four-pillars"],
    plan: "business",
    role: "admin",
  }),
}, env);
assert.equal(saved.response.status, 200);
assert.equal(saved.body.preferences.primary_divination, "four-pillars");
assert.deepEqual(saved.body.preferences.enabled_divinations, ["numerology", "four-pillars"]);
assert.equal(saved.body.planStoredHere, false);
assert.equal(saved.body.roleStoredHere, false);
assert.equal("plan" in saved.body.preferences, false);
assert.equal("role" in saved.body.preferences, false);

const reloaded = await jsonFetch("/api/user-preferences?workspaceId=ws_preferences", { headers }, env);
assert.equal(reloaded.body.initializationRequired, false);
assert.equal(reloaded.body.preferences.primary_divination, "four-pillars");
assert.deepEqual(reloaded.body.preferences.enabled_divinations, ["numerology", "four-pillars"]);

console.log("D1 user preferences contract verified; plan and role remain outside this store.");
