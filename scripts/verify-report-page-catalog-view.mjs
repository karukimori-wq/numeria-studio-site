import assert from "node:assert/strict";
import { buildReportPageCatalogView } from "../src/report-page-catalog-view.js";
import { REPORT_PAGE_DEFINITIONS, reportPageDefinitionsFor } from "../src/report-page-definitions.js";

const METHOD_KEYS = ["numerology", "tarot", "nine-star-ki", "four-pillars", "western-astrology", "zi-wei-dou-shu"];
const expectedIds = REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId).sort();

const proViews = METHOD_KEYS.map((methodKey) => buildReportPageCatalogView(reportPageDefinitionsFor(methodKey, "pro")));
const displayedProIds = proViews.flatMap((view) => view.pageDefinitionIds).sort();
assert.deepEqual(displayedProIds, expectedIds, "switching through all six Pro catalogs must display every canonical page exactly once");
assert.equal(proViews.reduce((total, view) => total + view.total, 0), 85);
assert.equal(proViews.reduce((total, view) => total + view.basic.length, 0), 25);
assert.equal(proViews.reduce((total, view) => total + view.additional.length, 0), 60);

const freeViews = METHOD_KEYS.map((methodKey) => buildReportPageCatalogView(reportPageDefinitionsFor(methodKey, "free")));
assert.equal(freeViews.reduce((total, view) => total + view.total, 0), 25);
assert.equal(freeViews.every((view) => view.additional.length === 0), true);
assert.deepEqual(freeViews.flatMap((view) => view.pageDefinitionIds).sort(), REPORT_PAGE_DEFINITIONS.filter((definition) => definition.tier === "basic").map((definition) => definition.pageDefinitionId).sort());

assert.throws(() => buildReportPageCatalogView([
  { pageDefinitionId: "NUM-01", tier: "basic" },
  { pageDefinitionId: "NUM-01", tier: "additional" },
]), /REPORT_PAGE_CATALOG_DUPLICATE_ID/);
assert.throws(() => buildReportPageCatalogView([{ pageDefinitionId: "NUM-01", tier: "unknown" }]), /REPORT_PAGE_CATALOG_UNKNOWN_TIER/);
assert.throws(() => buildReportPageCatalogView([{ tier: "basic" }]), /REPORT_PAGE_CATALOG_INVALID_ID/);

console.log("All 85 fixed pages are covered exactly once by the six-method catalog UI model.");
