import assert from "node:assert/strict";
import { REPORT_PAGE_DEFINITIONS } from "../src/report-page-definitions.js";
import { createReportVisualSlot } from "../src/report-visual-slot.js";

const visualDefinition = REPORT_PAGE_DEFINITIONS.find((definition) => definition.pageDefinitionId === "NUM-01");
const unavailable = createReportVisualSlot(visualDefinition, { available: false, code: "PAGE_INPUT_INCOMPLETE", reason: "8結果のうち7結果が未算出です" });
assert.deepEqual(unavailable, {
  kind: "unavailable",
  visualId: "visual.num.01.v1",
  rendererType: "result-icons",
  rendererLabel: "結果アイコン",
  diagramSpecification: "結果アイコン（対象数8）",
  availabilityCode: "PAGE_INPUT_INCOMPLETE",
  reason: "8結果のうち7結果が未算出です",
});
const ready = createReportVisualSlot(visualDefinition, { available: true, code: "AVAILABLE", reason: "" });
assert.equal(ready.kind, "ready");
assert.equal(ready.reason, "");
const textOnly = createReportVisualSlot(REPORT_PAGE_DEFINITIONS.find((definition) => definition.pageDefinitionId === "TAR-05"), { available: true });
assert.deepEqual(textOnly, { kind: "text-only" });
assert.deepEqual(createReportVisualSlot(null, null), { kind: "text-only" });

console.log("Fixed-page visual slots expose renderer identity without fabricating result content.");
