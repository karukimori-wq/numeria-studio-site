const APP_ID = "numeria-studio";
const APP_VERSION = "0.3.13-ai-assist-gateway";
const BASIC_AI_CAPABILITY = "studio.report.ai_assist";
const DEFAULT_APC_BASE_URL = "https://ai-platform-core.karukimori.workers.dev";

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeCoreNumbers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = [
    "lifePath",
    "birthdayNumber",
    "attitude",
    "destiny",
    "soul",
    "personality",
    "maturity",
    "personalYear",
  ];
  const result = {};
  for (const key of allowed) {
    const number = Number(value[key]);
    if (Number.isFinite(number)) result[key] = number;
  }
  return result;
}

export function sanitizeAiAssistInput(body = {}) {
  return {
    consultationTheme: cleanText(body.consultationTheme, 1200),
    divinationType: cleanText(body.divinationType || "numerology", 80) || "numerology",
    coreNumbers: normalizeCoreNumbers(body.coreNumbers),
  };
}

export function hasForbiddenAiAssistPayload(body = {}) {
  const forbidden = [
    "name",
    "clientName",
    "birthName",
    "birthday",
    "birthDate",
    "email",
    "fullAppraisalText",
    "fullConsultationText",
    "fullReportBody",
    "paymentDetails",
    "paymentStatus",
    "salesAmount",
    "apiKey",
    "secret",
  ];
  return forbidden.some((key) => Object.prototype.hasOwnProperty.call(body || {}, key));
}

export function aiPlatformCoreBaseUrl(env = {}) {
  return String(
    env.AI_PLATFORM_CORE_BASE_URL
      || env.AI_PLATFORM_CORE_URL
      || env.NUMERIA_AI_PLATFORM_CORE_URL
      || DEFAULT_APC_BASE_URL,
  ).replace(/\/$/, "");
}

function readGatewayOutput(body = {}) {
  const candidates = [
    body.output,
    body.value?.output,
    body.data?.output,
    body.result?.output,
  ];
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null);
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

export async function runBasicAiAssist({ env = {}, workspaceId, userId, planId, input, correlationId }) {
  const activityId = `num_ai_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const traceId = correlationId || `trace_${activityId}`;
  const gatewayBody = {
    auth: {
      clientId: APP_ID,
      permissions: [BASIC_AI_CAPABILITY],
    },
    activity: {
      client: APP_ID,
      workspaceId,
      userId,
      ownerUserId: userId,
      capability: BASIC_AI_CAPABILITY,
      workflow: input.divinationType,
      goal: "Create a concise report-writing draft from non-sensitive calculated divination data.",
      context: {
        app: "Numeria Studio",
        divinationType: input.divinationType,
        dataPolicy: "no-name-no-birth-date-no-full-report",
      },
      input: {
        coreNumbers: input.coreNumbers,
        consultationTheme: input.consultationTheme,
      },
    },
    messages: [
      {
        role: "system",
        content: "You support a professional fortune teller. Draft gentle Japanese report text using only the supplied calculated values and consultation theme. Do not invent personal facts or deterministic predictions.",
      },
      {
        role: "user",
        content: "Create a concise draft that the practitioner can review and edit before using it in the report.",
      },
    ],
  };

  const response = await fetch(`${aiPlatformCoreBaseUrl(env)}/v1/gateway/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Source-App": APP_ID,
      "X-Client-Id": APP_ID,
      "X-App-Version": APP_VERSION,
      "X-Workspace-Id": workspaceId,
      "X-User-Id": userId,
      "X-Plan-Id": planId,
      "X-Feature-Key": BASIC_AI_CAPABILITY,
      "X-Activity-Id": activityId,
      "X-Trace-Id": traceId,
      "X-Correlation-Id": correlationId || activityId,
    },
    body: JSON.stringify(gatewayBody),
  });
  const gateway = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    activityId,
    capability: BASIC_AI_CAPABILITY,
    output: readGatewayOutput(gateway),
    gateway,
  };
}

export const AI_ASSIST_CONTRACT = Object.freeze({
  appId: APP_ID,
  appVersion: APP_VERSION,
  capability: BASIC_AI_CAPABILITY,
  plans: ["free", "pro"],
  businessAvailable: false,
  dataPolicy: "calculated-values-and-consultation-theme-only",
});
