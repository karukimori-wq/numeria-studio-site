import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AI_ASSIST_CONTRACT, hasForbiddenAiAssistPayload, sanitizeAiAssistInput } from "../src/ai-assist-proxy.js";

assert.equal(AI_ASSIST_CONTRACT.capability, "studio.report.ai_assist");
assert.deepEqual(AI_ASSIST_CONTRACT.plans, ["free", "pro"]);
assert.equal(AI_ASSIST_CONTRACT.businessAvailable, false);

assert.equal(hasForbiddenAiAssistPayload({ name: "A", coreNumbers: { lifePath: 7 } }), true);
assert.equal(hasForbiddenAiAssistPayload({ birthDate: "2000-01-01" }), true);
assert.equal(hasForbiddenAiAssistPayload({ fullReportBody: "secret" }), true);
assert.equal(hasForbiddenAiAssistPayload({ consultationTheme: "仕事", coreNumbers: { lifePath: 7 } }), false);

const sanitized = sanitizeAiAssistInput({
  consultationTheme: " 仕事の方向性 ",
  divinationType: "numerology",
  coreNumbers: { lifePath: "7", destiny: 3, ignored: 999 },
});
assert.equal(sanitized.consultationTheme, "仕事の方向性");
assert.equal(sanitized.coreNumbers.lifePath, 7);
assert.equal(sanitized.coreNumbers.destiny, 3);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized.coreNumbers, "ignored"), false);

const entry = readFileSync("src/ai-worker-entry.js", "utf8");
assert.match(entry, /incomingRequestVerified !== true/);
assert.match(entry, /\/api\/billing\/subscription/);
assert.match(entry, /AI_ASSIST_CONTRACT\.plans\.includes\(planId\)/);
assert.match(entry, /hasForbiddenAiAssistPayload\(body\)/);
assert.match(entry, /runBasicAiAssist/);
assert.doesNotMatch(entry, /body\.planId/);
assert.doesNotMatch(entry, /body\.userId/);

const proxy = readFileSync("src/ai-assist-proxy.js", "utf8");
for (const requiredHeader of [
  "X-Source-App",
  "X-App-Version",
  "X-Workspace-Id",
  "X-User-Id",
  "X-Plan-Id",
  "X-Feature-Key",
  "X-Activity-Id",
]) {
  assert.ok(proxy.includes(requiredHeader), `Missing APC gateway header: ${requiredHeader}`);
}
assert.match(proxy, /no-name-no-birth-date-no-full-report/);
assert.match(proxy, /\/v1\/gateway\/run/);

console.log("Numeria APC AI assist proxy contract verified: Clerk-authenticated scope, Worker-owned plan, Free/Pro capability, and no personal-data payload fields.");
