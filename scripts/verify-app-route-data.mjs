import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = {
  AUTH_ENFORCEMENT_MODE: "enforce",
  CLERK_JWKS_URL: "https://route-fixture.test/.well-known/jwks.json",
  CLERK_JWT_ISSUER: "https://route-fixture.test",
  ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
};
const userId = `route-test-${Date.now()}`;
const workspaceId = "ws_route_test";

// Locally generated RS256 identities exercise signature verification in enforce
// mode. This is a JWKS fixture, not an actual Clerk account or remote D1 test.
const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...await crypto.subtle.exportKey("jwk", keys.publicKey), kid: "route-fixture", alg: "RS256" };
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), env.CLERK_JWKS_URL, "No remote services should be called by the fixture.");
  return Response.json({ keys: [jwk] });
};
const tokens = new Map();
async function tokenFor(user) {
  if (tokens.has(user)) return tokens.get(user);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encode({ alg: "RS256", kid: "route-fixture" })}.${encode({ sub: user, sid: `fixture-${user}`, iss: env.CLERK_JWT_ISSUER, exp: Math.floor(Date.now() / 1000) + 300 })}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
  const token = `${input}.${Buffer.from(signature).toString("base64url")}`;
  tokens.set(user, token);
  return token;
}

async function api(path, { method = "GET", body, asUser = userId, asWorkspace = workspaceId, tokenUser = asUser } = {}) {
  const response = await worker.fetch(new Request(`https://example.test${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await tokenFor(tokenUser)}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": asWorkspace,
      "X-User-Id": asUser,
    },
    body: body ? JSON.stringify({ workspaceId: asWorkspace, userId: asUser, ...body }) : undefined,
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
assert.deepEqual(restoredPartial.body.session.snapshot.customReportItems, [], "Partial D1 drafts restore collection fields with safe defaults.");
assert.deepEqual(restoredPartial.body.session.snapshot.drafts, {}, "Partial D1 drafts restore object fields with safe defaults.");

console.log(`ID restoration verified across client ${clientRef}, session ${sessionId}, and report ${reportId}, including owner isolation.`);

for (const path of [`/api/appraisals/${sessionId}`, `/api/reports/${reportId}`, `/api/appraisal-clients/${clientRef}`]) {
  const denied = await api(path, { asWorkspace: "ws_other" });
  assert.equal(denied.response.status, 404, "Another workspace must not resolve an existing ID.");
  const anonymous = await worker.fetch(new Request(`https://example.test${path}`, {
    headers: { "X-User-Id": userId, "X-Workspace-Id": workspaceId },
  }), { ...env, AUTH_ENFORCEMENT_MODE: "enforce" }, {});
  assert.equal(anonymous.status, 401, "User/workspace headers cannot replace a Clerk token in enforce mode.");
}
console.log("Route API fixtures: workspace isolation and anonymous enforce-mode denial verified.");

const spoofed = await api(`/api/appraisals/${sessionId}`, { tokenUser: `${userId}-other`, asUser: userId });
assert.equal(spoofed.response.status, 404, "Signed owner takes precedence over a spoofed X-User-Id.");

console.log("Enforce-mode RS256/JWKS fixtures verified; spoofed owner headers cannot cross the authenticated scope.");

const beforeRetry = await api("/api/appraisals/status");
const retryCompletion = await api("/api/appraisals/complete", { method: "POST", body: { appraisalId: sessionId, resultSummary: "再送で変更しない本文" } });
assert.equal(retryCompletion.response.status, 200);
assert.equal(retryCompletion.body.alreadyCompleted, true);
const afterRetry = await api("/api/appraisals/status");
assert.deepEqual(afterRetry.body, beforeRetry.body, "Completion retry must preserve counters, unrelated active draft, completed snapshots, and reports.");
console.log("Completion retry preserves the entire persisted status instead of counting or overwriting again.");

globalThis.fetch = originalFetch;
