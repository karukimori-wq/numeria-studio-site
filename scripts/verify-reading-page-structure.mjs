import vm from "node:vm";
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

// Execute the injected runtime against a minimal DOM mutation queue.
function check(source){let queue=[],calls=0,observer,markup='AI補助';const summary={get innerHTML(){return markup},set innerHTML(v){markup=v;queue.push(1)},setAttribute(){}};const ai={classList:{add(){}},querySelector(s){return s==='summary'?summary:null}};const panel={dataset:{readingUnifiedReady:'1'},querySelectorAll(s){return s==='.ai-assist-editor'?[ai]:[]}};const root={querySelector(s){return s==='.editor-panel'?panel:null}};const document={readyState:'complete',body:{},querySelector(s){return s.includes(':not(')?root:null}};const raw=source.match(/const runtime = `([\s\S]*?)`;/)[1];const html=Function('marker','return `'+raw+'`')('test');vm.runInNewContext(html.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,''),{document,MutationObserver:class{constructor(fn){observer=fn}observe(){}},setInterval(){}});while(queue.length&&calls<100){queue=[];calls++;observer()}return {calls,pending:queue.length}}
const observerResult = check(patch);
assert.equal(observerResult.pending, 0, "AI assist normalization must settle instead of starving input and timers");
assert.ok(observerResult.calls <= 1, "Unchanged AI assist markup must not trigger further mutations");
console.log("AI assist observer settles after one callback.");
