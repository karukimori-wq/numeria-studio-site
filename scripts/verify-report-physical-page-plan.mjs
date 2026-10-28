import assert from "node:assert/strict";
import { createPhysicalPagePlan, A4_LAYOUT_CONTRACT_VERSION } from "../src/report-physical-page-plan.js";

const format = { pages: [{ pageId: "logical_1", layoutRegions: [{ regionId: "region_1", columns: 2, columnBlocks: [[{ blockId: "left", type: "body" }], [{ blockId: "right", type: "body" }]] }] }] };
const plan = createPhysicalPagePlan(format, { left: 600, right: 600 }, { contentHeightPx: 900 });
assert.equal(plan.contractVersion, A4_LAYOUT_CONTRACT_VERSION);
assert.equal(plan.physicalPages.length, 1);
assert.equal(plan.physicalPages[0].items[0].continuationColumns, 2);
assert.equal(plan.physicalPages[0].items[1].blockId, "right");
assert.equal(plan.physicalPages[0].items[1].continuationColumns, 2);
assert.equal(plan.warnings.length, 0);
const pending = createPhysicalPagePlan(format, {}, { contentHeightPx: 900 });
assert.equal(pending.warnings[0].code, "MEASUREMENT_REQUIRED");

const headingFormat = { pages: [{ pageId: "logical_2", layoutRegions: [{ regionId: "region_2", columns: 1, ratio: "50:50", columnBlocks: [[
  { blockId: "intro", type: "body" },
  { blockId: "heading", type: "heading" },
  { blockId: "detail", type: "body" },
]] }] }] };
const headingPlan = createPhysicalPagePlan(headingFormat, { intro: 700, heading: 100, detail: 150 }, { contentHeightPx: 900 });
assert.equal(headingPlan.physicalPages.length, 2);
assert.deepEqual(headingPlan.physicalPages[1].items.map((item) => item.blockId), ["heading", "detail"]);

const paragraphFormat = { pages: [{ pageId: "logical_3", layoutRegions: [{ regionId: "region_3", columns: 1, columnBlocks: [[
  { blockId: "long-text", type: "body" }, { blockId: "after-text", type: "body" },
]] }] }] };
const paragraphPlan = createPhysicalPagePlan(paragraphFormat, { "long-text": 1400, "after-text": 120 }, { contentHeightPx: 900 });
assert.equal(paragraphPlan.warnings.length, 0);
assert.equal(paragraphPlan.physicalPages.length, 2);
assert.equal(paragraphPlan.physicalPages[0].items[0].paragraphFlow, true);
assert.equal(paragraphPlan.physicalPages[1].items[0].blockId, "after-text");

const visibilityFormat = {
  pageSelection: [{ pageDefinitionId: "NUM-01", visible: false }],
  pages: [
    { pageId: "fixed", pageDefinitionId: "NUM-01", layoutRegions: [{ regionId: "fixed-region", columns: 1, ratio: "100", columnBlocks: [[{ blockId: "saved-content", type: "body", content: "削除しない本文" }]] }] },
    { pageId: "free", layoutRegions: [{ regionId: "free-region", columns: 1, ratio: "100", columnBlocks: [[{ blockId: "free-content", type: "body", content: "自由ページ" }]] }] },
  ],
};
const hiddenPlan = createPhysicalPagePlan(visibilityFormat, { "saved-content": 100, "free-content": 100 }, { contentHeightPx: 900 });
assert.deepEqual(hiddenPlan.physicalPages.map((page) => page.logicalPageId), ["free"]);
assert.equal(visibilityFormat.pages[0].layoutRegions[0].columnBlocks[0][0].content, "削除しない本文");
visibilityFormat.pageSelection[0].visible = true;
const restoredPlan = createPhysicalPagePlan(visibilityFormat, { "saved-content": 100, "free-content": 100 }, { contentHeightPx: 900 });
assert.deepEqual(restoredPlan.physicalPages.map((page) => page.logicalPageId), ["fixed", "free"]);
console.log("Physical A4 page plan contract verified.");
