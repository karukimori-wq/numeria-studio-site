import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AI_REPORT_GENERATION_CONTRACT,
  createStudioAiReportRequest,
  evaluateAiReportPlanGate,
  hasForbiddenAiReportPayload,
  normalizeStructuredReportDraft,
  validateStructuredReportDraft,
  validateStudioAiReportRequest,
} from "../src/ai-report-generation-contract.js";

assert.equal(AI_REPORT_GENERATION_CONTRACT.contractVersion, "studio-ai-report.v1");
assert.equal(AI_REPORT_GENERATION_CONTRACT.endpointPath, "/api/v1/generations/report");
assert.equal(AI_REPORT_GENERATION_CONTRACT.featureKey, "numeria.report.ai_generate");
assert.match(AI_REPORT_GENERATION_CONTRACT.requestPolicy, /single-apc-generation-request/);
assert.match(AI_REPORT_GENERATION_CONTRACT.draftLifecycle, /ai-draft/i);

assert.equal(hasForbiddenAiReportPayload({ paymentStatus: "paid" }), true);
assert.equal(hasForbiddenAiReportPayload({ stripeCustomer: {} }), true);
assert.equal(hasForbiddenAiReportPayload({ fullPrompt: "secret" }), true);
assert.equal(hasForbiddenAiReportPayload({ consultationRequest: { question: "仕事" } }), false);

const request = createStudioAiReportRequest({
  scope: { workspaceId: "ws_1", userId: "user_1", planId: "pro" },
  appVersion: "test",
  body: {
    sessionId: "sess_1",
    locale: "ja-JP",
    characterSnapshot: {
      characterId: "char_1",
      type: "custom",
      characterVersion: "3",
      name: "やさしい鑑定師",
      personality: "穏やか",
      speakingStyle: "やさしく寄り添う",
      writingRules: ["断定しすぎない"],
      customInstruction: "相談者の背中を押す",
    },
    consultationRequest: { question: "転職について知りたい", theme: "仕事" },
    divination: { methods: [{ methodKey: "tarot", displayName: "タロット" }] },
    confirmedResult: {
      summary: "カード結果はNumeriaで確定済み。",
      results: [{
        methodKey: "tarot",
        resultKey: "three_card_spread",
        data: {
          cards: [
            { cardKey: "major_00_fool", orientation: "upright", spreadPosition: "past" },
          ],
        },
      }],
    },
    outputFormat: {
      formatKey: "standard-report",
      length: "standard",
      sections: [{ key: "overview", heading: "全体の流れ" }],
    },
  },
});

assert.equal(request.contractVersion, "studio-ai-report.v1");
assert.equal(request.appName, "numeria-studio");
assert.equal(request.featureKey, "numeria.report.ai_generate");
assert.equal(request.characterSnapshot.characterVersion, "3");
assert.equal(request.confirmedResult.results[0].data.cards[0].orientation, "upright");
assert.equal(validateStudioAiReportRequest(request).ok, true);
assert.equal(evaluateAiReportPlanGate(request).allowed, true);
assert.equal(evaluateAiReportPlanGate({ ...request, planId: "free" }).allowed, false);

const draft = normalizeStructuredReportDraft({
  status: "success",
  generationId: "gen_1",
  correlationId: request.correlationId,
  draftType: "ai_draft",
  title: "鑑定書",
  lead: "まずは深呼吸しましょう。",
  sections: [{ key: "overview", heading: "全体の流れ", body: "変化の前触れです。" }],
  closing: "応援しています。",
  promptKey: "numeria.report.standard",
  promptVersion: "1",
  knowledgeVersions: [{ knowledgeKey: "tarot", version: "1" }],
  model: { provider: "openai", modelId: "gpt" },
  generatedAt: new Date().toISOString(),
  usage: { inputTokensApprox: 1, outputTokensApprox: 1, usageRecorded: true },
  warnings: [],
}, request);

assert.equal(draft.draftType, "ai_draft");
assert.equal(draft.formalReport, false);
assert.equal(draft.reportSnapshotSaved, false);
assert.equal(draft.eventToEmitOnFinalize, "studio.report.generated.v1");
assert.equal(draft.characterSnapshot.characterId, "char_1");
assert.equal(validateStructuredReportDraft(draft).ok, true);

const entry = readFileSync("src/ai-worker-entry.js", "utf8");
assert.match(entry, /\/ai-report\/status/);
assert.match(entry, /\/api\/ai\/reports\/generate/);
assert.match(entry, /requestAiReportGeneration/);
assert.match(entry, /formalReportCreated: false/);
assert.match(entry, /eventEmitted: false/);
assert.doesNotMatch(entry, /recordAiUsageEvent/);

console.log("Numeria AI report generation contract verified: structured Numeria input, APC single-request generation, AI Draft lifecycle, and no formal report auto-finalization.");
