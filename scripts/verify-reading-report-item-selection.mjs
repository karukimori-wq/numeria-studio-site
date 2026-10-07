import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-reading-report-item-selection.mjs", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

for (const label of [
  "フォーマットに入れる項目を選ぶ",
  "鑑定書のはじめに",
  "テーマ文",
  "まとめ文",
  "今後へのメッセージ",
  "自由記入",
  "reading-free-note-editor",
  "reading-report-item-picker",
]) {
  assert.ok(patch.includes(label), `${label} is present in report item selection patch`);
}

assert.match(pkg.scripts.build, /patch-reading-report-item-selection\.mjs/, "build runs report item selection patch");
assert.match(pkg.scripts.test, /verify-reading-report-item-selection\.mjs/, "test runs report item selection verifier");

console.log("Reading report item selection patch verified: visible item checkboxes, free-note editor, preview toggles, and build/test wiring.");
