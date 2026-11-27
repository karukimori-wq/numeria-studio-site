import assert from "node:assert/strict";
import { calculateReadingSnapshot } from "../src/reading-calculation.js";
import { createTarotReadingSnapshot, tarotSelectionKey } from "../src/tarot-reading-draft.js";
import worker from "../src/worker.js";
import { freezeCompletedReadingReport, completedReadingExportBody } from "../src/completed-reading-report.js";
import { readingReferenceConflict } from "../src/reading-calculation.js";

const reading = { id: "forged-id", divination: "tarot", name: "計算検証", birthday: "2009-11-11", visitDate: "2026-11-27", numerologyCalculation: { status: "confirmed", results: [{ data: { lifePath: 99 } }] } };
const calculated = await calculateReadingSnapshot(reading, { id: "canonical-id", methodKey: "numerology" });
assert.equal(calculated.id, "canonical-id");
assert.equal(calculated.numerologyCalculation.results[0].data.lifePath, 33);
assert.equal(calculated.numerologyCalculation.results[0].data.destiny, null);
assert.equal(calculated.numerologyCalculation.verificationState, "review-required");
assert.equal(reading.numerologyCalculation.status, "confirmed", "caller remains untouched");
const customer = { id: "fixture-person", name: "配置検証", birthday: "1990-01-01" };
const editor = { theme: "", optionA: "", optionB: "", partnerRef: "", spreadId: "one-oracle", deckSize: 22, reversalsEnabled: true, referenceDate: "2026-11-27", question: "確認", selections: [{ cardIndex: 0, reversed: false, text: "保持する手入力" }] };
editor.confirmationKey = tarotSelectionKey(customer, editor);
const tarot = createTarotReadingSnapshot({ id: "tarot-fixture", customer, editor });
tarot.tarotCalculation.cards = [{ cardId: "XXI", positionId: "message", orientation: "reversed" }];
const corrected = await calculateReadingSnapshot(tarot, { id: tarot.id, methodKey: "tarot" });
assert.equal(corrected.tarotCalculation.cards[0].cardId, "0");
assert.equal(corrected.tarotEditor.selections[0].text, "保持する手入力");
assert.equal((await calculateReadingSnapshot({ ...tarot, tarotEditor: null }, { id: tarot.id, methodKey: "tarot" })).tarotCalculation.status, "input-incomplete");

const env = { AUTH_ENFORCEMENT_MODE: "observe" };
const api = async (path, body) => {
  const response = await worker.fetch(new Request(`https://fixture.test${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Workspace-Id": "canonical-calculation-fixture", "X-User-Id": "fixture" }, body: JSON.stringify(body) }), env, {});
  return { status: response.status, body: await response.json() };
};
const saved = await api("/api/appraisals/save-draft", { appraisalId: "canonical-id", divination: "numerology", snapshot: reading });
assert.equal(saved.status, 201);
assert.equal(saved.body.activeDraft.snapshot.numerologyCalculation.results[0].data.lifePath, 33);
for (const snapshot of [[], null, "wrong", 1]) {
  for (const path of ["save-draft", "complete"]) assert.equal((await api(`/api/appraisals/${path}`, { appraisalId: "canonical-id", snapshot })).status, 400);
}
assert.equal(completedReadingExportBody({ id: "missing", lifePathNumber: 99, snapshot: { numerologyCalculation: { results: [{ data: { lifePath: null } }] } } }).lifePathNumber, null);
const done = await api("/api/appraisals/complete", { appraisalId: "canonical-id", divination: "numerology", snapshot: reading });
assert.equal(done.status, 201);
assert.equal(done.body.appraisal.snapshot.id, "canonical-id");
assert.equal(done.body.appraisal.snapshot.numerologyCalculation.results[0].data.lifePath, 33);
const frozen = done.body.appraisal.snapshot.completedReadingReport;
assert.equal(frozen.content.reading.numerologyCalculation.results[0].data.lifePath, 33);
assert.match(frozen.contentHash, /^[a-f0-9]{64}$/);
assert.equal(frozen.publicationAllowed, false);
const exported = await api("/api/reports/export", { appraisalId: "canonical-id", clientName: "差し替え", lifePathNumber: 99, readingSnapshot: { forged: true } });
assert.equal(exported.status, 201);
const report = exported.body.reportSnapshot || exported.body.report?.reportSnapshot;
assert.ok(report, JSON.stringify(Object.keys(exported.body)));
assert.equal(report.readingSnapshot.completedReadingReport.contentHash, frozen.contentHash);
assert.equal(report.lifePathNumber, 33);
assert.equal((await api("/api/reports/export", { appraisalId: "other-session" })).status, 404);
const repeated = await api("/api/appraisals/complete", { appraisalId: "canonical-id", snapshot: { birthday: "1900-01-01" } });
assert.deepEqual(repeated.body.appraisal.snapshot, done.body.appraisal.snapshot, "completed snapshots cannot be replaced by completion retries");
const withCopy = await freezeCompletedReadingReport({ ...calculated, numerologyRegisteredPagesEnabled: true, drafts: { overview: "保存する編集済み本文" }, customReportItems: [{ id: "comment", text: "固定するコメント" }] }, "free");
assert.ok(withCopy.completedReadingReport.content.registeredDraft.pages.length > 0);
assert.ok(withCopy.completedReadingReport.content.registeredDraft.pages.some(page => page.frames.some(frame => frame.segments.some(segment => typeof segment.text === "string" && segment.text.length > 0))));
assert.equal(withCopy.completedReadingReport.content.reading.drafts.overview, "保存する編集済み本文");
assert.equal(withCopy.completedReadingReport.content.reading.customReportItems[0].text, "固定するコメント");
for (const [inputKey, referenceKey, code] of [["kigakuInput", "referenceInstant", "KIGAKU_REFERENCE_LOCKED"], ["fourPillarsInput", "referenceDate", "FOUR_PILLARS_REFERENCE_LOCKED"]]) {
  const previous = { [inputKey]: { [referenceKey]: "2026-11-27" } };
  assert.equal(readingReferenceConflict(previous, { divination: "tarot" }), code);
  assert.equal(readingReferenceConflict(previous, { ...previous, divination: "tarot" }), null);
}
console.log("Shared server calculation rejects forged/stale numbers and cards on both draft and completion; immutable completion retry verified.");
