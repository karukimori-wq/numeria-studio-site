import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    if (this.sql.includes("sqlite_master")) {
      const tableName = this.args[0];
      if (["workspace_states", "user_preferences"].includes(tableName)) return { name: tableName };
      return null;
    }
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

const patchSource = readFileSync("scripts/patch-d1-workspace-state.mjs", "utf8");
assert.doesNotMatch(patchSource, /legacy-supabase-migrated-to-d1/);
assert.doesNotMatch(patchSource, /migrationRequired&&typeof X/);
assert.match(patchSource, /source:\\"d1-empty\\"/);
assert.match(patchSource, /no Supabase data migration is performed/);

const env = { NUMERIA_DB: new MockD1() };
const headers = {
  "content-type": "application/json",
  "x-workspace-id": "ws_d1_state",
  "x-user-id": "user_d1_state",
};

const status = await jsonFetch("/workspace-state/status", {}, env);
assert.equal(status.response.status, 200);
assert.equal(status.body.status, "success");
assert.equal(status.body.storageDriver, "durable-d1");
assert.equal(status.body.tableReady, true);
assert.equal(status.body.userDataReturned, false);
assert.equal(status.body.sourceOfTruth, "numeria-d1-workspace-state");
assert.equal(status.body.workspaceStateContractVersion, "numeria-d1-workspace-state.v1");

const empty = await jsonFetch("/api/workspace-state?workspaceId=ws_d1_state", { headers }, env);
assert.equal(empty.response.status, 200);
assert.equal(empty.body.status, "success");
assert.equal(empty.body.workspaceState, null);
assert.equal(empty.body.initializationRequired, true);
assert.equal("migrationRequired" in empty.body, false);
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
assert.equal(reloaded.body.initializationRequired, false);
assert.equal(reloaded.body.workspaceState.appraisal_profiles[0].history[0].id, "h1");
assert.equal(reloaded.body.workspaceState.app_settings.practitionerName, "Tester");

const reportFormat = {
  schemaVersion: 3,
  pages: [{
    pageId: "page_v3",
    layoutRegions: [{
      regionId: "region_v3",
      columns: 1,
      ratio: "100",
      columnBlocks: [[{ blockId: "block_v3", type: "page-title", content: "テスト鑑定書" }]],
    }],
  }],
};
const savedFormat = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: reportFormat, expectedRevision: 0 }),
}, env);
assert.equal(savedFormat.response.status, 200);
assert.equal(savedFormat.body.revision, 1);
assert.equal(savedFormat.body.format.pages[0].pageId, "page_v3");
assert.equal(savedFormat.body.pageLimit, 3);

const freeDefinitions = await jsonFetch("/api/report-page-definitions?methodKey=numerology", { headers }, env);
assert.equal(freeDefinitions.response.status, 200);
assert.equal(freeDefinitions.body.planId, "free");
assert.equal(freeDefinitions.body.definitions.length, 4);
assert.equal(freeDefinitions.body.definitions[0].pageDefinitionId, "NUM-01");
assert.equal(freeDefinitions.body.definitions[0].availabilityCondition, "8結果が全て確定。未算出項目があれば理由付き利用不可");
for (const [methodKey, expectedPrefix, expectedCount] of [
  ["numerology", "NUM", 4],
  ["tarot", "TAR", 4],
  ["nine-star-ki", "KIG", 4],
  ["four-pillars", "BAZ", 5],
  ["western-astrology", "AST", 4],
  ["zi-wei-dou-shu", "ZIW", 4],
]) {
  const catalog = await jsonFetch(`/api/report-page-definitions?methodKey=${methodKey}`, { headers }, env);
  assert.equal(catalog.response.status, 200);
  assert.equal(catalog.body.methodKey, methodKey);
  assert.equal(catalog.body.definitions.length, expectedCount);
  assert.ok(catalog.body.definitions.every((definition) => definition.methodKey === methodKey));
  assert.ok(catalog.body.definitions.every((definition) => definition.pageDefinitionId.startsWith(`${expectedPrefix}-`)));
}
const invalidDefinitions = await jsonFetch("/api/report-page-definitions?methodKey=unknown", { headers }, env);
assert.equal(invalidDefinitions.response.status, 400);

const definedFormat = structuredClone(reportFormat);
definedFormat.pages[0].pageDefinitionId = "NUM-01";
const savedDefinedFormat = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: definedFormat, expectedRevision: 1 }),
}, env);
assert.equal(savedDefinedFormat.response.status, 200);
assert.equal(savedDefinedFormat.body.format.pages[0].pageDefinitionId, "NUM-01");

const overLimitFormat = structuredClone(reportFormat);
overLimitFormat.pages = Array.from({ length: 4 }, (_, index) => ({
  ...structuredClone(reportFormat.pages[0]),
  pageId: `page_free_${index}`,
}));
const rejectedOverLimit = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: overLimitFormat, expectedRevision: 2 }),
}, env);
assert.equal(rejectedOverLimit.response.status, 400);
assert.equal(rejectedOverLimit.body.errorCode, "REPORT_FORMAT_INVALID");

const invalidDefinition = structuredClone(reportFormat);
invalidDefinition.pages[0].pageDefinitionId = "UNKNOWN-01";
const rejectedDefinition = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: invalidDefinition, expectedRevision: 2 }),
}, env);
assert.equal(rejectedDefinition.response.status, 400);

const malformedDefinition = structuredClone(reportFormat);
malformedDefinition.pages[0].pageDefinitionId = false;
const rejectedMalformedDefinition = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: malformedDefinition, expectedRevision: 2 }),
}, env);
assert.equal(rejectedMalformedDefinition.response.status, 400);

const secondFormat = structuredClone(reportFormat);
secondFormat.pages[0].pageId = "page_v3_revised";
const revisedFormat = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: secondFormat, expectedRevision: 2 }),
}, env);
assert.equal(revisedFormat.body.revision, 3);
const formatWithBackup = await jsonFetch("/api/report-formats/default", { headers }, env);
assert.equal(formatWithBackup.body.backups.length, 2);
const restoredFormat = await jsonFetch("/api/report-formats/default", {
  method: "POST",
  headers,
  body: JSON.stringify({ backupId: formatWithBackup.body.backups[0].backupId, expectedRevision: 3 }),
}, env);
assert.equal(restoredFormat.response.status, 200);
assert.equal(restoredFormat.body.format.pages[0].pageId, "page_v3");

const staleFormat = await jsonFetch("/api/report-formats/default", {
  method: "PUT",
  headers,
  body: JSON.stringify({ format: reportFormat, expectedRevision: 0 }),
}, env);
assert.equal(staleFormat.response.status, 409);
assert.equal(staleFormat.body.errorCode, "REPORT_FORMAT_CONFLICT");

const health = await jsonFetch("/health", {}, env);
assert.equal(health.response.status, 200);
assert.equal(health.body.status, "success");

console.log("D1 workspace state entrypoint verified with no Supabase data migration fallback.");
