import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
for (const token of ["NumeriaReportTemplateV2", "numeria:report-template-change", "data-report-layout-id", "aria-pressed", "aria-current", "numeria-layout-magazine", "break-inside:avoid", "reportTemplateV2Runtime", "reportTemplateV2Style"]) {
  assert.ok(source.includes(token), `Missing report template runtime guard: ${token}`);
}
assert.ok(source.includes("presetSelectionRuntime + reportTemplateV2Runtime"));
console.log("Report template v2 runtime and non-splitting layout styling verified.");
