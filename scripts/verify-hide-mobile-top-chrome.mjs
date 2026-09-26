import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const build = pkg.scripts?.build || "";
const patch = readFileSync("scripts/patch-hide-mobile-top-chrome.mjs", "utf8");

assert.match(build, /patch-hide-mobile-top-chrome\.mjs/, "Production build must hide mobile top chrome during menu rebuild isolation.");
for (const token of [
  "NumeriaHideMobileTopChrome.v1",
  ".mobile-appbar",
  "#numeria-mobile-appbar",
  ".mobile-menu-panel",
  "#numeria-rebuilt-side-menu",
  "display:none!important",
  "pointer-events:none!important",
]) {
  assert.ok(patch.includes(token), `Hide top chrome patch is missing ${token}`);
}

console.log("Mobile top chrome hide contract verified.");
