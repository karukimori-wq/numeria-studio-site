import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { handleNumerologyReviewRequest } from "../src/numerology-review-store.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";
import secureWorker from "../src/secure-worker-entry.js";
import { runNumerologyReviewAction, mountNumerologyReviewForm } from "../src/numerology-review-client.js";
import { handleNumerologyReviewerRequest } from "../src/numerology-review-decisions.js";
import { adaptNumerologyConfirmedResult } from "../src/numerology-confirmed-result.js";
const directory = mkdtempSync(join(tmpdir(), "numeria-review-"));
function sql(query, args = [], script = false) {
  const result = spawnSync("python3", ["-c", "import sqlite3,json,sys\np=json.load(sys.stdin);c=sqlite3.connect(p['db']);c.row_factory=sqlite3.Row\nif p['script']: c.executescript(p['q']);r=None\nelse:\n cur=c.execute(p['q'],p['args']);r=[dict(x) for x in cur.fetchall()] if cur.description else None\nc.commit();print(json.dumps(r))"], { input: JSON.stringify({ db: join(directory, "test.sqlite"), q: query, args, script }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
}
const db = { prepare(query) { return { bind(...args) { return { async run() { return sql(query, args); }, async first() { return sql(query, args)[0] || null; } }; } }; } };
const identity = { verified: true, workspaceId: "ws-a", userId: "user-a" };
const session = { id: "reading-a", draftVersion: "v1", snapshot: withNumerologyCalculationCheckpoint({ id: "reading-a", divination: "numerology", name: "架空", birthday: "2009-11-11", visitDate: "2026-10-19" }) };
const request = (method, body) => new Request("https://fixture.test/api/appraisals/reading-a/numerology-review", { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = async (method, body, who = identity, reading = session) => { const result = await handleNumerologyReviewRequest(request(method, body), db, who, reading); return { status: result.status, data: await result.json() }; };
try {
  sql(readFileSync("migrations/0005_numerology_review_requests.sql", "utf8"), [], true);
  sql(readFileSync("migrations/0006_numerology_review_decisions.sql", "utf8"), [], true);
  assert.equal((await call("GET")).data.reviewRequest, null);
  assert.equal((await call("POST", { expectedDraftVersion: "old" })).status, 409);
  assert.equal((await call("POST", { expectedDraftVersion: "v1", status: "approved" })).status, 400);
  const saved = await call("POST", { expectedDraftVersion: "v1" });
  assert.equal(saved.status, 200); assert.equal(saved.data.reviewRequest.state, "pending"); assert.equal(saved.data.approval, null);
  assert.equal((await call("POST", { expectedDraftVersion: "v1" })).data.reviewRequest.requestId, saved.data.reviewRequest.requestId);
  assert.equal(sql("SELECT COUNT(*) AS n FROM numerology_review_requests")[0].n, 1);
  assert.equal((await call("GET", undefined, { ...identity, userId: "user-b" })).data.reviewRequest, null);
  assert.equal((await call("GET", undefined, { ...identity, workspaceId: "ws-b" })).data.reviewRequest, null);
  assert.equal((await call("GET", undefined, { ...identity, verified: false })).status, 401);
  const changed = { ...session, snapshot: withNumerologyCalculationCheckpoint({ ...session.snapshot, visitDate: "2027-01-01" }) };
  assert.equal((await call("GET", undefined, identity, changed)).data.reviewRequest, null);
  assert.equal((await call("POST", { expectedDraftVersion: "v1" }, identity, { ...session, snapshot: { ...session.snapshot, visitDate: "2027-01-01" } })).status, 422);
  const row = sql("SELECT * FROM numerology_review_requests")[0];
  assert.equal(JSON.parse(row.calculation_json).results[0].data.lifePath, 33);
  assert.equal(JSON.parse(row.scope_json).source.referenceDate, "2026-10-19");
  const clientResult = await runNumerologyReviewAction({ method: "POST", snapshot: session.snapshot, getCurrentSnapshot: () => session.snapshot, getHeaders: async () => ({ "Content-Type": "application/json" }),
    fetcher: async (path, init) => path.endsWith("numerology-review") ? handleNumerologyReviewRequest(new Request(`https://fixture.test${path}`, init), db, identity, session) : new Response(JSON.stringify({ status: "success", session })) });
  assert.equal(clientResult.ok, true); assert.match(clientResult.message, /確認待ち/);
  assert.equal(sql("SELECT COUNT(*) AS n FROM numerology_review_requests")[0].n, 1, "UI retry must reuse the actual persisted SQLite request.");
  for (const method of ["GET", "POST"]) {
    const response = await secureWorker.fetch(new Request("https://fixture.test/api/appraisals/reading-a/numerology-review", { method, headers: { "X-User-Id": "user-a", "X-Admin-Email": "illusionddt@gmail.com" } }), { AUTH_ENFORCEMENT_MODE: "observe" }, {});
    assert.equal(response.status, 401, "Browser identity headers cannot authorize review storage.");
  }
  const reviewer = { verified: true, canReview: true, workspaceId: "ws-a", userId: "reviewer-verified" };
  const decide = async (body, who = reviewer, id = row.request_id) => {
    const result = await handleNumerologyReviewerRequest(new Request(`https://fixture.test/api/admin/numerology-reviews/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), db, who, id);
    return { status: result.status, body: await result.json() };
  };
  const approvalBody = { decision: "approve", expectedInputHash: row.input_hash, note: "独立した参照に対し対象の数値と欠損を確認したfixture", checks: { coreNumbers: true, nameRules: true, periods: true, comparison: true }, evidence: ["https://reference.invalid/fixture-review"] };
  assert.equal((await decide(approvalBody, { ...reviewer, verified: false })).status, 401);
  assert.equal((await decide(approvalBody, { ...reviewer, canReview: false })).status, 403);
  assert.equal((await decide(approvalBody, { ...reviewer, workspaceId: "ws-b" })).status, 404);
  assert.equal((await decide({ ...approvalBody, expectedInputHash: "old" })).status, 409);
  assert.equal((await decide({ ...approvalBody, reviewedBy: "spoof" })).status, 400);
  assert.equal((await decide({ ...approvalBody, evidence: [] })).status, 422);
  assert.equal((await decide({ ...approvalBody, evidence: ["javascript:bad"] })).status, 422);
  assert.equal((await decide({ ...approvalBody, checks: { coreNumbers: true } })).status, 422);
  assert.equal((await decide({ ...approvalBody, note: "" })).status, 422);
  const approved = await decide(approvalBody);
  assert.equal(approved.status, 200);
  const ownerRead = await call("GET");
  assert.equal(ownerRead.data.reviewRequest.state, "approved");
  assert.equal(ownerRead.data.approval.reviewedBy, "reviewer-verified");
  assert.equal(adaptNumerologyConfirmedResult(session.snapshot, ownerRead.data.approval).ok, true);
  assert.ok(adaptNumerologyConfirmedResult(session.snapshot, ownerRead.data.approval).record.pageAvailability.every(item => item.available === false));
  assert.equal((await decide({ ...approvalBody, decision: "return" })).status, 409);
  assert.equal(sql("SELECT COUNT(*) AS n FROM numerology_review_decisions")[0].n, 1);
  assert.equal((await call("GET", undefined, identity, changed)).data.approval, null);
  const approvedClient = await runNumerologyReviewAction({ method: "GET", snapshot: session.snapshot, getCurrentSnapshot: () => session.snapshot, getHeaders: async () => ({}), fetcher: async (path, init) => path.endsWith("numerology-review") ? handleNumerologyReviewRequest(new Request(`https://fixture.test${path}`, init), db, identity, session) : new Response(JSON.stringify({ status: "success", session })) });
  assert.equal(approvedClient.ok, true); assert.match(approvedClient.message, /承認済み/); assert.ok(approvedClient.approval);
  const controls = { submit: {}, check: {}, status: {} }; let handedApproval;
  mountNumerologyReviewForm({ isConnected: true, querySelector: key => key.includes("submit") ? controls.submit : key.includes("check") ? controls.check : controls.status }, { getSnapshot: () => session.snapshot, getHeaders: async () => ({}),
    fetcher: async (path, init) => path.endsWith("numerology-review") ? handleNumerologyReviewRequest(new Request(`https://fixture.test${path}`, init), db, identity, session) : new Response(JSON.stringify({ status: "success", session })), onApproval: approval => { handedApproval = approval; } });
  await controls.check.onclick();
  assert.equal(handedApproval.reviewedBy, reviewer.userId); assert.match(controls.status.textContent, /承認済み/);
  const nextRequest = await call("POST", { expectedDraftVersion: "v1" }, identity, changed);
  const nextRow = sql("SELECT * FROM numerology_review_requests WHERE request_id = ?", [nextRequest.data.reviewRequest.requestId])[0];
  assert.equal((await decide({ decision: "return", expectedInputHash: nextRow.input_hash, note: "参照値を再確認してください" }, reviewer, nextRow.request_id)).status, 200);
  assert.equal((await call("GET", undefined, identity, changed)).data.reviewRequest.state, "returned");
  assert.equal((await call("GET", undefined, identity, changed)).data.approval, null);
  const raceSession = { ...session, snapshot: withNumerologyCalculationCheckpoint({ ...session.snapshot, visitDate: "2028-01-01" }) };
  const raceRequest = await call("POST", { expectedDraftVersion: "v1" }, identity, raceSession);
  const raceRow = sql("SELECT * FROM numerology_review_requests WHERE request_id = ?", [raceRequest.data.reviewRequest.requestId])[0];
  const competing = await Promise.all([decide({ ...approvalBody, expectedInputHash: raceRow.input_hash }, reviewer, raceRow.request_id), decide({ decision: "return", expectedInputHash: raceRow.input_hash, note: "競合する差戻し" }, reviewer, raceRow.request_id)]);
  assert.deepEqual(competing.map(result => result.status).sort(), [200, 409]);
  assert.equal(sql("SELECT COUNT(*) AS n FROM numerology_review_decisions WHERE request_id = ?", [raceRow.request_id])[0].n, 1);

  // Verify real RS256/JWKS identity routing without trusting browser admin/email headers.
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "fixture-key", alg: "RS256" };
  const tokenFor = async sub => {
    const head = Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture-key" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: "https://issuer.fixture.test", sub, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${head}.${payload}`));
    return `${head}.${payload}.${Buffer.from(signature).toString("base64url")}`;
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => { assert.equal(String(url), "https://issuer.fixture.test/jwks"); return new Response(JSON.stringify({ keys: [jwk] })); };
  try {
    const env = { NUMERIA_DB: db, AUTH_ENFORCEMENT_MODE: "enforce", CLERK_JWKS_URL: "https://issuer.fixture.test/jwks", CLERK_JWT_ISSUER: "https://issuer.fixture.test", NUMERIA_ADMIN_USER_IDS: reviewer.userId };
    const route = async (user, extra = {}) => secureWorker.fetch(new Request(`https://fixture.test/api/admin/numerology-reviews/${row.request_id}`, { headers: { Authorization: `Bearer ${await tokenFor(user)}`, "X-Workspace-Id": "ws-a", "X-User-Id": reviewer.userId, "X-Admin-Email": "illusionddt@gmail.com", ...extra } }), env, {});
    assert.equal((await route("ordinary-user")).status, 403);
    assert.equal((await route(reviewer.userId)).status, 200);
    const jwtSession = { ...session, snapshot: withNumerologyCalculationCheckpoint({ ...session.snapshot, visitDate: "2029-01-01" }) };
    const jwtRequest = await call("POST", { expectedDraftVersion: "v1" }, identity, jwtSession);
    const jwtRow = sql("SELECT * FROM numerology_review_requests WHERE request_id = ?", [jwtRequest.data.reviewRequest.requestId])[0];
    const jwtPost = await secureWorker.fetch(new Request(`https://fixture.test/api/admin/numerology-reviews/${jwtRow.request_id}`, { method: "POST", headers: { Authorization: `Bearer ${await tokenFor(reviewer.userId)}`, "X-Workspace-Id": "ws-a", "X-User-Id": "spoof-user", "Content-Type": "application/json" }, body: JSON.stringify({ decision: "return", expectedInputHash: jwtRow.input_hash, note: "署名付きJWT経由の差戻しfixture" }) }), env, {});
    assert.equal(jwtPost.status, 200);
    assert.equal(sql("SELECT reviewer_user_id FROM numerology_review_decisions WHERE request_id = ?", [jwtRow.request_id])[0].reviewer_user_id, reviewer.userId);
    env.NUMERIA_NUMEROLOGY_REVIEWER_USER_IDS = "";
    assert.equal((await route(reviewer.userId)).status, 403);
  } finally { globalThis.fetch = originalFetch; }
  console.log("Numerology reviews: SQLite request/decision persistence, immutable concurrent decisions, evidence gates, signed JWT reviewer authorization and owner/UI approval handoff verified.");
} finally { rmSync(directory, { recursive: true, force: true }); }
