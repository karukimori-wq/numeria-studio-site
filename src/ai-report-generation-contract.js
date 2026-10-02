const APP_NAME = "numeria-studio";
const CONTRACT_VERSION = "studio-ai-report.v1";
const FEATURE_KEY = "numeria.report.ai_generate";
const ENDPOINT_PATH = "/api/v1/generations/report";

function text(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function generatedId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCharacterSnapshot(value = {}) {
  const characterId = text(value.characterId || value.id || "preset-gentle-reader", 120);
  const type = value.type === "custom" ? "custom" : "preset";
  const characterVersion = text(value.characterVersion || value.version || "1", 80);
  return {
    characterId,
    type,
    characterVersion,
    name: text(value.name || "Numeria Reader", 120),
    personality: text(value.personality, 1200),
    speakingStyle: text(value.speakingStyle, 1200),
    writingRules: asArray(value.writingRules).map((rule) => text(rule, 400)).filter(Boolean),
    customInstruction: text(value.customInstruction, 1600),
  };
}

function normalizeConsultationRequest(value = {}) {
  return {
    question: text(value.question || value.consultationTheme || value.theme, 2000),
    theme: text(value.theme, 240),
    backgroundSummary: text(value.backgroundSummary, 2000),
    appraisalClientSnapshotRef: text(value.appraisalClientSnapshotRef, 180),
    ...(value.appraisalClientSnapshot && typeof value.appraisalClientSnapshot === "object"
      ? { appraisalClientSnapshot: value.appraisalClientSnapshot }
      : {}),
  };
}

function normalizeDivination(value = {}) {
  const methods = asArray(value.methods).map((method) => ({
    methodKey: text(method.methodKey || method.id || method.key, 80),
    displayName: text(method.displayName || method.name, 120),
    version: text(method.version, 80),
  })).filter((method) => method.methodKey && method.displayName);
  return { methods };
}

function normalizeConfirmedResult(value = {}) {
  return {
    summary: text(value.summary, 2400),
    results: asArray(value.results).map((result) => ({
      methodKey: text(result.methodKey, 80),
      resultKey: text(result.resultKey || result.key, 120),
      data: result.data && typeof result.data === "object" ? result.data : {},
      confirmedAt: text(result.confirmedAt, 80) || new Date().toISOString(),
    })).filter((result) => result.methodKey && result.resultKey),
  };
}

function normalizeOutputFormat(value = {}) {
  const sections = asArray(value.sections).map((section) => ({
    key: text(section.key, 80),
    heading: text(section.heading, 160),
    required: section.required !== false,
  })).filter((section) => section.key && section.heading);
  return {
    formatKey: text(value.formatKey || "standard-report", 120),
    tone: text(value.tone || "やさしく寄り添う", 200),
    length: ["short", "standard", "detailed"].includes(value.length) ? value.length : "standard",
    sections,
  };
}

export function hasForbiddenAiReportPayload(body = {}) {
  const forbiddenKeys = [
    "paymentDetails",
    "paymentStatus",
    "salesAmount",
    "stripeCustomer",
    "stripeSubscription",
    "apiKey",
    "secret",
    "fullPrompt",
    "growthCustomerMaster",
    "communicationHistory",
  ];
  return forbiddenKeys.some((key) => Object.prototype.hasOwnProperty.call(body || {}, key));
}

export function createStudioAiReportRequest({ scope, body = {}, appVersion }) {
  const characterSnapshot = normalizeCharacterSnapshot(body.characterSnapshot || body.character || {});
  const consultationRequest = normalizeConsultationRequest(body.consultationRequest || {});
  const divination = normalizeDivination(body.divination || {});
  const confirmedResult = normalizeConfirmedResult(body.confirmedResult || {});
  const outputFormat = normalizeOutputFormat(body.outputFormat || {});
  const correlationId = text(body.correlationId || generatedId("num_report_ai"), 160);

  return {
    contractVersion: CONTRACT_VERSION,
    appName: APP_NAME,
    appVersion,
    workspaceId: scope.workspaceId,
    userId: scope.userId,
    sessionId: text(body.sessionId, 160) || generatedId("session"),
    planId: scope.planId,
    featureKey: FEATURE_KEY,
    correlationId,
    locale: text(body.locale || "ja-JP", 20),
    characterSnapshot,
    consultationRequest,
    divination,
    confirmedResult,
    outputFormat,
  };
}

export function validateStudioAiReportRequest(request) {
  const missing = [];
  if (!request.consultationRequest.question) missing.push("consultationRequest.question");
  if (request.divination.methods.length === 0) missing.push("divination.methods");
  if (!request.confirmedResult.summary) missing.push("confirmedResult.summary");
  if (request.confirmedResult.results.length === 0) missing.push("confirmedResult.results");
  if (request.outputFormat.sections.length === 0) missing.push("outputFormat.sections");
  if (missing.length > 0) {
    return { ok: false, errorCode: "AI_REPORT_CONFIRMED_NUMERIA_INPUT_REQUIRED", missing };
  }
  return { ok: true, missing: [] };
}

export function evaluateAiReportPlanGate(request) {
  if (request.planId !== "pro" && request.characterSnapshot.type === "custom") {
    return {
      allowed: false,
      errorCode: "CUSTOM_CHARACTER_REQUIRES_PRO",
      message: "Custom Characterを使ったAI鑑定書生成はProで利用できます。",
    };
  }
  if (request.planId !== "pro" && request.outputFormat.length === "detailed") {
    return {
      allowed: false,
      errorCode: "DETAILED_AI_REPORT_REQUIRES_PRO",
      message: "詳細AI鑑定書はProで利用できます。",
    };
  }
  return { allowed: true };
}

export function normalizeStructuredReportDraft(responseBody = {}, requestPayload = {}) {
  const sections = asArray(responseBody.sections).map((section) => ({
    key: text(section.key, 80),
    heading: text(section.heading, 160),
    body: text(section.body, 6000),
    warnings: asArray(section.warnings).map((warning) => text(warning, 400)).filter(Boolean),
  })).filter((section) => section.key && section.heading && section.body);

  return {
    draftType: "ai_draft",
    formalReport: false,
    reportSnapshotSaved: false,
    eventToEmitOnFinalize: "studio.report.generated.v1",
    generationId: text(responseBody.generationId, 160),
    traceId: text(responseBody.traceId, 160),
    correlationId: text(responseBody.correlationId || requestPayload.correlationId, 160),
    title: text(responseBody.title, 240),
    lead: text(responseBody.lead, 4000),
    sections,
    closing: text(responseBody.closing, 4000),
    promptKey: text(responseBody.promptKey, 160),
    promptVersion: text(responseBody.promptVersion, 80),
    knowledgeVersions: asArray(responseBody.knowledgeVersions),
    model: responseBody.model && typeof responseBody.model === "object" ? responseBody.model : null,
    generatedAt: text(responseBody.generatedAt, 80) || new Date().toISOString(),
    usage: responseBody.usage && typeof responseBody.usage === "object" ? responseBody.usage : null,
    warnings: asArray(responseBody.warnings).map((warning) => text(warning, 400)).filter(Boolean),
    characterSnapshot: requestPayload.characterSnapshot,
    outputFormat: requestPayload.outputFormat,
  };
}

export function validateStructuredReportDraft(draft) {
  const missing = [];
  if (draft.draftType !== "ai_draft") missing.push("draftType");
  if (!draft.generationId) missing.push("generationId");
  if (!draft.title) missing.push("title");
  if (!draft.lead) missing.push("lead");
  if (draft.sections.length === 0) missing.push("sections");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, missing: [] };
}

