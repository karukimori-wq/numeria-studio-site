import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { REPORT_PAGE_DEFINITIONS, reportPageDefinitionsFor } from "../src/report-page-definitions.js";

// Original 85-page catalog plus adopted decision 77 (NUM-07 renamed).
const NOTION_CATALOG_ID_TITLE_SHA256 = "806e3375ccd4ff957b7243894db0fc1b21879336ecb897d3b4a0fde22bcdda86";
const METHOD_KEYS = ["numerology", "tarot", "nine-star-ki", "four-pillars", "western-astrology", "zi-wei-dou-shu"];

const catalogIdTitleSnapshot = REPORT_PAGE_DEFINITIONS
  .map((definition) => `${definition.pageDefinitionId}|${definition.title}`)
  .sort()
  .join("\n");

assert.equal(REPORT_PAGE_DEFINITIONS.length, 85);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "basic").length, 25);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "additional").length, 60);
assert.equal(new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId)).size, 85);
assert.equal(reportPageDefinitionsFor("numerology", "free").length, 4);
assert.equal(reportPageDefinitionsFor("western-astrology", "pro").length, 16);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.title && definition.diagramSpecification && definition.availabilityCondition).length, 85);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.pageMode === "fixed" && definition.commentSlots === 1 && definition.commentDefaultEnabled).length, 85);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.visualRequired).length, 82);
assert.deepEqual(REPORT_PAGE_DEFINITIONS.filter((definition) => !definition.visualRequired).map((definition) => definition.pageDefinitionId), ["TAR-05", "TAR-06", "AST-08"]);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "basic" && definition.title).length, 25);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "additional" && definition.title).length, 60);
assert.equal(REPORT_PAGE_DEFINITIONS.find((definition) => definition.pageDefinitionId === "TAR-05").diagramSpecification, "なし・文章中心");
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.visualRequired && definition.visualId && definition.rendererType).length, 82);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.rendererLabel).length, 85);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => !definition.visualRequired && definition.visualId === null && definition.rendererType === "text-only").length, 3);
assert.deepEqual(Object.fromEntries(METHOD_KEYS.map((methodKey) => [methodKey, REPORT_PAGE_DEFINITIONS.filter((item) => item.methodKey === methodKey).length])), { numerology: 14, tarot: 13, "nine-star-ki": 14, "four-pillars": 14, "western-astrology": 16, "zi-wei-dou-shu": 14 });
assert.deepEqual(Object.fromEntries(METHOD_KEYS.map((methodKey) => [methodKey, {
  basic: REPORT_PAGE_DEFINITIONS.filter((item) => item.methodKey === methodKey && item.tier === "basic").length,
  additional: REPORT_PAGE_DEFINITIONS.filter((item) => item.methodKey === methodKey && item.tier === "additional").length,
}])), {
  numerology: { basic: 4, additional: 10 },
  tarot: { basic: 4, additional: 9 },
  "nine-star-ki": { basic: 4, additional: 10 },
  "four-pillars": { basic: 5, additional: 9 },
  "western-astrology": { basic: 4, additional: 12 },
  "zi-wei-dou-shu": { basic: 4, additional: 10 },
});
assert.equal(
  createHash("sha256").update(catalogIdTitleSnapshot).digest("hex"),
  NOTION_CATALOG_ID_TITLE_SHA256,
  "Report page IDs or titles differ from the Notion catalog with adopted decision 77",
);
console.log("Report page definition catalog verified against Notion: 85 total, 25 basic, 60 additional.");
