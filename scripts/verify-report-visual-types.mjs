import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS, REPORT_RENDERER_TYPES, REPORT_VISUAL_TYPES } from "../src/report-page-definitions.js";

const expectedTypes = [
  ["result-icons", "結果アイコン"],
  ["result-table", "結果表"],
  ["relationship-map", "関係図"],
  ["period-timeline", "期間図"],
  ["placement-map", "配置マップ"],
  ["card-spread", "カード配置図"],
  ["direction-board", "方位盤"],
  ["direction-map", "方位マップ"],
  ["composition-ratio", "構成比"],
  ["natal-wheel", "天体図"],
  ["destiny-chart", "命盤"],
  ["text-only", "文章中心"],
];

assert.deepEqual(REPORT_VISUAL_TYPES.map(({ rendererType, label }) => [rendererType, label]), expectedTypes);
assert.deepEqual(REPORT_RENDERER_TYPES, expectedTypes.map(([rendererType]) => rendererType));
assert.equal(new Set(REPORT_RENDERER_TYPES).size, 12);
assert.equal(REPORT_VISUAL_TYPES.filter((type) => type.visual).length, 11);
assert.equal(REPORT_VISUAL_TYPES.filter((type) => !type.visual).length, 1);
assert.deepEqual([...new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.rendererType))].sort(), [...REPORT_RENDERER_TYPES].sort());
assert.ok(REPORT_PAGE_DEFINITIONS.every((definition) => REPORT_RENDERER_TYPES.includes(definition.rendererType)));
assert.ok(REPORT_PAGE_DEFINITIONS.every((definition) => definition.visualRequired === (definition.rendererType !== "text-only")));

console.log("All 12 report display types are named and mapped across the 85-page catalog.");
