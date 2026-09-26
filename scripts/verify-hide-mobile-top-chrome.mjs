import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const build = pkg.scripts?.build || "";
const patch = readFileSync("scripts/patch-hide-mobile-top-chrome.mjs", "utf8");

assert.match(build, /patch-hide-mobile-top-chrome\.mjs/, "Production build must hide legacy mobile top chrome.");
for (const token of [
  "NumeriaHideMobileTopChrome.v2",
  ".mobile-appbar",
  "#numeria-mobile-appbar",
  ".mobile-menu-panel",
  "display:none!important",
  "pointer-events:none!important",
]) {
  assert.ok(patch.includes(token), `Hide top chrome patch is missing ${token}`);
}

assert.ok(!patch.includes("#numeria-rebuilt-side-menu,"), "Legacy chrome hide patch must not hide the rebuilt side menu.");
assert.ok(!patch.includes("#numeria-rebuilt-menu-backdrop,"), "Legacy chrome hide patch must not hide the rebuilt menu backdrop.");
assert.ok(patch.includes("rebuilt menu remains visible"), "Patch must document that the rebuilt menu remains visible.");

console.log("Legacy mobile top chrome hide contract verified: old chrome hidden, rebuilt menu remains visible.");
