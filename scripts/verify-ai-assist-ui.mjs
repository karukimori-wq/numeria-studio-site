import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-ai-assist-ui.mjs", "utf8");
assert.match(patch, /window\.NumeriaAiAssistRun/);
assert.match(patch, /window\.NumeriaAuthenticatedFetch/);
assert.match(patch, /\/api\/ai\/assist/);
assert.match(patch, /AIで下書きを作成/);
assert.match(patch, /手動プロンプト/);
assert.match(patch, /氏名・出生名・生年月日は送信しません/);
assert.match(patch, /coreNumbers:\{lifePath:F\.lifePath/);
assert.doesNotMatch(patch, /clientName:/);
assert.doesNotMatch(patch, /birthName:/);
assert.doesNotMatch(patch, /birthday:M/);
assert.doesNotMatch(patch, /email:/);

console.log("Legacy AI assist UI contract verified: authenticated Worker proxy, calculated values + theme only, and manual fallback retained.");
