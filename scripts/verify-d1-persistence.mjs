import assert from "node:assert/strict";
import worker from "../src/worker.js";

class MockD1 {
  constructor() {
    this.usageRecords = new Map();
    this.reportEvents = new Map();
    this.tables = new Set(["usage_records", "report_events"]);
  }

  prepare(sql) {
    return new MockD1Statement(this, sql);
  }
}

class MockD1Statement {
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
    if (this.sql.includes("FROM usage_records")) {
      return this.db.usageRecords.get(this.args[0]) || null;
    }
    return null;
  }

  async all() {
    if (this.sql.includes("sqlite_master")) {
      return {
        results: this.args
          .filter((name) => this.db.tables.has(name))
          .map((name) => ({ name })),
      };
    }

    return { results: [] };
  }

  async run() {
    if (this.sql.includes("INTO usage_records")) {
      const [
        scopeKey,
        workspaceId,
        userId,
        billingMonth,
        planId,
        monthlyAppraisals,
        appraisalClients,
        inProgressAppraisals,
        activeDraftJson,
        completedAppraisalIdsJson,
        completedAppraisalsJson,
        reportExportsJson,
        updatedAt,
      ] = this.args;
      const existing = this.db.usageRecords.get(scopeKey) || {
        created_at: "2026-09-09T00:00:00.000Z",
      };
      this.db.usageRecords.set(scopeKey, {
        ...existing,
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        billing_month: billingMonth,
        plan_id: planId,
        monthly_appraisals: monthlyAppraisals,
        appraisal_clients: appraisalClients,
        in_progress_appraisals: inProgressAppraisals,
        active_draft_json: activeDraftJson,
        completed_appraisal_ids_json: completedAppraisalIdsJson,
        completed_appraisals_json: completedAppraisalsJson,
        report_exports_json: reportExportsJson,
        updated_at: updatedAt,
      });
      return { success: true };
    }

    if (this.sql.includes("INTO report_events")) {
      const [
        eventId,
        scopeKey,
        workspaceId,
        userId,
        appraisalId,
        reportType,
        format,
        branding,
        eventName,
        generatedAt,
      ] = this.args;
      this.db.reportEvents.set(eventId, {
        event_id: eventId,
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        appraisal_id: appraisalId,
        report_type: reportType,
        format,
        branding,
        event_name: eventName,
        generated_at: generatedAt,
      });
      return { success: true };
    }

    return { success: true };
  }
}

async function jsonFetch(path, options = {}, env) {
  const response = await worker.fetch(new Request(`https://local.test${path}`, options), env);
  const body = await response.json();
  return { response, body };
}

const db = new MockD1();
const env = { NUMERIA_DB: db };
const headers = {
  "content-type": "application/json",
  "x-workspace-id": "d1_ws",
  "x-user-id": "d1_user",
};

const persistence = await jsonFetch("/persistence/status", {}, env);
assert.equal(persistence.body.storageDriver, "durable-d1");
assert.equal(persistence.body.durable, true);

const draft = await jsonFetch("/api/appraisals/save-draft", {
  method: "POST",
  headers,
  body: JSON.stringify({
    appraisalId: "app_d1_1",
    clientName: "A",
    question: "相談",
    resultSummary: "結果",
  }),
}, env);
assert.equal(draft.response.status, 201);
assert.equal(db.usageRecords.size, 1);

const completed = await jsonFetch("/api/appraisals/complete", {
  method: "POST",
  headers,
  body: JSON.stringify({ appraisalId: "app_d1_1" }),
}, env);
assert.equal(completed.response.status, 201);
assert.equal(completed.body.usage.monthlyAppraisals, 1);

const report = await jsonFetch("/api/reports/export", {
  method: "POST",
  headers,
  body: JSON.stringify({
    appraisalId: "app_d1_1",
    format: "pdf",
    reportType: "basic",
    clientName: "A",
    question: "相談",
    resultSummary: "結果",
  }),
}, env);
assert.equal(report.response.status, 201);
assert.equal(report.body.eventName, "studio.report.generated.v1");
assert.equal(report.body.usage.reportExports.length, 1);
assert.equal(db.reportEvents.size, 1);

