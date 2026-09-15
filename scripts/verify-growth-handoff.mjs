import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../src/worker.js";
import {
  growthEngineHandoffContract,
  normalizeGrowthEngineExternalReferences,
  parseGrowthEngineHandoff,
  toGrowthEngineExternalReferences,
} from "../src/growth-handoff.js";

const accepted = parseGrowthEngineHandoff(
  "https://numeria-studio.com/app/growth/start?workspaceId=ws_growth_001&userId=user_growth_001&reservationId=res_001&customerId=cus_001&traceId=trace_001&correlationId=corr_001&intent=start_appraisal_session"
);
assert.equal(accepted.status, "accepted");
assert.equal(accepted.requestedWorkspaceId, "ws_growth_001");
assert.equal(accepted.requestedUserId, "user_growth_001");
assert.equal(accepted.reservationId, "res_001");
assert.equal(accepted.customerId, "cus_001");
assert.equal(accepted.traceId, "trace_001");
assert.equal(accepted.correlationId, "corr_001");

const externalReferences = toGrowthEngineExternalReferences(accepted);
assert.deepEqual(externalReferences, {
  sourceApp: "growth-engine",
  intent: "start_appraisal_session",
  reservationId: "res_001",
  customerId: "cus_001",
  traceId: "trace_001",
  correlationId: "corr_001",
});
assert.equal("workspaceId" in externalReferences, false);
assert.equal("userId" in externalReferences, false);

assert.equal(
  parseGrowthEngineHandoff("https://numeria-studio.com/") ,
  null,
  "ordinary direct Numeria usage must remain unaffected"
);
assert.equal(
  parseGrowthEngineHandoff("https://numeria-studio.com/app/growth/start?reservationId=res_001&customerId=cus_001&intent=other").status,
  "rejected"
);
assert.equal(
  parseGrowthEngineHandoff("https://numeria-studio.com/app/growth/start?reservationId=res_001&customerId=cus_001&intent=start_appraisal_session&paymentStatus=paid").reason,
  "forbidden-query-field"
);
assert.equal(growthEngineHandoffContract.queryIdentityTrustedForAuthorization, false);

assert.deepEqual(
  normalizeGrowthEngineExternalReferences({
    externalReferences: {
      ...externalReferences,
      paymentStatus: "paid",
      salesAmount: 999999,
      reportBody: "must-not-cross-boundary",
    },
  }),
  externalReferences,
  "only approved reference fields may survive normalization"
);

const mainSource = await readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
assert.match(mainSource, /parseGrowthEngineHandoff/);
assert.match(mainSource, /toGrowthEngineExternalReferences/);
assert.match(mainSource, /window\.location/);
assert.match(mainSource, /externalReferences/);
assert.match(mainSource, /growthHandoffStartedRef/);
assert.match(mainSource, /growthHandoffStartedRef\.current/);
assert.doesNotMatch(mainSource, /requestedUserId\s*:/, "query userId must not be copied into the appraisal case");
assert.doesNotMatch(mainSource, /requestedWorkspaceId\s*:/, "query workspaceId must not be copied into the appraisal case");

const env = {};
const ctx = { waitUntil() {} };
const scopeHeaders = {
  "Content-Type": "application/json",
  "X-Workspace-Id": "ws_authenticated_001",
  "X-User-Id": "user_authenticated_001",
};

const sessionRequest = new Request("https://numeria-studio.com/api/sessions/start", {
  method: "POST",
  headers: scopeHeaders,
  body: JSON.stringify({
    workspaceId: "ws_authenticated_001",
    userId: "user_authenticated_001",
    sessionId: "case_ge_001",
    ...externalReferences,
    paymentStatus: "paid",
    salesAmount: 999999,
    reportBody: "must-not-cross-boundary",
  }),
});
const sessionResponse = await worker.fetch(sessionRequest, env, ctx);
assert.equal(sessionResponse.status, 201);
const sessionBody = await sessionResponse.json();
assert.equal(sessionBody.sessionId, "case_ge_001");
assert.deepEqual(sessionBody.externalReferences, externalReferences);
assert.equal("paymentStatus" in sessionBody.externalReferences, false);
assert.equal("salesAmount" in sessionBody.externalReferences, false);
assert.equal("reportBody" in sessionBody.externalReferences, false);

const draftRequest = new Request("https://numeria-studio.com/api/appraisals/save-draft", {
  method: "POST",
  headers: scopeHeaders,
  body: JSON.stringify({
    workspaceId: "ws_authenticated_001",
    userId: "user_authenticated_001",
    id: "case_ge_001",
    clientName: "GE reference test",
    externalReferences,
  }),
});
const draftResponse = await worker.fetch(draftRequest, env, ctx);
assert.equal(draftResponse.status, 201);
const draftBody = await draftResponse.json();
assert.deepEqual(draftBody.activeDraft.externalReferences, externalReferences);

const completeRequest = new Request("https://numeria-studio.com/api/appraisals/complete", {
  method: "POST",
  headers: scopeHeaders,
  body: JSON.stringify({
    workspaceId: "ws_authenticated_001",
    userId: "user_authenticated_001",
    id: "case_ge_001",
    clientName: "GE reference test",
    externalReferences,
  }),
});
const completeResponse = await worker.fetch(completeRequest, env, ctx);
assert.equal(completeResponse.status, 201);
const completeBody = await completeResponse.json();
assert.deepEqual(completeBody.appraisal.externalReferences, externalReferences);

console.log("Growth Engine handoff verification passed.");
