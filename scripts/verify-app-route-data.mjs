import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = {
  AUTH_ENFORCEMENT_MODE: "observe",
  ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
};
const userId = `route-test-${Date.now()}`;
const workspaceId = "ws_route_test";

async function api(path, { method = "GET", body, asUser = userId } = {}) {
  const response = await worker.fetch(new Request(`https://example.test${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceId,
      "X-User-Id": asUser,
    },
    body: body ? JSON.stringify({ workspaceId, userId: asUser, ...body }) : undefined,
  }), env, {});
  return { response, body: await response.json() };
}

const created = await api("/api/appraisal-clients", {
  method: "POST",
  body: { clientName: "架空 花子", birthDate: "1990-01-02" },
});
assert.equal(created.response.status, 201);
const clientRef = created.body.appraisalClientRef;

const sessionId = "ses_route_restore_001";
const snapshot = {
  id: sessionId,
  selectedCustomerId: clientRef,
  activeReadingId: sessionId,
  name: "架空 花子",
  birthday: "1990-01-02",
  theme: "保存再開の確認",
  divination: "numerology",
  version: 3,
  customReportItems: [],
  reportTypography: {},
  drafts: {},
};
const saved = await api("/api/appraisals/save-draft", {
  method: "POST",
  body: {
    appraisalId: sessionId,
    clientName: "架空 花子",
    birthDate: "1990-01-02",
    divination: "numerology",
    question: "保存再開の確認",
    snapshot,
  },
});
assert.equal(saved.response.status, 201);

const client = await api(`/api/appraisal-clients/${encodeURIComponent(clientRef)}`);
assert.equal(client.response.status, 200);
assert.equal(client.body.sessions[0].id, sessionId);

const restoredDraft = await api(`/api/appraisals/${sessionId}`);
assert.equal(restoredDraft.response.status, 200);
assert.equal(restoredDraft.body.clientRef, clientRef);
assert.equal(restoredDraft.body.session.snapshot.theme, "保存再開の確認");
assert.equal(restoredDraft.body.sessionState, "draft");

const completed = await api("/api/appraisals/complete", {
  method: "POST",
  body: { appraisalId: sessionId },
});
assert.equal(completed.response.status, 201);

const exported = await api("/api/reports/export", {
  method: "POST",
  body: {
    appraisalId: sessionId,
    reportType: "basic",
    format: "pdf",
    clientName: "架空 花子",
    birthDate: "1990-01-02",
    question: "保存再開の確認",
    resultSummary: "架空の統合検証用鑑定文",
  },
});
assert.equal(exported.response.status, 201);
const reportId = exported.body.exportId;

const report = await api(`/api/reports/${reportId}`);
assert.equal(report.response.status, 200);
assert.equal(report.body.report.appraisalId, sessionId);
assert.equal(report.body.report.reportSnapshot.clientName, "架空 花子");
assert.equal(report.body.session.id, sessionId);

const otherOwnerSession = await api(`/api/appraisals/${sessionId}`, { asUser: `${userId}-other` });
assert.equal(otherOwnerSession.response.status, 404, "Another owner must not resolve the session ID.");
const otherOwnerReport = await api(`/api/reports/${reportId}`, { asUser: `${userId}-other` });
assert.equal(otherOwnerReport.response.status, 404, "Another owner must not resolve the report ID.");

const partialSessionId = "ses_route_partial_002";
await api("/api/appraisals/save-draft", {
  method: "POST",
  body: { appraisalId: partialSessionId, clientName: "架空 花子", birthDate: "1990-01-02", question: "部分保存から復元" },
});
const restoredPartial = await api(`/api/appraisals/${partialSessionId}`);
assert.equal(restoredPartial.body.session.snapshot.theme, "部分保存から復元", "Partial D1 drafts receive a restorable snapshot.");

console.log(`ID restoration verified across client ${clientRef}, session ${sessionId}, and report ${reportId}, including owner isolation.`);
