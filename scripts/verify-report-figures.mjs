import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REPORT_FIGURE_TYPES, reportFigureTypesForPage } from "../src/report-figure-types.js";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { renderReportFigure, validateReportFigure } from "../src/report-figure-renderer.js";
import { resolveReportPageFigures, renderReportPageFigures } from "../src/report-page-figures.js";

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
