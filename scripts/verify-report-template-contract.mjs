import assert from "node:assert/strict";
import { createReportTemplate, moveReportPage, normalizeReportTemplate, setReportPageTitle, setReportPageVisibility, switchReportLayout } from "../src/report-template-contract.js";

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
const hidden = setReportPageVisibility({
  ...normalized,
  pageSelection: [{ pageDefinitionId: "NUM-01", content: "保存済み本文", visible: true }],
}, "NUM-01", false);
assert.equal(hidden.pageSelection[0].visible, false);
assert.equal(hidden.pageSelection[0].content, "保存済み本文");
const shownAgain = setReportPageVisibility(hidden, "NUM-01", true);
assert.equal(shownAgain.pageSelection[0].visible, true);
assert.equal(shownAgain.pageSelection[0].content, "保存済み本文");
const renamed = setReportPageTitle({ pageSelection: [{ pageDefinitionId: "NUM-01", title: "本質", content: "本文は保持" }] }, "NUM-01", "あなたの本質");
assert.equal(renamed.pageSelection[0].title, "あなたの本質");
assert.equal(renamed.pageSelection[0].content, "本文は保持");
const reordered = moveReportPage({ pageSelection: [
  { pageDefinitionId: "NUM-01", order: 0, content: "先頭の本文" },
  { pageDefinitionId: "NUM-02", order: 1, content: "次の本文" },
] }, "NUM-02", -1);
assert.deepEqual(reordered.pageSelection.map((page) => page.pageDefinitionId), ["NUM-02", "NUM-01"]);
assert.equal(reordered.pageSelection[1].content, "先頭の本文");
assert.equal(createReportTemplate({ appearance: { backgroundId: "night", colorSetId: "gold" } }).appearance.backgroundId, "night");
console.log("Versioned report template normalization, visibility, and non-destructive switching verified.");
