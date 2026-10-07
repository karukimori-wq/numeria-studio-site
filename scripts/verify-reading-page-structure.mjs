import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-reading-page-structure.mjs", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

for (const label of [
  "相談者を選ぶ",
  "相談内容",
  "鑑定書選択",
  "鑑定計算結果の確認",
  "鑑定結果入力",
  "AI 鑑定補助",
  "特定の相手との相談内容",
  "プレビューでも文章を直接編集できます",
]) {
  assert.ok(patch.includes(label), `${label} is present in reading page structure patch`);
}

for (const selector of [
  ".reading-flow-guide-unified",
  ".reading-unified-step-head",
  ".reading-step-collapsed",
  ".reading-report-items-summary",
  ".tarot-reading-workspace",
  ".deep-reading-editor",
  ".report-composer-materials",
  ".design-section",
]) {
  assert.ok(patch.includes(selector), `${selector} is covered by reading page structure patch`);
}

assert.match(pkg.scripts.build, /patch-reading-page-structure\.mjs/, "build runs reading page structure patch");
assert.match(pkg.scripts.test, /verify-reading-page-structure\.mjs/, "test runs reading page structure verifier");

console.log("Reading page structure patch verified: common 5-step labels, collapse chrome, numerology/tarot targets, AI assist label, and build/test wiring.");
