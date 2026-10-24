import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import worker from "../src/worker.js";

// Run the Worker's real D1 SQL on SQLite. Identity and D1 transport are fixtures.
const directory = mkdtempSync(join(tmpdir(), "numeria-draft-cas-"));
function sql(query, args = [], script = false) {
  const result = spawnSync("python3", ["-c", `import sqlite3,json,sys
p=json.load(sys.stdin);c=sqlite3.connect(p['database']);c.row_factory=sqlite3.Row
if p['script']:
 c.executescript(p['query']);value=None
else:
 cur=c.execute(p['query'],p['args'])
 value=[dict(r) for r in cur.fetchall()] if cur.description else {'meta':{'changes':cur.rowcount}}
c.commit();print(json.dumps(value))
`], { input: JSON.stringify({ database: join(directory, "test.sqlite"), query, args, script }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
let waiting = [], holdReads = false, beforeWrite = null, failWrite = false;
const db = { prepare(query) { return {
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
async function api(path, body) {
  const response = await worker.fetch(new Request(`https://fixture.test${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Workspace-Id": "cas_ws", "X-User-Id": "cas_owner" },
    body: body ? JSON.stringify(body) : undefined,
  }), env, {});
  return { status: response.status, body: await response.json() };
}
const save = (message, expectedDraftVersion) => api("/api/appraisals/save-draft", {
  appraisalId: "session_cas", expectedDraftVersion, question: message,
  snapshot: { id: "session_cas", name: "架空", theme: message, customReportItems: [], drafts: {} },
});
try {
  for (const file of readdirSync("migrations").filter(name => name.endsWith(".sql")).sort()) sql(readFileSync(join("migrations", file), "utf8"), [], true);
  const initial = await save("初回", null);
  assert.equal(initial.status, 201);
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
  failWrite = true;
  await assert.rejects(() => save("保存失敗の本文", persisted.draftVersion), /fixture disk failure/);
  assert.deepEqual(JSON.parse(sql("SELECT active_draft_json FROM usage_records")[0].active_draft_json), persisted);
  console.log("SQLite verified: concurrent CAS winner/409, stale version, Report/counter retention, blank fields, and write failure.");
} finally { rmSync(directory, { recursive: true, force: true }); }
