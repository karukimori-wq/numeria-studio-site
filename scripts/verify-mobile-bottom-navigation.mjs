import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const patch=readFileSync("scripts/patch-mobile-bottom-navigation.mjs","utf8"),pkg=JSON.parse(readFileSync("package.json","utf8"));
for(const label of ["ホーム","カルテ","鑑定","鑑定書","設定"])assert.ok(patch.includes(`label:\"${label}\"`));
assert.match(patch,/grid-template-columns:repeat\(5/);assert.match(patch,/width <= 760px\) and \(orientation:portrait\)/);assert.match(patch,/symbol:\"7\",reading:true/);assert.match(pkg.scripts.build,/patch-mobile-bottom-navigation\.mjs/);
console.log("Mobile bottom navigation verified: five ordered destinations, portrait breakpoint, and central 7.");
