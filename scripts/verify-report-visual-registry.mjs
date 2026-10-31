import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS, REPORT_RENDERER_TYPES, REPORT_VISUAL_TYPES } from "../src/report-page-definitions.js";
import { REPORT_VISUAL_REGISTRY, VISUAL_STATE, reportVisualSnapshotValue, reportVisualsForRenderer, resolveReportVisual } from "../src/report-visual-registry.js";

assert.equal(Object.keys(REPORT_VISUAL_REGISTRY).length, 85);
assert.ok(REPORT_PAGE_DEFINITIONS.every((item) => REPORT_RENDERER_TYPES.includes(item.rendererType)));
assert.ok(REPORT_PAGE_DEFINITIONS.every((item) => Array.isArray(item.requiredResultKeys) && Array.isArray(item.optionalResultKeys)));
const registryValues = Object.values(REPORT_VISUAL_REGISTRY);
const requiredVisuals = registryValues.filter((visual) => visual.required);
assert.equal(requiredVisuals.length, 82);
assert.equal(new Set(requiredVisuals.map((visual) => visual.visualId)).size, 82);
assert.ok(requiredVisuals.every((visual) => /^visual\.(num|tar|kig|baz|ast|ziw)\.\d{2}\.v1$/.test(visual.visualId)));
assert.deepEqual(registryValues.filter((visual) => !visual.required).map((visual) => visual.visualId), [null, null, null]);
assert.deepEqual(Object.fromEntries(REPORT_VISUAL_TYPES.map((type) => [type.rendererType, reportVisualsForRenderer(type.rendererType).length])), {
  "result-icons": 8,
  "result-table": 8,
  "relationship-map": 14,
  "period-timeline": 14,
  "placement-map": 1,
  "card-spread": 9,
  "direction-board": 4,
  "direction-map": 1,
  "composition-ratio": 3,
  "natal-wheel": 9,
  "destiny-chart": 11,
  "text-only": 3,
});
assert.ok(REPORT_VISUAL_TYPES.every((type) => reportVisualsForRenderer(type.rendererType).every((visual) => visual.rendererLabel === type.label)));
assert.throws(() => reportVisualsForRenderer("unknown"), /REPORT_VISUAL_RENDERER_UNKNOWN:unknown/);
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

const methodKeys = [...new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.methodKey))];
for (const definition of REPORT_PAGE_DEFINITIONS.filter((item) => item.visualRequired)) {
  for (const methodKey of methodKeys) {
    const sourceDefinition = REPORT_PAGE_DEFINITIONS.find((item) => item.methodKey === methodKey);
    const result = { ...confirmed, methodKey, results: sourceDefinition.requiredResultKeys.map((resultKey) => ({ resultKey, data: { fixture: true } })) };
    const resolved = resolveReportVisual(definition.pageDefinitionId, result);
    assert.equal(resolved.state, methodKey === definition.methodKey ? VISUAL_STATE.READY : VISUAL_STATE.CONTRACT_UNCONNECTED);
    if (methodKey !== definition.methodKey) {
      assert.equal(resolved.reason, "RESULT_METHOD_MISMATCH");
      assert.equal("data" in resolved, false);
      assert.equal(reportVisualSnapshotValue(resolved), null);
      assert.equal(resolveReportVisual(definition.pageDefinitionId, result, { items: [] }).state, VISUAL_STATE.CONTRACT_UNCONNECTED);
    }
  }
}
