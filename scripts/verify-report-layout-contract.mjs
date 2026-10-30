import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { createLogicalPageLayout } from "../src/report-layout-contract.js";
import { resolveReportVisual, VISUAL_STATE } from "../src/report-visual-registry.js";
import { readFileSync } from "node:fs";

const relationship = REPORT_PAGE_DEFINITIONS.find((item) => item.pageDefinitionId === "NUM-02");
const magazine = createLogicalPageLayout({ layoutId: "magazine", pageDefinition: relationship, visual: { value: 7 }, registeredExplanation: "登録解説", customComment: "独自コメント" });
assert.equal(magazine.layoutId, "magazine");
assert.equal(magazine.columns.length, 2);
assert.equal(magazine.columns[0][0].nonSplittable, true);
assert.equal(magazine.continuation[0].value, "独自コメント");

for (const id of ["TAR-01", "AST-01", "ZIW-01"]) {
  const pageDefinition = REPORT_PAGE_DEFINITIONS.find((item) => item.pageDefinitionId === id);
  const layout = createLogicalPageLayout({ layoutId: "magazine", pageDefinition });
  assert.equal(layout.adaptedToFullWidth, true);
  assert.equal(layout.layoutId, "magazine");
}
const standard = createLogicalPageLayout({ layoutId: "invalid", pageDefinition: relationship });
assert.equal(standard.layoutId, "standard");

const confirmed = { methodKey: "numerology", status: "confirmed", calculationVersion: "fixture.v1", validationEvidence: ["fixture"], results: [{ resultKey: "core_numbers", data: { values: [7] } }] };
const resolvedReady = createLogicalPageLayout({ layoutId: "magazine", pageDefinition: relationship, resolvedVisual: resolveReportVisual("NUM-02", confirmed, { items: [7] }) });
assert.equal(resolvedReady.columns[0][0].value.mode, "renderer");
assert.equal(resolvedReady.columns[0][0].value.renderable, true);
assert.equal(resolvedReady.columns[0][0].nonSplittable, true);
const resolvedMissing = createLogicalPageLayout({ layoutId: "magazine", pageDefinition: relationship, resolvedVisual: resolveReportVisual("NUM-02", null) });
assert.equal(resolvedMissing.columns[0][0].value.state, VISUAL_STATE.NOT_CALCULATED);
assert.equal(resolvedMissing.columns[0][0].value.mode, "status");
assert.equal("data" in resolvedMissing.columns[0][0].value, false);
const textOnlyDefinition = REPORT_PAGE_DEFINITIONS.find((item) => item.pageDefinitionId === "TAR-05");
const textOnly = createLogicalPageLayout({ layoutId: "magazine", pageDefinition: textOnlyDefinition, resolvedVisual: resolveReportVisual("TAR-05", null), registeredExplanation: "文章ページ" });
assert.equal(textOnly.adaptedToFullWidth, true);
assert.equal(textOnly.blocks.some((block) => block.type === "visual"), false);
assert.equal(textOnly.blocks.find((block) => block.type === "registered-explanation").value, "文章ページ");

const runtimePatch = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
assert.ok(runtimePatch.includes('.numeria-layout-magazine.report-paper:not(.pdf-capture){grid-template-columns:1fr}'), "Mobile preview collapses Magazine to one column without changing PDF capture");
assert.ok(runtimePatch.includes('.pdf-export-stage .numeria-layout-magazine.report-paper,.numeria-layout-magazine.report-paper.pdf-capture{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}'), "PDF capture keeps Magazine at two columns on mobile devices");
assert.ok(runtimePatch.includes('.pdf-export-stage .report-paper,.report-paper.pdf-capture{width:794px!important;max-width:794px!important}'), "PDF capture uses a stable A4 raster width");
console.log("Standard, Magazine, mobile collapse, PDF parity, and full-width visual fallback verified.");
