import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { createLogicalPageLayout } from "../src/report-layout-contract.js";
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

const runtimePatch = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
assert.ok(runtimePatch.includes('.numeria-layout-magazine.report-paper:not(.pdf-capture){grid-template-columns:1fr}'), "Mobile preview collapses Magazine to one column without changing PDF capture");
assert.ok(runtimePatch.includes('.pdf-export-stage .numeria-layout-magazine.report-paper,.numeria-layout-magazine.report-paper.pdf-capture{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}'), "PDF capture keeps Magazine at two columns on mobile devices");
assert.ok(runtimePatch.includes('.pdf-export-stage .report-paper,.report-paper.pdf-capture{width:794px!important;max-width:794px!important}'), "PDF capture uses a stable A4 raster width");
console.log("Standard, Magazine, mobile collapse, PDF parity, and full-width visual fallback verified.");
