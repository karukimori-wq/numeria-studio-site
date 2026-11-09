import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizeNumerologyNameInputs, updateNumerologyNameInputs } from "../src/numerology-name-input.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";
import { NUMEROLOGY_APPROVAL_VERSION, numerologyApprovalScope, adaptNumerologyConfirmedResult, scopedNumerologyResultSource } from "../src/numerology-confirmed-result.js";
import { validateConfirmedDivinationResult, confirmedResultForBinding } from "../src/divination-result-contract.js";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { assessReportPageAvailability, reportPublicationBlockers } from "../src/report-page-availability.js";

let snapshot = { id: "reading-scope-a", divination: "numerology", name: "架空本人", birthday: "2009-11-11", birthName: "TARO YAMADA", visitDate: "2026-10-19", includeCompatibility: true, partnerName: "架空相手", partnerBirthName: "AOI SATO", partnerBirthday: "1990-01-02", partnerRelation: "家族" };
let names = normalizeNumerologyNameInputs(null);
for (const [role, romanName] of [["subject", "TARO YAMADA"], ["partner", "AOI SATO"]]) {
  names = updateNumerologyNameInputs(names, { role, operation: "edit", romanName }, snapshot).value;
  names = updateNumerologyNameInputs(names, { role, operation: "confirm" }, snapshot).value;
}
snapshot = withNumerologyCalculationCheckpoint({ ...snapshot, numerologyNameInputs: names });
// This approval is an isolated test fixture. No production approval is created.
const approvalFor = reading => ({ schemaVersion: NUMEROLOGY_APPROVAL_VERSION, status: "approved",
  scope: numerologyApprovalScope(reading), calculation: structuredClone({ results: reading.numerologyCalculation.results, pageResults: reading.numerologyCalculation.pageResults }),
  reviewId: "fixture-review-001", reviewedBy: "fixture-reviewer", reviewedAt: "2026-11-06T09:00:00Z",
  independentValidation: { coverage: "complete", evidence: ["fixture:independent-arithmetic-review"] } });
const approval = approvalFor(snapshot), original = JSON.stringify({ snapshot, approval });
const accepted = adaptNumerologyConfirmedResult(snapshot, approval);
assert.equal(accepted.ok, true);
assert.equal(validateConfirmedDivinationResult(accepted.record).ok, true);
assert.equal(accepted.record.results[0].data.lifePath, 33);
assert.deepEqual(accepted.record.subjectRefs, ["reading-scope-a:subject", "reading-scope-a:partner"]);
assert.equal(accepted.record.resultRevision, "fixture-review-001");
assert.equal(JSON.stringify({ snapshot, approval }), original);
assert.ok(accepted.record.pageAvailability.every(row => row.available === false), "Calculation approval cannot authorize incomplete formal pages.");
const definitions = REPORT_PAGE_DEFINITIONS.filter(row => row.methodKey === "numerology");
assert.ok(definitions.every(definition => !assessReportPageAvailability(definition, accepted.record).available));
assert.equal(reportPublicationBlockers({ selectedDivination: "numerology", pages: definitions.map(row => ({ pageDefinitionId: row.pageDefinitionId, methodKey: "numerology" })) }, definitions, accepted.record).length, 14);
const fails = (reading, review, code) => { const result = adaptNumerologyConfirmedResult(reading, review); assert.equal(result.ok, false); assert.equal(result.code, code); assert.equal(result.record, null); };
fails(null, approval, "NUMEROLOGY_READING_REQUIRED");
fails({ ...snapshot, id: "" }, approval, "SESSION_ID_REQUIRED");
fails({ ...snapshot, numerologyCalculation: null }, approval, "CALCULATION_CHECKPOINT_REQUIRED");
fails({ ...snapshot, numerologyCalculation: { ...snapshot.numerologyCalculation, calculationVersion: "old" } }, approval, "CALCULATION_VERSION_MISMATCH");
const tampered = structuredClone(snapshot); tampered.numerologyCalculation.results[0].data.lifePath = 9;
fails(tampered, approval, "CALCULATION_CHECKPOINT_MISMATCH");
fails(snapshot, null, "NUMEROLOGY_APPROVAL_REQUIRED");
fails(snapshot, JSON.parse(readFileSync("docs/block-editor/evidence/numerology-reference-run-2026-11-06.json", "utf8")), "NUMEROLOGY_APPROVAL_REQUIRED");
fails({ ...snapshot, exampleOnly: true }, approval, "EXAMPLE_RESULT_FORBIDDEN");
fails(snapshot, { ...approval, exampleOnly: true }, "EXAMPLE_RESULT_FORBIDDEN");
for (const changed of [{ id: "reading-scope-b" }, { name: "別人" }, { birthName: "CHANGED" }, { birthday: "2009-11-12" }, { visitDate: "2027-01-01" }, { partnerName: "別の相手" }, { partnerBirthday: "1990-01-03" }, { includeCompatibility: false }, { partnerRelation: "友人" }]) {
  fails(withNumerologyCalculationCheckpoint({ ...snapshot, ...changed }), approval, "NUMEROLOGY_APPROVAL_SCOPE_MISMATCH");
}
const currentNames = structuredClone(names); currentNames.subject.selected = "current";
fails(withNumerologyCalculationCheckpoint({ ...snapshot, numerologyNameInputs: currentNames }), approval, "NUMEROLOGY_APPROVAL_SCOPE_MISMATCH");
const wrongValues = structuredClone(approval); wrongValues.calculation.pageResults[0].data.lifePath = 7;
fails(snapshot, wrongValues, "NUMEROLOGY_APPROVED_VALUES_MISMATCH");
for (const changed of [{ reviewId: "" }, { reviewedBy: "" }, { reviewedAt: "invalid" }]) fails(snapshot, { ...approval, ...changed }, "NUMEROLOGY_REVIEW_REFERENCE_REQUIRED");
for (const validation of [null, { coverage: "partial", evidence: ["fixture"] }, { coverage: "complete", evidence: [] }, { coverage: "complete", evidence: [""] }, { coverage: "complete", testOnly: true, evidence: ["fixture"] }]) {
  fails(snapshot, { ...approval, independentValidation: validation }, "NUMEROLOGY_INDEPENDENT_VALIDATION_REQUIRED");
}
const reordered = structuredClone(approval); reordered.scope = Object.fromEntries(Object.entries(reordered.scope).reverse());
assert.equal(adaptNumerologyConfirmedResult(snapshot, reordered).ok, true, "Object key order must not change review binding.");
const cyclic = structuredClone(approval); cyclic.scope.self = cyclic.scope;
fails(snapshot, cyclic, "NUMEROLOGY_APPROVAL_SCOPE_MISMATCH");
const missingName = withNumerologyCalculationCheckpoint({ ...snapshot, numerologyNameInputs: null });
const partial = adaptNumerologyConfirmedResult(missingName, approvalFor(missingName)).record;
assert.equal(partial.results[0].data.lifePath, 33);
assert.equal(partial.results[0].data.destiny, null);
assert.equal(partial.pageAvailability.find(row => row.pageDefinitionId === "NUM-01").code, "PAGE_INPUT_INCOMPLETE");
const leap = withNumerologyCalculationCheckpoint({ ...snapshot, birthday: "2000-02-29" });
assert.equal(adaptNumerologyConfirmedResult(leap, approvalFor(leap)).record.pageAvailability.find(row => row.pageDefinitionId === "NUM-13").code, "FORMAL_PAGE_CONNECTION_REQUIRED");
const legacy = [{ ...accepted.record, inputScope: {} }, { methodKey: "tarot", status: "draft" }];
assert.deepEqual(scopedNumerologyResultSource(snapshot, null, legacy), [legacy[1]], "Unbound legacy numerology records must never be reused.");
assert.equal(scopedNumerologyResultSource(snapshot, approval, legacy).filter(row => row.methodKey === "numerology").length, 1);
assert.equal(legacy.length, 2);
approval.independentValidation.evidence.push("later mutation");
assert.deepEqual(accepted.record.validationEvidence, ["fixture:independent-arithmetic-review"]);

