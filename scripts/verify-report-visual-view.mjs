import assert from "node:assert/strict";
import { createReportVisualView } from "../src/report-visual-view.js";
import { VISUAL_STATE, resolveReportVisual } from "../src/report-visual-registry.js";

const confirmed = { methodKey: "numerology", status: "confirmed", calculationVersion: "fixture.v1", validationEvidence: ["fixture"], results: [{ resultKey: "core_numbers", data: { values: [7] } }] };
const cases = [
  [resolveReportVisual("NUM-01", confirmed, { items: [7] }), VISUAL_STATE.READY, "renderer", true],
  [resolveReportVisual("NUM-01", confirmed, { items: [] }), VISUAL_STATE.EMPTY, "status", false],
  [resolveReportVisual("NUM-01", null), VISUAL_STATE.NOT_CALCULATED, "status", false],
  [resolveReportVisual("NUM-01", null, { inputComplete: false }), VISUAL_STATE.INPUT_INCOMPLETE, "status", false],
  [resolveReportVisual("NUM-01", { status: "draft" }), VISUAL_STATE.CONTRACT_UNCONNECTED, "status", false],
  [resolveReportVisual("TAR-05", null), VISUAL_STATE.TEXT_ONLY, "omitted", false],
];

for (const [resolved, state, mode, renderable] of cases) {
  const view = createReportVisualView(resolved);
  assert.equal(view.state, state);
  assert.equal(view.mode, mode);
  assert.equal(view.renderable, renderable);
  if (!renderable) assert.equal("data" in view, false);
}

const ready = createReportVisualView(cases[0][0]);
assert.equal(ready.visualId, "visual.num.01.v1");
assert.equal(ready.rendererType, "result-icons");
assert.equal(ready.rendererLabel, "結果アイコン");
assert.deepEqual(ready.data, confirmed);
assert.deepEqual(createReportVisualView(null), {
  state: VISUAL_STATE.CONTRACT_UNCONNECTED,
  mode: "status",
  renderable: false,
  title: "図表を表示できません",
  message: "確定結果との接続を確認してください。",
  reason: "visual-state-invalid",
  missing: [],
});
for (const invalidReady of [
  { state: VISUAL_STATE.READY, visual: {}, data: confirmed },
  { state: VISUAL_STATE.READY, visual: cases[0][0].visual, data: { status: "draft" } },
  { state: VISUAL_STATE.READY, visual: cases[0][0].visual },
]) {
  const view = createReportVisualView(invalidReady);
  assert.equal(view.state, VISUAL_STATE.CONTRACT_UNCONNECTED);
  assert.equal(view.renderable, false);
  assert.equal("data" in view, false);
}

console.log("Report visual views render only confirmed results and expose explicit non-renderable states.");
