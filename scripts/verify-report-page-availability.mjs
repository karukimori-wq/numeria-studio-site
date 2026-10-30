import assert from "node:assert/strict";
import { assessReportPageAvailability, reportPublicationBlockers } from "../src/report-page-availability.js";

const definition = { pageDefinitionId: "NUM-01", methodKey: "numerology", title: "8つのコアナンバー", requiredResultKeys: ["core_numbers"] };
const format = {
  selectedDivination: "numerology",
  pageSelection: [{ pageDefinitionId: "NUM-01", visible: true }],
  pages: [{ pageId: "fixed_NUM_01", pageDefinitionId: "NUM-01", methodKey: "numerology" }],
};
const confirmed = {
  methodKey: "numerology",
  status: "confirmed",
  calculationVersion: "numerology-core.v1",
  validationEvidence: ["fixture:numerology-core-01"],
  results: [{ resultKey: "core_numbers", data: { lifePath: 7 } }],
  pageAvailability: [{ pageDefinitionId: "NUM-01", available: true, validationEvidence: ["fixture:NUM-01-complete"] }],
};

assert.equal(assessReportPageAvailability(definition, null).code, "CONFIRMED_RESULT_REQUIRED");
assert.equal(assessReportPageAvailability(definition, { ...confirmed, status: "draft" }).code, "RESULT_NOT_CONFIRMED");
assert.equal(assessReportPageAvailability(definition, { ...confirmed, calculationVersion: "" }).code, "CALCULATION_VERSION_REQUIRED");
assert.equal(assessReportPageAvailability(definition, { ...confirmed, validationEvidence: [] }).code, "VALIDATION_EVIDENCE_REQUIRED");
const missing = assessReportPageAvailability(definition, { ...confirmed, results: [] });
assert.equal(missing.code, "REQUIRED_RESULT_MISSING");
assert.match(missing.reason, /コアナンバー/);
const noPageEvidence = assessReportPageAvailability(definition, { ...confirmed, pageAvailability: [] });
assert.equal(noPageEvidence.code, "PAGE_EVIDENCE_REQUIRED", "a shared result key alone must not satisfy page-specific requirements");
const incomplete = assessReportPageAvailability(definition, { ...confirmed, pageAvailability: [{ pageDefinitionId: "NUM-01", available: false, unavailableReason: "8結果のうち7結果が未算出です" }] });
assert.equal(incomplete.code, "PAGE_INPUT_INCOMPLETE");
assert.equal(incomplete.reason, "8結果のうち7結果が未算出です");
assert.equal(assessReportPageAvailability(definition, { ...confirmed, pageAvailability: [{ pageDefinitionId: "NUM-01", available: true, validationEvidence: [] }] }).code, "PAGE_EVIDENCE_REQUIRED");
assert.equal(assessReportPageAvailability(definition, confirmed).available, true);
assert.equal(reportPublicationBlockers(format, [definition], null).length, 1);
assert.equal(reportPublicationBlockers(format, [definition], confirmed).length, 0);
format.pageSelection[0].visible = false;
assert.equal(reportPublicationBlockers(format, [definition], null).length, 0, "OFF fixed pages must not block publication");
format.pageSelection[0].visible = true;
format.pages[0].methodKey = "tarot";
assert.equal(reportPublicationBlockers(format, [definition], null).length, 0, "fixed pages from another method must not block publication");

console.log("Fixed-page availability reasons and publication guard verified.");
