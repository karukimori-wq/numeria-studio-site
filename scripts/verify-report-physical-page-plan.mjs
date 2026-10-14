import assert from "node:assert/strict";
import { createPhysicalPagePlan, A4_LAYOUT_CONTRACT_VERSION } from "../src/report-physical-page-plan.js";

const format = { pages: [{ pageId: "logical_1", layoutRegions: [{ regionId: "region_1", columns: 2, columnBlocks: [[{ blockId: "left", type: "body" }], [{ blockId: "right", type: "body" }]] }] }] };
const plan = createPhysicalPagePlan(format, { left: 600, right: 600 }, { contentHeightPx: 900 });
assert.equal(plan.contractVersion, A4_LAYOUT_CONTRACT_VERSION);
assert.equal(plan.physicalPages.length, 2);
assert.equal(plan.physicalPages[0].items[0].continuationColumns, 2);
assert.equal(plan.physicalPages[1].items[0].blockId, "right");
assert.equal(plan.physicalPages[1].items[0].continuationColumns, 1);
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
console.log("Physical A4 page plan contract verified.");
