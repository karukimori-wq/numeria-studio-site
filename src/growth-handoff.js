const HANDOFF_PATH = "/app/growth/start";
const HANDOFF_INTENT = "start_appraisal_session";
const REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

const FORBIDDEN_QUERY_KEYS = [
  "paymentStatus",
  "paymentDetails",
  "salesAmount",
  "salesDetails",
  "stripe",
  "stripePaymentIntentId",
  "stripeCheckoutSessionId",
  "reportBody",
  "reportText",
  "fullReportText",
  "appraisalText",
  "fullAppraisalText",
  "conversationText",
  "fullConversationText",
  "customerMaster",
  "fullCustomerMaster",
  "apiKey",
  "secret",
  "secretPrompt",
];

function safeReference(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || !REFERENCE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function parseGrowthEngineHandoff(input) {
  let url;
  try {
    url = input instanceof URL
      ? input
      : new URL(typeof input === "string" ? input : input?.href || "", "https://numeria-studio.com");
  } catch {
    return { status: "rejected", reason: "invalid-url" };
  }

  if (url.pathname !== HANDOFF_PATH) return null;

  if (FORBIDDEN_QUERY_KEYS.some((key) => url.searchParams.has(key))) {
    return { status: "rejected", reason: "forbidden-query-field" };
  }

  const intent = url.searchParams.get("intent");
  if (intent !== HANDOFF_INTENT) {
    return { status: "rejected", reason: "unsupported-intent" };
  }

  const reservationId = safeReference(url.searchParams.get("reservationId"));
  const customerId = safeReference(url.searchParams.get("customerId"));
  if (!reservationId || !customerId) {
    return { status: "rejected", reason: "missing-reference" };
  }

  return {
    status: "accepted",
    sourceApp: "growth-engine",
    intent: HANDOFF_INTENT,
    requestedWorkspaceId: safeReference(url.searchParams.get("workspaceId")),
    requestedUserId: safeReference(url.searchParams.get("userId")),
    reservationId,
    customerId,
    traceId: safeReference(url.searchParams.get("traceId")),
    correlationId: safeReference(url.searchParams.get("correlationId")),
  };
}

export function toGrowthEngineExternalReferences(handoff) {
  if (!handoff || handoff.status !== "accepted") return null;
  return {
    sourceApp: "growth-engine",
    intent: HANDOFF_INTENT,
    reservationId: handoff.reservationId,
    customerId: handoff.customerId,
    traceId: handoff.traceId || null,
    correlationId: handoff.correlationId || null,
  };
}

export function normalizeGrowthEngineExternalReferences(input = {}) {
  const candidate = input?.externalReferences && typeof input.externalReferences === "object"
    ? input.externalReferences
    : input;

  if (candidate.sourceApp && candidate.sourceApp !== "growth-engine") return null;
  if (candidate.intent && candidate.intent !== HANDOFF_INTENT) return null;

  const reservationId = safeReference(candidate.reservationId);
  const customerId = safeReference(candidate.customerId);
  if (!reservationId || !customerId) return null;

  return {
    sourceApp: "growth-engine",
    intent: HANDOFF_INTENT,
    reservationId,
    customerId,
    traceId: safeReference(candidate.traceId),
    correlationId: safeReference(candidate.correlationId),
  };
}

export const growthEngineHandoffContract = Object.freeze({
  path: HANDOFF_PATH,
  intent: HANDOFF_INTENT,
  authorizationSource: "clerk-authenticated-numeria-scope",
  queryIdentityTrustedForAuthorization: false,
  forbiddenQueryKeys: [...FORBIDDEN_QUERY_KEYS],
});
