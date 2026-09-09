import assert from "node:assert/strict";
import worker from "../src/worker.js";

class MockD1 {
  constructor() {
    this.usageRecords = new Map();
    this.reportEvents = new Map();
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
assert.equal(db.reportEvents.size, 1);

const usage = await jsonFetch("/api/usage", { headers }, env);
assert.equal(usage.body.usage.monthlyAppraisals, 1);
assert.equal(usage.body.usage.completedAppraisals.length, 1);

console.log("D1 persistence compatibility verified.");
