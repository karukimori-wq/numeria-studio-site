import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS, REPORT_RENDERER_TYPES } from "../src/report-page-definitions.js";
import { REPORT_VISUAL_REGISTRY, VISUAL_STATE, reportVisualSnapshotValue, resolveReportVisual } from "../src/report-visual-registry.js";

assert.equal(Object.keys(REPORT_VISUAL_REGISTRY).length, 85);
assert.ok(REPORT_PAGE_DEFINITIONS.every((item) => REPORT_RENDERER_TYPES.includes(item.rendererType)));
assert.ok(REPORT_PAGE_DEFINITIONS.every((item) => Array.isArray(item.requiredResultKeys) && Array.isArray(item.optionalResultKeys)));
assert.equal(resolveReportVisual("TAR-05", null).state, VISUAL_STATE.TEXT_ONLY);
assert.equal(resolveReportVisual("NUM-01", null).state, VISUAL_STATE.NOT_CALCULATED);
assert.equal(resolveReportVisual("NUM-01", null, { inputComplete: false }).state, VISUAL_STATE.INPUT_INCOMPLETE);
assert.equal(resolveReportVisual("NUM-01", { status: "draft" }).state, VISUAL_STATE.CONTRACT_UNCONNECTED);
const confirmed = { methodKey: "numerology", status: "confirmed", calculationVersion: "fixture.v1", validationEvidence: ["fixture"], results: [{ resultKey: "core_numbers", data: { values: [7] } }] };
const empty = resolveReportVisual("NUM-01", confirmed, { items: [] });
assert.equal(empty.state, VISUAL_STATE.EMPTY);
assert.equal(reportVisualSnapshotValue(empty), null);
const ready = resolveReportVisual("NUM-01", confirmed, { items: [7] });
assert.equal(ready.state, VISUAL_STATE.READY);
assert.equal(reportVisualSnapshotValue(ready).visualId, "visual.num.01.v1");
console.log("Visual registry and explicit result states verified.");
