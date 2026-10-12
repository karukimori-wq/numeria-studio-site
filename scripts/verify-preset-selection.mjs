import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("scripts/patch-report-format-settings.mjs","utf8");
for(const p of ["NumeriaPresetSelectionV1","aria-pressed","numeria-preset-loaded","document.addEventListener(\"input\"","document.addEventListener(\"change\"","selectedName","presetSelectionRuntime","presetSelectionStyle"]){assert.ok(source.includes(p),"Missing preset cue guard: "+p)}
assert.ok(source.includes("source += coverEditorRuntime + stableSettingsRuntime + presetSelectionRuntime"),"Selection runtime must be included in built app");
assert.ok(source.includes("source += presetSelectionStyle"),"Selection styling must be included in built CSS");
console.log("Preset selection source guards passed");
