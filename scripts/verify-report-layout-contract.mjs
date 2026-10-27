import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { createLogicalPageLayout } from "../src/report-layout-contract.js";

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
console.log("Standard, magazine, paired columns, and full-width visual fallback verified.");
