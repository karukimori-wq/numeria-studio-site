import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import worker from "../src/worker.js";
import { normalizeNumerologyNameInputs, updateNumerologyNameInputs, selectedNumerologyName } from "../src/numerology-name-input.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";

import { withKigakuCalculationCheckpoint, validateKigakuCalculationCheckpoint } from "../src/kigaku-calculation-checkpoint.js";

// Run the Worker's real D1 SQL on SQLite. Identity and D1 transport are fixtures.
const directory = mkdtempSync(join(tmpdir(), "numeria-draft-cas-"));
function sql(query, args = [], script = false) {
  const result = spawnSync("python3", ["-c", `import sqlite3,json,sys
p=json.load(sys.stdin);c=sqlite3.connect(p['database']);c.row_factory=sqlite3.Row
if p['script']:
 c.executescript(p['query']);value=None
elif isinstance(p['query'],list):
 value=[]
 with c:
  for q in p['query']:
   cur=c.execute(q['query'],q['args']);value.append({'meta':{'changes':cur.rowcount}})
else:
 cur=c.execute(p['query'],p['args'])
 value=[dict(r) for r in cur.fetchall()] if cur.description else {'meta':{'changes':cur.rowcount}}
c.commit();print(json.dumps(value))
`], { input: JSON.stringify({ database: join(directory, "test.sqlite"), query, args, script }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
let waiting = [], holdReads = false, beforeWrite = null, failWrite = false;
const db = { async batch(statements) { return sql(statements.map(s => ({query:s.query,args:s.args}))); }, prepare(query) { return { query,
  args: [], bind(...args) { this.args = args; return this; },
  async first() {
    const row = sql(query, this.args)[0] || null;
    if (holdReads && query.includes("FROM usage_records")) await new Promise(resolve => {
      waiting.push(resolve);
      if (waiting.length === 2) { holdReads = false; for (const release of waiting) release(); waiting = []; }
    });
    return row;
  },
  async run() {
    if (query.includes("WHERE usage_records.active_draft_json IS ?")) {
      if (failWrite) throw new Error("fixture disk failure");
      if (beforeWrite) { const callback = beforeWrite; beforeWrite = null; callback(); }
    }
    return sql(query, this.args);
  },
}; } };
const env = { NUMERIA_DB: db, AUTH_ENFORCEMENT_MODE: "observe" };
async function api(path, body, workspaceId = "cas_ws") {
  const response = await worker.fetch(new Request(`https://fixture.test${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Workspace-Id": workspaceId, "X-User-Id": "cas_owner" },
    body: body ? JSON.stringify(body) : undefined,
  }), env, {});
  return { status: response.status, body: await response.json() };
}
const nameIdentity = { divination: "numerology", name: "架空", birthday: "2009-11-11", birthName: "TARO YAMADA", visitDate: "2026-11-01" };
let savedNames = updateNumerologyNameInputs(normalizeNumerologyNameInputs(null), { role: "subject", operation: "edit", romanName: "TARO YAMADA" }, nameIdentity).value;
savedNames = updateNumerologyNameInputs(savedNames, { role: "subject", operation: "confirm" }, nameIdentity).value;
savedNames.subject.current.romanName = "TARO SATO";
const save = (message, expectedDraftVersion) => api("/api/appraisals/save-draft", {
  appraisalId: "session_cas", expectedDraftVersion, question: message,
  snapshot: withNumerologyCalculationCheckpoint({ ...nameIdentity, id: "session_cas", theme: message, customReportItems: [], drafts: {}, numerologyNameInputs: savedNames, numerologyRegisteredPagesEnabled: true }),
});
try {
  for (const file of readdirSync("migrations").filter(name => name.endsWith(".sql")).sort()) sql(readFileSync(join("migrations", file), "utf8"), [], true);
  const initial = await save("初回", null);
  assert.equal(initial.status, 201);
  assert.deepEqual(initial.body.activeDraft.snapshot.numerologyNameInputs, savedNames);
  assert.deepEqual(JSON.parse(sql("SELECT active_draft_json FROM usage_records")[0].active_draft_json).snapshot.numerologyNameInputs, savedNames, "D1 must persist birth/current names separately with confirmation provenance.");
  assert.deepEqual((await api("/api/appraisals/status")).body.activeDraft.snapshot.numerologyNameInputs, savedNames, "Read API must restore the persisted name selection and confirmation.");
  const restoredNames = (await api("/api/appraisals/session_cas")).body.session.snapshot;
  assert.equal(selectedNumerologyName(restoredNames).romanNameConfirmed, true, "Session resume API must preserve confirmation identity.");
  assert.equal(restoredNames.numerologyCalculation.results[0].data.lifePath, 33);
  assert.equal(restoredNames.numerologyCalculation.source.referenceDate, "2026-11-01");
  assert.equal(restoredNames.numerologyCalculation.status, "calculated");
  assert.equal(restoredNames.numerologyCalculation.pageResults.length, 14);
  assert.equal(restoredNames.numerologyRegisteredSelection.officialAllowed, false);
  assert.equal(restoredNames.numerologyRegisteredSelection.pages[0].frames.length, 8);
  assert.equal(restoredNames.numerologyRegisteredSelection.pages[0].frames[0].segments[0].copyId, "num.number.33.basic");
  assert.equal('text' in restoredNames.numerologyRegisteredSelection.pages[0].frames[0].segments[0], false);
  const version = initial.body.activeDraft.draftVersion;
  assert.ok(version);
  holdReads = true;
  const competing = await Promise.all([save("タブA", version), save("タブB", version)]);
  assert.deepEqual(competing.map(result => result.status).sort(), [201, 409]);
  const winner = competing.find(result => result.status === 201);
  assert.equal(competing.find(result => result.status === 409).body.errorCode, "DRAFT_SAVE_CONFLICT");
  assert.equal((await save("古いタブからの上書き", version)).status, 409);
  const report = { exportId: "rep_immutable", appraisalId: "old_session", reportSnapshot: { resultSummary: "旧Reportの本文" } };
  beforeWrite = () => sql("UPDATE usage_records SET report_exports_json = ?, monthly_appraisals = 9", [JSON.stringify([report])]);
  const next = await save("競合後の新しい版", winner.body.activeDraft.draftVersion);
  assert.equal(next.status, 201);
  const row = sql("SELECT * FROM usage_records")[0];
  assert.equal(row.monthly_appraisals, 9, "Draft save must not roll back concurrent counters.");
  assert.deepEqual(JSON.parse(row.report_exports_json), [report], "Draft save must preserve concurrent Reports.");
  const detail = await api("/api/reports/rep_immutable");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.report.reportSnapshot.resultSummary, "旧Reportの本文");
  const cleared = await save("", next.body.activeDraft.draftVersion);
  assert.equal(cleared.status, 201);
  assert.equal(cleared.body.activeDraft.question, "", "An intentional blank must not restore old text.");
  const persisted = cleared.body.activeDraft;
  holdReads = true;
  const completions = await Promise.all([api("/api/appraisals/complete", { appraisalId: "session_cas" }), api("/api/appraisals/complete", { appraisalId: "session_cas" })]);
  assert.deepEqual(completions.map(x => x.status).sort(), [201, 409]);
  const completedRow = sql("SELECT * FROM usage_records")[0];
  assert.equal(completedRow.monthly_appraisals, 10);
  assert.equal(JSON.parse(completedRow.completed_appraisals_json).filter(x => x.id === "session_cas").length, 1);
  assert.deepEqual(JSON.parse(completedRow.report_exports_json), [report]);
  holdReads = true;
  const exports = await Promise.all([1, 2].map(() => api("/api/reports/export", { appraisalId: "session_cas", reportType: "basic", format: "pdf", resultSummary: "競合試験" })));
  assert.deepEqual(exports.map(x => x.status).sort(), [201, 409]);
  const exportRow = sql("SELECT * FROM usage_records")[0];
  assert.equal(JSON.parse(exportRow.report_exports_json).length, 2);
  assert.equal(exportRow.monthly_appraisals, 10);
  assert.deepEqual(JSON.parse(exportRow.completed_appraisals_json), JSON.parse(completedRow.completed_appraisals_json));
  const beforeFailure = sql("SELECT report_exports_json FROM usage_records")[0].report_exports_json;
  const eventCount = sql("SELECT count(*) AS n FROM report_events")[0].n;
  assert.equal(eventCount, 1, "Only the winning Report gets an event.");
  sql("CREATE TRIGGER reject_report_event BEFORE INSERT ON report_events BEGIN SELECT RAISE(ABORT, 'event failure'); END", [], true);
  await assert.rejects(() => api("/api/reports/export", { appraisalId: "session_cas", reportType: "basic", format: "pdf" }), /event failure/);
  assert.equal(sql("SELECT report_exports_json FROM usage_records")[0].report_exports_json, beforeFailure);
  assert.equal(sql("SELECT count(*) AS n FROM report_events")[0].n, eventCount);
  sql("DROP TRIGGER reject_report_event", [], true);
  const restarted = await save("次の下書き", null);
  assert.equal(restarted.status, 201);
  Object.assign(persisted, restarted.body.activeDraft);
  failWrite = true;
  await assert.rejects(() => save("保存失敗の本文", persisted.draftVersion), /fixture disk failure/);
  assert.deepEqual(JSON.parse(sql("SELECT active_draft_json FROM usage_records")[0].active_draft_json), persisted);
  failWrite = false;
  const kigakuInput = { methodKey: "nine-star-ki", subjectId: "fixture-kigaku-self", revision: "r1",
    referenceInstant: "2026-11-09T00:00:00+09:00",
    birthClock: { date: "1990-06-15", time: null, countryCode: "JP", zoneId: "Asia/Tokyo", zoneConfirmed: true, offsetChoiceMinutes: null } };
  const kigakuSnapshot = withKigakuCalculationCheckpoint({ id: "session_kigaku_fixture", divination: "nine-star-ki", name: "架空九星", birthday: "1990-06-15", kigakuInput,
    unknownFutureField: { retained: true }, drafts: { retainedText: "既存の編集本文" } });
  const kigakuSaved = await api("/api/appraisals/save-draft", { appraisalId: "session_kigaku_fixture", expectedDraftVersion: null, divination: "nine-star-ki", question: "九星保存fixture", snapshot: { ...kigakuSnapshot, kigakuCalculation: { tampered: true } } }, "cas_kigaku_ws");
  assert.equal(kigakuSaved.status, 201);
  const kigakuRestored = (await api("/api/appraisals/session_kigaku_fixture", null, "cas_kigaku_ws")).body.session.snapshot;
  assert.deepEqual(kigakuRestored.kigakuCalculation, kigakuSnapshot.kigakuCalculation);
  assert.deepEqual(kigakuRestored.unknownFutureField, kigakuSnapshot.unknownFutureField);
  assert.deepEqual(kigakuRestored.drafts, kigakuSnapshot.drafts);
  assert.equal(validateKigakuCalculationCheckpoint(kigakuRestored).ok, true);
  assert.equal(kigakuRestored.kigakuCalculation.calculation.pages.length, 14);
  assert.equal(kigakuRestored.kigakuCalculation.publicationAllowed, false);
  for (const status of ["confirmed", "completed"]) {
    const workspace = `forged_kigaku_${status}`;
    const saved = await api("/api/appraisals/save-draft", { appraisalId: "session_kigaku_fixture", expectedDraftVersion: null, divination: "nine-star-ki", question: "状態偽装fixture", snapshot: { ...kigakuSnapshot, status, kigakuCalculation: { publicationAllowed: true, tampered: true } } }, workspace);
    assert.equal(saved.status, 201);
    const restored = (await api("/api/appraisals/session_kigaku_fixture", null, workspace)).body.session.snapshot;
    assert.equal(restored.status, "draft");
    assert.deepEqual(restored.kigakuCalculation, kigakuSnapshot.kigakuCalculation);
    assert.equal(restored.kigakuCalculation.publicationAllowed, false);
    assert.deepEqual(restored.drafts, kigakuSnapshot.drafts);
  }
  const lockedVersion = kigakuSaved.body.activeDraft.draftVersion;
  for (const changedSnapshot of [
    { ...kigakuSnapshot, kigakuInput: { ...kigakuInput, referenceInstant: "2027-01-01T00:00:00+09:00" } },
    { ...kigakuSnapshot, kigakuInput: null },
  ]) {
    const rejected = await api("/api/appraisals/save-draft", { appraisalId: "session_kigaku_fixture", expectedDraftVersion: lockedVersion, snapshot: changedSnapshot }, "cas_kigaku_ws");
    assert.equal(rejected.status, 409);
    assert.equal(rejected.body.errorCode, "KIGAKU_REFERENCE_LOCKED");
    assert.deepEqual((await api("/api/appraisals/session_kigaku_fixture", null, "cas_kigaku_ws")).body.session.snapshot, kigakuRestored);
  }
  const sameReference = await api("/api/appraisals/save-draft", { appraisalId: "session_kigaku_fixture", expectedDraftVersion: lockedVersion, snapshot: { ...kigakuRestored, drafts: { retainedText: "本文だけ更新" } } }, "cas_kigaku_ws");
  assert.equal(sameReference.status, 201);
  const retainedReport = await api("/api/reports/rep_immutable");
  assert.equal(retainedReport.body.report.reportSnapshot.resultSummary, "旧Reportの本文");
  console.log("Kigaku checkpoint: real Worker SQL/SQLite save and session restore PASS; synthetic identity/D1 transport; no production D1 or browser claim.");
  console.log("SQLite verified: concurrent CAS winner/409, stale version, Report/counter retention, blank fields, and write failure.");
} finally { rmSync(directory, { recursive: true, force: true }); }
