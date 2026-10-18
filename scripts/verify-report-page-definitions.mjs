import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS, reportPageDefinitionsFor } from "../src/report-page-definitions.js";

assert.equal(REPORT_PAGE_DEFINITIONS.length, 85);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "basic").length, 25);
assert.equal(REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "additional").length, 60);
assert.equal(new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId)).size, 85);
assert.equal(reportPageDefinitionsFor("numerology", "free").length, 4);
assert.equal(reportPageDefinitionsFor("western-astrology", "pro").length, 16);
console.log("Report page definition catalog verified: 85 total, 25 basic, 60 additional.");
