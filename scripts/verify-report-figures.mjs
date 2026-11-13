import { REPORT_RESULT_REFERENCES } from "../src/report-result-references.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REPORT_FIGURE_TYPES, reportFigureTypesForPage } from "../src/report-figure-types.js";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { renderReportFigure, validateReportFigure } from "../src/report-figure-renderer.js";
import { resolveReportPageFigures, renderReportPageFigures, createReportFigurePrintFormat } from "../src/report-page-figures.js";
import { createPhysicalPagePlan } from "../src/report-physical-page-plan.js";
import vm from "node:vm";
import { REPORT_FIGURE_CSS } from "../src/report-figure-renderer.js";

const fixtures = JSON.parse(readFileSync("tests/fixtures/report-figures.notion.json", "utf8"));
assert.equal(Object.keys(REPORT_FIGURE_TYPES).length, 12);
assert.deepEqual(fixtures.map(f => f.type).sort(), Object.keys(REPORT_FIGURE_TYPES).sort());
for (const fixture of fixtures) {
  assert.equal(validateReportFigure(fixture, { allowExample: true }).ok, true, fixture.type);
  assert.equal(validateReportFigure(fixture).code, "FIGURE_SAMPLE_FORBIDDEN");
  const html = renderReportFigure(fixture, { allowExample: true });
  assert.ok(html.includes('data-figure-type="' + fixture.type + '"'));
  assert.match(html, /サンプル/);
  assert.match(renderReportFigure(fixture), /FIGURE_SAMPLE_FORBIDDEN/);
  assert.equal(validateReportFigure({ ...fixture, data: {} }, { allowExample: true }).ok, false);
  for (const state of ["missing_input", "unsupported", "error"]) {
    const data = { ...fixture, state, error: { code: "fixture", message: "fixture error" } };
    assert.ok(renderReportFigure(data, { allowExample: true }).includes('role="status"'));
  }
}
assert.equal(REPORT_PAGE_DEFINITIONS.filter(d => reportFigureTypesForPage(d).length).length, 82);
assert.deepEqual(reportFigureTypesForPage(REPORT_PAGE_DEFINITIONS.find(d => d.pageDefinitionId === "TAR-02")), ["FIG-CARDS"]);
assert.deepEqual(reportFigureTypesForPage(REPORT_PAGE_DEFINITIONS.find(d => d.pageDefinitionId === "NUM-04")), ["FIG-RELATION", "FIG-TIME"]);
const malicious = structuredClone(fixtures[0]);
malicious.data.items[0].label = '<img src=x onerror="bad">';
assert.doesNotMatch(renderReportFigure(malicious, { allowExample: true }), /<img/);
assert.match(renderReportFigure(malicious, { allowExample: true }), /&lt;img/);
for (const type of ["FIG-CARDS", "FIG-SPREAD", "FIG-RESULT"]) assert.equal(validateReportFigure({ ...fixtures.find(f => f.type === type), state: "empty" }, { allowExample: true }).ok, false);
console.log("Canonical 12 figure modes: sample isolation, shape validation, rendering, states, escaping, and page mapping verified.");

// Synthetic integration input verifies plumbing, not calculation correctness.
const definition = REPORT_PAGE_DEFINITIONS.find(d => d.pageDefinitionId === "NUM-01");
const figure = { ...structuredClone(fixtures[0]), exampleOnly: false };
const record = { methodKey: "numerology", status: "confirmed", calculationVersion: figure.calculationVersion, resultRevision: figure.resultRevision, subjectRefs: figure.subjectRefs, validationEvidence: ["synthetic-integration-only"], results: [{ resultKey: "core_numbers", data: {} }], pageAvailability: [{ pageDefinitionId: "NUM-01", available: true, validationEvidence: ["synthetic-integration-only"] }], figures: [{ pageDefinitionId: "NUM-01", figure }] };
assert.equal(resolveReportPageFigures(definition, record).available, true);
assert.match(renderReportPageFigures(definition, record), /data-figure-type="FIG-RESULT"/);
for (const invalid of [
  { ...record, figures: [] },
  { ...record, figures: [...record.figures, ...record.figures] },
  { ...record, status: "draft" },
  { ...record, methodKey: "tarot" },
  { ...record, resultRevision: "other" },
  { ...record, subjectRefs: ["other"] },
  { ...record, figures: [{ pageDefinitionId: "NUM-01", figure: fixtures[0] }] },
]) {
  assert.equal(resolveReportPageFigures(definition, invalid).available, false);
  assert.doesNotMatch(renderReportPageFigures(definition, invalid), /<svg|<dl/);
}
assert.equal(renderReportPageFigures(REPORT_PAGE_DEFINITIONS.find(d => d.pageDefinitionId === "TAR-05"), record), "");
const runtime = readFileSync("scripts/block-editor-runtime.js", "utf8");
const printSupport = runtime.slice(runtime.indexOf("const PRINT_PAGE_CSS="), runtime.indexOf("function measurePhysicalPlan("));
const printedFigure = vm.runInNewContext(`${printSupport};renderPrintBlock({type:"body",reportFigure:figure})`, {
  figure, REPORT_FIGURE_CSS, renderReportFigure, isResultBlock: () => false, esc: value => value,
});
assert.match(printedFigure, /data-figure-type="FIG-RESULT"/);
const format = { pages: [{ pageId: "p", pageDefinitionId: "NUM-01", layoutRegions: [{ regionId: "r", columns: 1, columnBlocks: [[{ blockId: "title", type: "page-title", content: "test" }]] }] }] };
const snapshot = JSON.stringify(format);
const printFormat = createReportFigurePrintFormat(format, [definition], record);
assert.equal(JSON.stringify(format), snapshot);
const blocks = printFormat.pages[0].layoutRegions.flatMap(r => r.columnBlocks.flat());
assert.equal(blocks.length, 2);
assert.equal(blocks[0].type, "page-title");
assert.equal(blocks[1].reportFigure.type, "FIG-RESULT");
const plan = createPhysicalPagePlan(printFormat, { title: 100, [blocks[1].blockId]: 850 }, { contentHeightPx: 900 });
assert.equal(plan.warnings.length, 0);
assert.equal(plan.physicalPages.length, 2);
assert.equal(plan.physicalPages[1].items[0].blockId, blocks[1].blockId);
for (const type of ["FIG-ASTRO", "FIG-ZIW"]) {
  const partial = { ...fixtures.find(f => f.type === type), exampleOnly: false };
  assert.equal(validateReportFigure(partial).code, "FULL_CHART_CONTRACT_UNCONNECTED");
}

for (const definition of REPORT_PAGE_DEFINITIONS) {
  assert.deepEqual(reportFigureTypesForPage(definition), REPORT_RESULT_REFERENCES.find(row => row.pageDefinitionId === definition.pageDefinitionId).figureTypes, definition.pageDefinitionId);
}
