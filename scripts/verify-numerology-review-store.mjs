import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { handleNumerologyReviewRequest } from "../src/numerology-review-store.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";
import secureWorker from "../src/secure-worker-entry.js";
import { runNumerologyReviewAction } from "../src/numerology-review-client.js";
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
  console.log("Numerology review store: SQLite persistence, idempotency, scope separation, saved-input binding, pending-only requests and forged-header rejection verified.");
} finally { rmSync(directory, { recursive: true, force: true }); }
