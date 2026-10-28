import assert from "node:assert/strict";
import { createReportTemplate, normalizeReportTemplate, switchReportLayout } from "../src/report-template-contract.js";

const legacy = {
  id: "legacy-1",
  name: "旧プリセット",
  layout: "unpublished-layout",
  theme: "kept-for-audit",
  pages: ["NUM-01", { id: "REMOVED-99", content: "破棄しない" }],
  editedText: { overview: "編集済み本文" },
  results: { lifePath: 7 },
};
const normalized = normalizeReportTemplate(legacy);
assert.equal(normalized.layoutId, "standard");
assert.equal(normalized.requestedLayoutId, "unpublished-layout");
assert.equal(normalized.layoutFallbackApplied, true);
assert.equal(normalized.pageSelection[0].pageDefinitionId, "NUM-01");
assert.equal(normalized.migrationAudit.unknownPages[0].pageDefinitionId, "REMOVED-99");
assert.deepEqual(normalized.editedText, legacy.editedText);
assert.deepEqual(normalized.results, legacy.results);
assert.equal(normalized.migrationAudit.legacyFields.theme, "kept-for-audit");

const magazine = switchReportLayout(normalized, "magazine");
assert.equal(magazine.layoutId, "magazine");
assert.deepEqual(magazine.editedText, legacy.editedText);
assert.deepEqual(magazine.results, legacy.results);
assert.equal(createReportTemplate({ appearance: { backgroundId: "night", colorSetId: "gold" } }).appearance.backgroundId, "night");
console.log("Versioned report template normalization and non-destructive layout switching verified.");
