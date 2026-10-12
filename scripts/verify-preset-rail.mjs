import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
assert.match(source, /NumeriaPresetRail\.v2/, "Versioned preset rail styling exists");
assert.ok(source.includes(".saved-preset-list{position:relative;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important"), "Preset cards use a horizontal row");
assert.ok(source.includes("overflow-x:auto!important;overflow-y:hidden!important"), "Only the rail scrolls sideways");
assert.ok(source.includes("flex:0 0 min(260px,80vw)!important"), "Card width is constrained");
assert.ok(source.includes("button:first-child{min-width:0;overflow-wrap:anywhere"), "Long names cannot enlarge cards");
assert.ok(source.includes("source += presetListRepairRule;\n  if (!source.includes('NumeriaPresetRail.v2')) source += presetRailV2Rule;"), "New layout takes precedence after legacy overrides");
console.log("Preset rail layout guards passed.");