const usage = await jsonFetch("/api/usage", { headers }, env);
assert.equal(usage.body.usage.monthlyAppraisals, 1);
assert.equal(usage.body.usage.completedAppraisals.length, 1);
assert.equal(usage.body.usage.reportExports.length, 1);

const appraisalStatus = await jsonFetch("/api/appraisals/status", { headers }, env);
assert.equal(appraisalStatus.response.status, 200);
assert.equal(appraisalStatus.body.activeDraft, null);
assert.equal(appraisalStatus.body.completedAppraisals.length, 1);
assert.equal(appraisalStatus.body.visibleCompletedAppraisals.length, 1);
assert.equal(appraisalStatus.body.lockedCompletedAppraisalIds.length, 0);
assert.equal(appraisalStatus.body.reportExports.length, 1);

const adminAccount = await jsonFetch("/api/admin/account", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    adminEmail: "illusionddt@gmail.com",
    targetWorkspaceId: "d1_ws",
    targetUserId: "d1_user",
  }),
}, env);
assert.equal(adminAccount.response.status, 200);
assert.equal(adminAccount.body.usage.monthlyAppraisals, 1);
assert.equal(adminAccount.body.usage.completedAppraisals.length, 1);
assert.equal(adminAccount.body.usage.reportExports.length, 1);

const uninitializedDb = new MockD1();
uninitializedDb.tables.delete("report_events");
const uninitialized = await jsonFetch("/persistence/status", {}, { NUMERIA_DB: uninitializedDb });
assert.equal(uninitialized.body.storageDriver, "d1-uninitialized");
assert.equal(uninitialized.body.durable, false);
assert.deepEqual(uninitialized.body.missingTables, ["report_events"]);

const policyDb = new MockD1();
const policyEnv = { NUMERIA_DB: policyDb };
const policyHeaders = {
  "content-type": "application/json",
  "x-workspace-id": "policy_ws",
  "x-user-id": "policy_user",
};

for (const clientName of ["Aさん", "Bさん", "Cさん", "Dさん"]) {
  const appraisalId = `policy_${clientName}`;
  const draftResponse = await jsonFetch("/api/appraisals/save-draft", {
    method: "POST",
    headers: policyHeaders,
    body: JSON.stringify({
      appraisalId,
      clientName,
      question: `${clientName}の相談`,
      resultSummary: `${clientName}の結果`,
    }),
  }, policyEnv);
  assert.equal(draftResponse.response.status, 201);

  const completeResponse = await jsonFetch("/api/appraisals/complete", {
    method: "POST",
    headers: policyHeaders,
    body: JSON.stringify({ appraisalId }),
  }, policyEnv);
  assert.equal(completeResponse.response.status, 201);
}

const policyStatus = await jsonFetch("/api/appraisals/status", { headers: policyHeaders }, policyEnv);
assert.equal(policyStatus.body.completedAppraisals.length, 4);
assert.equal(policyStatus.body.visibleCompletedAppraisals.length, 3);
assert.deepEqual(
  policyStatus.body.visibleCompletedAppraisals.map((appraisal) => appraisal.clientName),
  ["Bさん", "Cさん", "Dさん"],
);
assert.deepEqual(policyStatus.body.lockedCompletedAppraisalIds, ["policy_Aさん"]);

const firstDraft = await jsonFetch("/api/appraisals/save-draft", {
  method: "POST",
  headers: policyHeaders,
  body: JSON.stringify({
    appraisalId: "policy_draft_one",
    clientName: "Eさん",
  }),
}, policyEnv);
assert.equal(firstDraft.response.status, 201);

const blockedDraft = await worker.fetch(new Request("https://local.test/api/appraisals/save-draft", {
  method: "POST",
  headers: policyHeaders,
  body: JSON.stringify({
    appraisalId: "policy_draft_two",
    clientName: "Fさん",
  }),
}), policyEnv);
const blockedDraftBody = await blockedDraft.json();
assert.equal(blockedDraft.status, 402);
assert.equal(blockedDraftBody.errorCode, "FREE_IN_PROGRESS_APPRAISAL_LIMIT");

console.log("D1 persistence compatibility verified.");