// Run the production source selector and numeric-block refresh at their DOM seam.
const runtime = readFileSync("scripts/block-editor-runtime.js", "utf8");
const selector = runtime.split("\n").find(line => line.startsWith("const confirmedResultSource="));
const environment = { data: { selectedDivination: "numerology" }, window: { NumeriaNavigation: { getReadingSnapshot: () => snapshot }, NumeriaNumerologyResultApproval: approval, NumeriaConfirmedDivinationResult: legacy }, scopedNumerologyResultSource };
assert.equal(vm.runInNewContext(`(()=>{${selector};return confirmedResultSource()})()`, environment).find(row => row.methodKey === "numerology").inputScope.source.sessionId, snapshot.id);
environment.data.selectedDivination = "tarot";
assert.equal(vm.runInNewContext(`(()=>{${selector};return confirmedResultSource()})()`, environment).some(row => row.methodKey === "numerology"), false);
const sourceCode = runtime.slice(runtime.indexOf("function isResultBlock("), runtime.indexOf("function renderBlock("));
const display = { outerHTML: "old confirmed number" }, block = { blockId: "number", type: "numerology-result", dataBinding: { source: "confirmed-result", methodKey: "numerology", resultKey: "core_numbers" } };
const context = { data: { pages: [{ layoutRegions: [{ columnBlocks: [[block]] }] }] }, root: { querySelectorAll: () => [{ dataset: { blockId: "number" }, querySelector: () => display }] },
  confirmedResultSource: () => scopedNumerologyResultSource(snapshot, null, legacy), confirmedResultForBinding,
  T: { "numerology-result": "数秘術の結果" }, esc: value => String(value) };
vm.runInNewContext(`${sourceCode};refreshNumerologyResultBlocks()`, context);
assert.match(display.outerHTML, /nbe-result-empty/);
assert.doesNotMatch(display.outerHTML, /old confirmed number/);
console.log("Numerology confirmed adapter: exact review scope/value binding, independent-evidence gate, stale/sample rejection, legacy isolation and formal page blockers verified.");