export async function requestAiReportGeneration({ fetchAiPlatformCore, env, payload }) {
  const response = await fetchAiPlatformCore(env, ENDPOINT_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Source-App": APP_NAME,
      "X-Workspace-Id": payload.workspaceId,
      "X-User-Id": payload.userId,
      "X-Plan-Id": payload.planId,
      "X-Feature-Key": FEATURE_KEY,
      "X-Correlation-Id": payload.correlationId,
      "X-Contract-Version": CONTRACT_VERSION,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export const AI_REPORT_GENERATION_CONTRACT = Object.freeze({
  appName: APP_NAME,
  contractVersion: CONTRACT_VERSION,
  endpointPath: ENDPOINT_PATH,
  featureKey: FEATURE_KEY,
  requestPolicy: "single-apc-generation-request-no-separate-numeria-usage-or-activity",
  numeriaOwns: [
    "customer",
    "session",
    "consultationRequest",
    "divinationSelection",
    "confirmedDivinationResult",
    "character",
    "formalReport",
    "reportSnapshot",
    "pdf",
  ],
  apcMustNotOwn: [
    "divinationCalculation",
    "tarotDraw",
    "formalReport",
    "reportSnapshot",
    "pdf",
  ],
  draftLifecycle: "apc-response-is-ai-draft-until-fortune-teller-finalizes",
});
