import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, isUnlimited, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";
import { growthEngineHandoffContract, normalizeGrowthEngineExternalReferences } from "./growth-handoff.js";

const APP_VERSION = "0.3.9-billing-read-only";
const PLAN_CONTRACT_VERSION = "free-pro-business-preparing.v1";
const ADMIN_CONTRACT_VERSION = "admin-mode-mvp.v1";
const AUTH_CONTRACT_VERSION = "clerk-server-auth-readiness.v1";
const BILLING_CONTRACT_VERSION = "growth-engine-stripe-subscription-readiness.v1";
const DOMAIN_CONTRACT_VERSION = "cloudflare-custom-domain-readiness.v1";
const AI_USAGE_CONTRACT_VERSION = "ai-platform-core-usage-events.v1";
const APC_CONTRACT_VERSION = "ai-platform-core-activity-forwarding.v1";
const REPORT_TEMPLATE_VERSION = "numeria-report-template.v1";
const FEEDBACK_HUB_CONTRACT_VERSION = "feedback-hub-free-pro-intake.v1";
const INTEGRATIONS_CONTRACT_VERSION = "numeria-free-pro-integrations-readiness.v1";

const runtimeStore = globalThis.__numeriaUsageStore || new Map();
globalThis.__numeriaUsageStore = runtimeStore;
const runtimeAiUsageEvents = globalThis.__numeriaAiUsageEvents || [];
globalThis.__numeriaAiUsageEvents = runtimeAiUsageEvents;
const runtimeFeedbackReceipts = globalThis.__numeriaFeedbackReceipts || [];
globalThis.__numeriaFeedbackReceipts = runtimeFeedbackReceipts;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function scopeKey(workspaceId, userId, month = getBillingMonth()) {
  return `${workspaceId || "ws_personal"}:${userId || "anonymous"}:${month}`;
}

function getScope(request, body = {}, auth = {}) {
  const url = new URL(request.url);
  return {
    workspaceId: body.workspaceId || request.headers.get("X-Workspace-Id") || url.searchParams.get("workspaceId") || "ws_personal",
    userId: auth.userId || body.userId || request.headers.get("X-User-Id") || url.searchParams.get("userId") || "anonymous",
  };
}

function getRecord(workspaceId, userId) {
  const billingMonth = getBillingMonth();
  const key = scopeKey(workspaceId, userId, billingMonth);
  const current = runtimeStore.get(key) || createDefaultRecord(billingMonth);
  runtimeStore.set(key, current);
  return current;
}

function createDefaultRecord(billingMonth = getBillingMonth()) {
  return {
    planId: PLAN_IDS.FREE,
    monthlyAppraisals: 0,
    appraisalClients: 0,
    appraisalClientProfiles: [],
    billingMonth,
    inProgressAppraisals: 0,
    activeDraft: null,
    completedAppraisalIds: [],
    completedAppraisals: [],
    reportExports: [],
  };
}

function getD1Binding(env = {}) {
  return env.NUMERIA_DB || env.DB || env.D1 || null;
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRecord(record = {}, billingMonth = getBillingMonth()) {
  const defaults = createDefaultRecord(billingMonth);
  return {
    ...defaults,
    ...record,
    planId: normalizePlanId(record.planId || defaults.planId),
    monthlyAppraisals: Number(record.monthlyAppraisals || 0),
    appraisalClients: Number(record.appraisalClients || 0),
    appraisalClientProfiles: Array.isArray(record.appraisalClientProfiles) ? record.appraisalClientProfiles : [],
    inProgressAppraisals: Number(record.inProgressAppraisals || 0),
    activeDraft: record.activeDraft || null,
    completedAppraisalIds: Array.isArray(record.completedAppraisalIds) ? record.completedAppraisalIds : [],
    completedAppraisals: Array.isArray(record.completedAppraisals) ? record.completedAppraisals : [],
    reportExports: Array.isArray(record.reportExports) ? record.reportExports : [],
  };
}

function recordFromD1Row(row, billingMonth = getBillingMonth()) {
  return normalizeRecord({
    planId: row.plan_id,
    monthlyAppraisals: row.monthly_appraisals,
    appraisalClients: row.appraisal_clients,
    appraisalClientProfiles: safeJsonParse(row.appraisal_client_profiles_json, []),
    billingMonth: row.billing_month || billingMonth,
    inProgressAppraisals: row.in_progress_appraisals,
    activeDraft: safeJsonParse(row.active_draft_json, null),
    completedAppraisalIds: safeJsonParse(row.completed_appraisal_ids_json, []),
    completedAppraisals: safeJsonParse(row.completed_appraisals_json, []),
    reportExports: safeJsonParse(row.report_exports_json, []),
  }, billingMonth);
}

async function loadUsageRecord(env = {}, workspaceId, userId) {
  const billingMonth = getBillingMonth();
  const key = scopeKey(workspaceId, userId, billingMonth);
  const d1 = getD1Binding(env);
  if (d1 && typeof d1.prepare === "function") {
    const row = await d1.prepare(
      `SELECT * FROM usage_records WHERE scope_key = ? LIMIT 1`
    ).bind(key).first();
    if (row) return recordFromD1Row(row, billingMonth);
  }
  return normalizeRecord(getRecord(workspaceId, userId), billingMonth);
}

async function saveUsageRecord(env = {}, workspaceId, userId, record) {
  const normalized = normalizeRecord(record, record.billingMonth || getBillingMonth());
  const key = scopeKey(workspaceId, userId, normalized.billingMonth);
  const d1 = getD1Binding(env);
  if (d1 && typeof d1.prepare === "function") {
    await d1.prepare(`
      INSERT INTO usage_records (
        scope_key, workspace_id, user_id, billing_month, plan_id,
        monthly_appraisals, appraisal_clients, in_progress_appraisals,
        appraisal_client_profiles_json, active_draft_json,
        completed_appraisal_ids_json, completed_appraisals_json, report_exports_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        plan_id = excluded.plan_id,
        monthly_appraisals = excluded.monthly_appraisals,
        appraisal_clients = excluded.appraisal_clients,
        in_progress_appraisals = excluded.in_progress_appraisals,
        appraisal_client_profiles_json = excluded.appraisal_client_profiles_json,
        active_draft_json = excluded.active_draft_json,
        completed_appraisal_ids_json = excluded.completed_appraisal_ids_json,
        completed_appraisals_json = excluded.completed_appraisals_json,
        report_exports_json = excluded.report_exports_json,
        updated_at = excluded.updated_at
    `).bind(
      key,
      workspaceId,
      userId,
      normalized.billingMonth,
      normalized.planId,
      normalized.monthlyAppraisals,
      normalized.appraisalClients,
      normalized.inProgressAppraisals,
      JSON.stringify(normalized.appraisalClientProfiles),
      normalized.activeDraft ? JSON.stringify(normalized.activeDraft) : null,
      JSON.stringify(normalized.completedAppraisalIds),
      JSON.stringify(normalized.completedAppraisals),
      JSON.stringify(normalized.reportExports),
      new Date().toISOString(),
    ).run();
  }
  runtimeStore.set(key, normalized);
  return normalized;
}

async function saveReportEvent(env = {}, workspaceId, userId, record, event) {
  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") return;
  const key = scopeKey(workspaceId, userId, record.billingMonth);
  await d1.prepare(`
    INSERT OR REPLACE INTO report_events (
      event_id, scope_key, workspace_id, user_id, appraisal_id,
      report_type, format, branding, event_name, generated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.exportId,
    key,
    workspaceId,
    userId,
    event.appraisalId || null,
    event.reportType,
    event.format,
    event.branding,
    "studio.report.generated.v1",
    event.generatedAt,
  ).run();
}

function getAiPlatformCoreUrl(env = {}) {
  return env.AI_PLATFORM_CORE_URL
    || env.NUMERIA_AI_PLATFORM_CORE_URL
    || globalThis.AI_PLATFORM_CORE_URL
    || globalThis.NUMERIA_AI_PLATFORM_CORE_URL
    || "";
}

function getAiUsageForwardingMode(env = {}) {
  const raw = env.AI_USAGE_FORWARDING_MODE
    || env.NUMERIA_AI_USAGE_FORWARDING_MODE
    || globalThis.AI_USAGE_FORWARDING_MODE
    || "observe";
  return String(raw).toLowerCase() === "send" ? "send" : "observe";
}

function createAiUsageEvent({
  eventName,
  workspaceId,
  userId,
  planId,
  featureKey,
  status = "success",
  correlationId,
}) {
  return {
    eventId: `aiu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventName,
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    workspaceId,
    userId,
    planId,
    featureKey,
    status,
    occurredAt: new Date().toISOString(),
    correlationId: correlationId || null,
    dataPolicy: "metadata-only-no-consultation-body",
  };
}

async function recordAiUsageEvent(env = {}, event) {
  runtimeAiUsageEvents.push(event);
  if (runtimeAiUsageEvents.length > 50) runtimeAiUsageEvents.shift();

  const endpoint = getAiPlatformCoreUrl(env);
  const forwardingMode = getAiUsageForwardingMode(env);
  if (!endpoint || forwardingMode !== "send") {
    return {
      forwarded: false,
      forwardingMode,
      reason: endpoint ? "observe-mode" : "endpoint-not-configured",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(event),
    });
    return {
      forwarded: response.ok,
      forwardingMode,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      forwarded: false,
      forwardingMode,
      reason: error?.message || "forwarding-failed",
    };
  }
}

function aiUsageStatusResponse(env = {}) {
  const endpoint = getAiPlatformCoreUrl(env);
  const forwardingMode = getAiUsageForwardingMode(env);
  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    aiUsageContractVersion: AI_USAGE_CONTRACT_VERSION,
    forwardingMode,
    endpointConfigured: Boolean(endpoint),
    willForwardInCurrentMode: Boolean(endpoint && forwardingMode === "send"),
    eventNames: [
      "studio.session.completed.v1",
      "studio.report.generated.v1",
    ],
    retainedEventCount: runtimeAiUsageEvents.length,
    recentEvents: runtimeAiUsageEvents.slice(-5),
    dataPolicy: "metadata-only-no-consultation-body",
    secretValuesReturned: false,
    message: endpoint
      ? "AI Platform Coreへの利用イベント送信を有効化できます。"
      : "AI Platform Core URL未設定のため、現在は送信せず契約とローカル記録のみです。",
  };
}

async function persistenceStatusResponse(env = {}) {
  const d1 = getD1Binding(env);
  const d1Ready = Boolean(d1 && typeof d1.prepare === "function");
  const requiredTables = ["usage_records", "report_events"];

  if (d1Ready) {
    try {
      const result = await d1.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)`
      ).bind(...requiredTables).all();
      const rows = result?.results || [];
      const existingTables = new Set(rows.map((row) => row.name));
      const missingTables = requiredTables.filter((table) => !existingTables.has(table));
      const tablesReady = missingTables.length === 0;

      return {
        status: tablesReady ? "success" : "warning",
        appId: "numeria-studio",
        storageDriver: tablesReady ? "durable-d1" : "d1-uninitialized",
        durable: tablesReady,
        ready: tablesReady,
        warning: tablesReady
          ? null
          : `D1 binding is configured, but required tables are missing: ${missingTables.join(", ")}`,
        requiredBinding: "NUMERIA_DB",
        requiredTables,
        missingTables,
        fallbackDriver: "runtime-memory",
        retainedDataClasses: [
          "usage",
          "activeDraft",
          "appraisalClientProfiles",
          "completedAppraisals",
          "reportExports",
        ],
      };
    } catch (error) {
      return {
        status: "warning",
        appId: "numeria-studio",
        storageDriver: "d1-unavailable",
        durable: false,
        ready: false,
        warning: `D1 binding is configured, but readiness could not be checked: ${error?.message || "unknown error"}`,
        requiredBinding: "NUMERIA_DB",
        requiredTables,
        fallbackDriver: "runtime-memory",
        retainedDataClasses: [
          "usage",
          "activeDraft",
          "appraisalClientProfiles",
          "completedAppraisals",
          "reportExports",
        ],
      };
    }
  }

  return {
    status: "success",
    appId: "numeria-studio",
    storageDriver: "runtime-memory",
    durable: false,
    ready: true,
    warning: "D1 binding is not configured. Usage, drafts, completed appraisals, and report events are stored in runtime memory for this MVP.",
    requiredBinding: "NUMERIA_DB",
    requiredTables,
    missingTables: [],
    fallbackDriver: "runtime-memory",
    retainedDataClasses: [
      "usage",
      "activeDraft",
      "appraisalClientProfiles",
      "completedAppraisals",
      "reportExports",
    ],
  };
}

async function readJson(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function usageResponse(record) {
  return createUsageSnapshot(record);
}

function getPlanConfigForPlan(planId) {
  return PLAN_CONFIG[normalizePlanId(planId)] || PLAN_CONFIG.free;
}

function getApcActivitiesUrl(env = {}) {
  const directUrl = env.APC_ACTIVITIES_URL || env.VITE_APC_ACTIVITIES_URL || "";
  if (directUrl) return String(directUrl);
  const baseUrl = env.AI_PLATFORM_CORE_BASE_URL || env.VITE_AI_PLATFORM_CORE_BASE_URL || "";
  if (!baseUrl) return "";
  return `${String(baseUrl).replace(/\/$/, "")}/api/activities`;
}

function getApcToken(env = {}) {
  return env.APC_API_TOKEN || env.AI_PLATFORM_CORE_API_TOKEN || "";
}

function createCorrelationId(prefix = "num") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function apcStatusResponse(env = {}) {
  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    apcContractVersion: APC_CONTRACT_VERSION,
    configured: Boolean(getApcActivitiesUrl(env)),
    endpointConfigured: Boolean(getApcActivitiesUrl(env)),
    tokenConfigured: Boolean(getApcToken(env)),
    activityEndpoint: getApcActivitiesUrl(env) ? "/api/activities" : null,
    forwardedEvents: [
      "studio.session.started.v1",
      "studio.session.completed.v1",
      "studio.report.generated.v1",
    ],
    failurePolicy: "non_blocking",
    secretValuesReturned: false,
  };
}

function getBillingSourceUrl(env = {}) {
  return env.GROWTH_ENGINE_BILLING_STATUS_URL
    || env.STRIPE_SUBSCRIPTION_STATUS_URL
    || env.VITE_GROWTH_ENGINE_BILLING_STATUS_URL
    || "";
}

function getBillingSourceToken(env = {}) {
  return env.GROWTH_ENGINE_API_TOKEN
    || env.STRIPE_API_TOKEN
    || env.BILLING_STATUS_API_TOKEN
    || "";
}

function getBillingFetchTimeoutMs(env = {}) {
  const value = Number(env.BILLING_STATUS_TIMEOUT_MS || 1500);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 5000) : 1500;
}

function isMvpPlanSwitchingEnabled(env = {}) {
  return !getBillingSourceUrl(env) || env.NUMERIA_ENABLE_MVP_PLAN_SWITCHING === "1";
}

function billingStatusResponse(env = {}) {
  const sourceUrl = getBillingSourceUrl(env);
  const provider = env.GROWTH_ENGINE_BILLING_STATUS_URL || env.VITE_GROWTH_ENGINE_BILLING_STATUS_URL
    ? "growth-engine"
    : env.STRIPE_SUBSCRIPTION_STATUS_URL
      ? "stripe"
      : "numeria-worker-mvp";

  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    billingContractVersion: BILLING_CONTRACT_VERSION,
    configured: Boolean(sourceUrl),
    provider,
    subscriptionSource: sourceUrl ? "external-readiness" : "numeria-worker-mvp",
    sourceOfTruth: sourceUrl ? provider : "pending-external-billing",
    tokenConfigured: Boolean(getBillingSourceToken(env)),
    timeoutMs: getBillingFetchTimeoutMs(env),
    mvpPlanSwitchingEnabled: isMvpPlanSwitchingEnabled(env),
    supportedPlans: ["free", "pro"],
    businessPurchasable: false,
    failurePolicy: "fallback_to_mvp_subscription",
    secretValuesReturned: false,
    message: sourceUrl
      ? "外部の契約状態を読み取る準備ができています。Numeria内のMVPプラン切替は停止します。"
      : "現在はNumeria Worker内のMVP契約状態を表示しています。",
  };
}

function growthEngineHandoffStatusResponse() {
  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    contractVersion: "growth-engine-reservation-handoff.v1",
    sourceApp: "growth-engine",
    statusEndpoint: "/growth-handoff/status",
    routePath: growthEngineHandoffContract.path,
    acceptedIntent: growthEngineHandoffContract.intent,
    receiverReady: true,
    businessPurchasable: false,
    businessFeatureEnabled: false,
    authorizationSource: growthEngineHandoffContract.authorizationSource,
    queryIdentityTrustedForAuthorization: growthEngineHandoffContract.queryIdentityTrustedForAuthorization,
    acceptedReferenceFields: [
      "reservationId",
      "customerId",
      "traceId",
      "correlationId",
    ],
    forbiddenQueryKeys: growthEngineHandoffContract.forbiddenQueryKeys,
    externalReferencesOnly: true,
    sourceOfTruth: "Growth Engine owns customer, reservation, payment, and sales records. Numeria stores only safe external reference IDs on sessions and report snapshots.",
    secretValuesReturned: false,
    message: "Growth Engineの予約参照を受け取れます。Business本体、支払い、売上、顧客正本はNumeriaに取り込みません。",
  };
}

function getFeedbackHubSubmitUrl(env = {}) {
  const directUrl = env.FEEDBACK_HUB_SUBMIT_URL || env.VITE_FEEDBACK_HUB_SUBMIT_URL || "";
  if (directUrl) return String(directUrl);
  const baseUrl = env.FEEDBACK_HUB_BASE_URL || env.VITE_FEEDBACK_HUB_BASE_URL || "";
  if (!baseUrl) return "";
  return `${String(baseUrl).replace(/\/$/, "")}/api/embed/feedback`;
}

function getFeedbackHubToken(env = {}) {
  return env.FEEDBACK_HUB_API_TOKEN
    || env.FEEDBACK_HUB_SUBMIT_TOKEN
    || env.VITE_FEEDBACK_HUB_SUBMIT_TOKEN
    || "";
}

function feedbackHubStatusResponse(env = {}) {
  const submitUrl = getFeedbackHubSubmitUrl(env);
  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    feedbackHubContractVersion: FEEDBACK_HUB_CONTRACT_VERSION,
    statusEndpoint: "/feedback-hub/status",
    intakeEndpoint: "/api/feedback/submit",
    configured: Boolean(submitUrl),
    endpointConfigured: Boolean(submitUrl),
    provider: "feedback-hub",
    sourceApp: "numeria-studio",
    allowedPlans: ["free", "pro"],
    businessRequired: false,
    businessPurchasable: false,
    billingBlocked: false,
    failurePolicy: "non_blocking_local_ack",
    tokenConfigured: Boolean(getFeedbackHubToken(env)),
    payloadFields: [
      "sourceApp",
      "appVersion",
      "planId",
      "workspaceId",
      "userId",
      "currentScreen",
      "category",
      "message",
      "occurredAt",
      "correlationId",
    ],
    forbiddenPayloadFields: [
      "secret",
      "apiKey",
      "fullPrompt",
      "paymentDetails",
      "customerMaster",
      "conversationText",
      "reportBody",
    ],
    secretValuesReturned: false,
    retainedReceiptCount: runtimeFeedbackReceipts.length,
    recentReceipts: runtimeFeedbackReceipts.slice(-5),
    message: submitUrl
      ? "Feedback Hubへ問い合わせを転送できます。"
      : "現在はNumeria Workerで問い合わせを受理し、外部転送は未接続です。",
  };
}

function safeFeedbackText(value, maxLength = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeFeedbackCategory(value) {
  const normalized = safeFeedbackText(value, 64).replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return normalized || "improvement_request";
}

function createFeedbackPayload(body = {}, scope = {}) {
  const correlationId = safeFeedbackText(body.correlationId, 96) || createCorrelationId("feedback");
  return {
    sourceApp: "numeria-studio",
    appId: "numeria-studio",
    appName: "Numeria Studio",
    appVersion: APP_VERSION,
    planId: normalizePlanId(body.planId || PLAN_IDS.FREE),
    workspaceId: safeFeedbackText(scope.workspaceId || body.workspaceId || "ws_personal", 120),
    userId: safeFeedbackText(scope.userId || body.userId || "anonymous", 120),
    currentScreen: safeFeedbackText(body.currentScreen || body.screenName || "unknown", 120),
    route: safeFeedbackText(body.route || "", 160),
    category: safeFeedbackCategory(body.category),
    device: safeFeedbackText(body.device || "", 80),
    occurredAt: Number.isNaN(Date.parse(body.occurredAt)) ? new Date().toISOString() : new Date(body.occurredAt).toISOString(),
    correlationId,
    message: safeFeedbackText(body.message || body.initialMessage || body.body || body.description, 2000),
  };
}

async function forwardFeedbackHub(env = {}, payload = {}) {
  const submitUrl = getFeedbackHubSubmitUrl(env);
  if (!submitUrl) {
    return { status: "skipped", forwarded: false, reason: "FEEDBACK_HUB_NOT_CONFIGURED" };
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getFeedbackHubToken(env);
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(2000)
        : undefined,
    });
    return {
      status: response.ok ? "success" : "fallback",
      forwarded: response.ok,
      reason: response.ok ? "feedback_forwarded" : "FEEDBACK_HUB_HTTP_ERROR",
      upstreamStatus: response.status,
    };
  } catch (error) {
    return {
      status: "fallback",
      forwarded: false,
      reason: "FEEDBACK_HUB_FETCH_FAILED",
      message: error?.message || "Feedback Hub could not be reached.",
    };
  }
}

async function feedbackSubmitResponse(env = {}, body = {}, scope = {}) {
  const payload = createFeedbackPayload(body, scope);
  const delivery = await forwardFeedbackHub(env, payload);
  const receipt = {
    correlationId: payload.correlationId,
    planId: payload.planId,
    category: payload.category,
    currentScreen: payload.currentScreen,
    receivedAt: new Date().toISOString(),
    forwarded: delivery.forwarded,
    forwardingStatus: delivery.status,
  };
  runtimeFeedbackReceipts.push(receipt);
  if (runtimeFeedbackReceipts.length > 50) runtimeFeedbackReceipts.shift();

  return {
    status: "success",
    appId: "numeria-studio",
    feedbackHubContractVersion: FEEDBACK_HUB_CONTRACT_VERSION,
    accepted: true,
    forwarding: delivery,
    receipt,
    allowedPlans: ["free", "pro"],
    businessRequired: false,
    billingBlocked: false,
    secretValuesReturned: false,
    message: delivery.forwarded
      ? "Feedback Hubへ送信しました。"
      : "問い合わせを受理しました。外部転送が未接続または一時失敗しても、鑑定フローは止めません。",
  };
}

async function integrationsStatusResponse(request = new Request("https://numeria-studio-site.karukimori.workers.dev/integrations/status"), env = {}) {
  const auth = await authStatusResponse(new Request("https://local.test/integrations/status"), env);
  const domain = domainStatusResponse(request, env);
  const billing = billingStatusResponse(env);
  const growthEngineHandoff = growthEngineHandoffStatusResponse();
  const feedbackHub = feedbackHubStatusResponse(env);
  const aiUsage = aiUsageStatusResponse(env);
  const aiPlatformCore = apcStatusResponse(env);
  const domainHost = String(domain.currentHost || "").split(":")[0];
  const isLocalDomainCheck = ["local.test", "localhost", "127.0.0.1"].includes(domainHost);
  const domainReadyForFreePro = domain.routeReady || isLocalDomainCheck;
  const items = [
    {
      key: "auth",
      appName: "Clerk",
      role: "login-and-session",
      statusEndpoint: "/auth/status",
      configured: auth.clientAuthReady,
      readyForFreePro: auth.enforcementMode === "observe" || auth.enforceModeReady,
      releaseBlocking: false,
      fallback: auth.enforcementMode === "observe" ? "observe-mode" : "none",
    },
    {
      key: "growthEngineBilling",
      appName: "Growth Engine / Stripe",
      role: "subscription-source",
      statusEndpoint: "/billing/status",
      configured: billing.configured,
      readyForFreePro: true,
      releaseBlocking: false,
      fallback: billing.failurePolicy,
    },
    {
      key: "growthEngineHandoff",
      appName: "Growth Engine",
      role: "reservation-handoff",
      statusEndpoint: "/growth-handoff/status",
      configured: growthEngineHandoff.receiverReady,
      readyForFreePro: growthEngineHandoff.receiverReady,
      releaseBlocking: false,
      fallback: "external-references-only",
    },
    {
      key: "feedbackHub",
      appName: "Feedback Hub",
      role: "question-improvement-intake",
      statusEndpoint: "/feedback-hub/status",
      configured: feedbackHub.configured,
      readyForFreePro: true,
      releaseBlocking: false,
      fallback: feedbackHub.failurePolicy,
    },
    {
      key: "aiPlatformCoreUsage",
      appName: "AI Platform Core",
      role: "usage-events",
      statusEndpoint: "/ai-usage/status",
      configured: aiUsage.endpointConfigured,
      readyForFreePro: true,
      releaseBlocking: false,
      fallback: aiUsage.forwardingMode === "send" ? "send-mode" : "observe-mode-local-record",
    },
    {
      key: "aiPlatformCoreActivity",
      appName: "AI Platform Core",
      role: "activity-forwarding",
      statusEndpoint: "/apc/status",
      configured: aiPlatformCore.configured,
      readyForFreePro: true,
      releaseBlocking: false,
      fallback: aiPlatformCore.failurePolicy,
    },
    {
      key: "domain",
      appName: "Cloudflare",
      role: "worker-route-and-custom-domain",
      statusEndpoint: "/domain/status",
      configured: domain.routeReady,
      readyForFreePro: domainReadyForFreePro,
      releaseBlocking: !domainReadyForFreePro,
      fallback: domain.workerHostReady ? "worker-host" : "none",
    },
  ];
  const blockingItems = items.filter((item) => item.releaseBlocking || !item.readyForFreePro);

  return {
    status: blockingItems.length === 0 ? "success" : "warning",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    integrationsContractVersion: INTEGRATIONS_CONTRACT_VERSION,
    releaseScope: "free-pro",
    statusEndpoint: "/integrations/status",
    overallReadyForFreePro: blockingItems.length === 0,
    blockingItems: blockingItems.map((item) => item.key),
    readinessItems: items,
    endpoints: {
      auth: "/auth/status",
      domain: "/domain/status",
      billing: "/billing/status",
      growthEngineHandoff: "/growth-handoff/status",
      feedbackHub: "/feedback-hub/status",
      aiUsage: "/ai-usage/status",
      aiPlatformCore: "/apc/status",
    },
    requiredRuntimeConfig: [
      "VITE_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY",
      "CLERK_JWKS_URL before AUTH_ENFORCEMENT_MODE=enforce",
      "GROWTH_ENGINE_BILLING_STATUS_URL or STRIPE_SUBSCRIPTION_STATUS_URL when external subscription sync is enabled",
      "FEEDBACK_HUB_BASE_URL or FEEDBACK_HUB_SUBMIT_URL when external feedback forwarding is enabled",
      "AI_PLATFORM_CORE_BASE_URL, APC_ACTIVITIES_URL, or AI_PLATFORM_CORE_URL when APC forwarding is enabled",
    ],
    dataBoundary: {
      numeriaOwns: [
        "Session",
        "ReportSnapshot",
        "CalculationResult",
        "AppraisalClientSnapshot",
      ],
      externalOwns: [
        "Customer",
        "Reservation",
        "Payment",
        "Sales",
        "AIActivity",
        "AIUsage",
        "FeedbackAnalysis",
      ],
    },
    secretValuesReturned: false,
  };
}

function normalizeBillingPayload(payload = {}) {
  const subscription = payload.subscription || payload.billing || payload;
  const planId = normalizePlanId(
    subscription.planId
      || subscription.currentPlan
      || subscription.currentPlanId
      || payload.planId
  );

  return {
    planId,
    billingStatus: subscription.billingStatus
      || subscription.status
      || (planId === PLAN_IDS.FREE ? "free" : "active"),
    currentPeriod: subscription.currentPeriod
      || subscription.billingMonth
      || payload.currentPeriod
      || getBillingMonth(),
    source: subscription.source || payload.source || "external-billing",
  };
}

async function fetchExternalBillingSubscription(env = {}, workspaceId = "ws_personal", userId = "anonymous") {
  const readiness = billingStatusResponse(env);
  const sourceUrl = getBillingSourceUrl(env);

  if (!sourceUrl) {
    return {
      status: "skipped",
      reason: "BILLING_SOURCE_NOT_CONFIGURED",
      readiness,
      subscription: null,
    };
  }

  try {
    const url = new URL(sourceUrl);
    url.searchParams.set("workspaceId", workspaceId);
    url.searchParams.set("userId", userId);
    url.searchParams.set("appId", "numeria-studio");

    const headers = {
      Accept: "application/json",
    };
    const token = getBillingSourceToken(env);
    if (token) headers.Authorization = `Bearer ${token}`;
    const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(getBillingFetchTimeoutMs(env))
      : undefined;

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal,
    });

    if (!response.ok) {
      return {
        status: "fallback",
        reason: "BILLING_SOURCE_HTTP_ERROR",
        readiness,
        subscription: null,
      };
    }

    const payload = await response.json();
    const subscription = normalizeBillingPayload(payload);

    if (subscription.planId === PLAN_IDS.BUSINESS) {
      return {
        status: "fallback",
        reason: "BUSINESS_PREPARING",
        readiness,
        subscription: null,
      };
    }

    return {
      status: "success",
      reason: "external_billing_subscription_loaded",
      readiness,
      subscription,
    };
  } catch (error) {
    return {
      status: "fallback",
      reason: "BILLING_SOURCE_FETCH_FAILED",
      message: error?.message || "External billing source could not be read.",
      readiness,
      subscription: null,
    };
  }
}

function applyBillingSubscription(record, billingSubscription) {
  if (!billingSubscription?.subscription?.planId) {
    return record;
  }

  return {
    ...record,
    planId: billingSubscription.subscription.planId,
    billingMonth: billingSubscription.subscription.currentPeriod || record.billingMonth,
  };
}

async function forwardApcActivity(env = {}, activity = {}) {
  const url = getApcActivitiesUrl(env);
  if (!url) {
    return { status: "skipped", reason: "APC_NOT_CONFIGURED" };
  }

  const token = getApcToken(env);
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const payload = {
    appId: "numeria-studio",
    appName: "Numeria Studio Site",
    appVersion: APP_VERSION,
    status: "success",
    source: "numeria-studio-site-worker",
    occurredAt: new Date().toISOString(),
    ...activity,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return {
      status: response.ok ? "success" : "warning",
      statusCode: response.status,
    };
  } catch (error) {
    return {
      status: "warning",
      reason: "APC_FORWARD_FAILED",
      message: error?.message || "AI Platform Core activity forwarding failed.",
    };
  }
}

function enqueueApcActivity(ctx, env, activity) {
  const task = forwardApcActivity(env, activity);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(task);
    return { status: "queued" };
  }
  return task;
}

function asciiPdfText(value, fallback = "Not set") {
  const text = String(value || fallback)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function escapePdfText(value) {
  return asciiPdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfText(value, maxLineLength = 72, maxLines = 3) {
  const words = asciiPdfText(value, "Not provided").split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxLineLength) {
      currentLine = nextLine;
      continue;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
    if (lines.length >= maxLines) break;
  }
  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.*$/, "")}...`;
  }
  return lines.length ? lines : ["Not provided"];
}

function pdfTextLine({ x = 54, y, size = 10, color = "0.12 0.10 0.17", text }) {
  return `${color} rg BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function pdfWrappedLines({ x = 54, y, size = 10, color = "0.12 0.10 0.17", text, maxLineLength = 72, maxLines = 3, lineGap = 15 }) {
  return wrapPdfText(text, maxLineLength, maxLines)
    .map((line, index) => pdfTextLine({ x, y: y - (index * lineGap), size, color, text: line }));
}

function pdfSection({ y, label, text, maxLines = 3 }) {
  return [
    `q 0.86 0.79 0.55 RG 54 ${y + 18} 504 1 re f Q`,
    pdfTextLine({ x: 54, y, size: 11, color: "0.48 0.38 0.16", text: label.toUpperCase() }),
    ...pdfWrappedLines({ x: 54, y: y - 22, size: 11, text, maxLines, maxLineLength: 76, lineGap: 16 }),
  ];
}

function createReportSnapshot({ exportId, reportType, branding, body = {} }) {
  return {
    exportId,
    reportType,
    branding,
    templateVersion: REPORT_TEMPLATE_VERSION,
    clientName: String(body.clientName || "未設定").trim(),
    birthDate: String(body.birthDate || "").trim(),
    lifePathNumber: body.lifePathNumber || null,
    question: String(body.question || "").trim(),
    resultSummary: String(body.resultSummary || "").trim(),
    notes: reportType === "detailed" ? String(body.notes || "").trim() : "",
  };
}

function createReportPdfBase64({ exportId, reportType, branding, body = {} }) {
  const isDetailed = reportType === "detailed";
  const title = isDetailed ? "Detailed Appraisal Report" : "Basic Appraisal Report";
  const subtitle = branding === "hidden" ? "Prepared without Numeria branding" : "Prepared by Numeria Studio";
  const lifePath = body.lifePathNumber ? `Life Path ${body.lifePathNumber}` : "Life Path not calculated";
  const nextStep = isDetailed
    ? "Use the notes section to shape the final wording, delivery timing, and follow-up proposal."
    : "Share the basic result first, then upgrade to Pro when a detailed paid report is needed.";
  const contentLines = [
    "q 0.10 0.08 0.16 rg 0 0 612 792 re f Q",
    "q 0.96 0.94 0.90 rg 28 28 556 736 re f Q",
    "q 0.14 0.10 0.22 rg 28 674 556 90 re f Q",
    "q 0.74 0.59 0.22 rg 52 674 3 90 re f Q",
    pdfTextLine({ x: 54, y: 730, size: 22, color: "1 1 1", text: `Numeria Studio ${title}` }),
    pdfTextLine({ x: 54, y: 704, size: 10, color: "0.86 0.79 0.55", text: subtitle }),
    pdfTextLine({ x: 420, y: 704, size: 8, color: "0.86 0.79 0.55", text: `Export ${exportId}` }),
    "q 1 1 1 rg 54 604 504 42 re f Q",
    pdfTextLine({ x: 68, y: 630, size: 12, color: "0.48 0.38 0.16", text: asciiPdfText(body.clientName, "Client not set") }),
    pdfTextLine({ x: 270, y: 630, size: 11, color: "0.12 0.10 0.17", text: asciiPdfText(body.birthDate, "Birth date not set") }),
    pdfTextLine({ x: 420, y: 630, size: 11, color: "0.12 0.10 0.17", text: lifePath }),
    pdfTextLine({ x: 68, y: 614, size: 8, color: "0.47 0.44 0.51", text: "CLIENT" }),
    pdfTextLine({ x: 270, y: 614, size: 8, color: "0.47 0.44 0.51", text: "BIRTH DATE" }),
    pdfTextLine({ x: 420, y: 614, size: 8, color: "0.47 0.44 0.51", text: "NUMEROLOGY" }),
    ...pdfSection({ y: 566, label: "Consultation Question", text: body.question, maxLines: 3 }),
    ...pdfSection({ y: 446, label: "Appraisal Summary", text: body.resultSummary, maxLines: isDetailed ? 5 : 4 }),
    ...pdfSection({ y: 286, label: isDetailed ? "Detailed Notes" : "Recommended Next Step", text: isDetailed ? body.notes : nextStep, maxLines: isDetailed ? 4 : 2 }),
    "q 0.14 0.10 0.22 rg 28 28 556 38 re f Q",
    pdfTextLine({ x: 54, y: 44, size: 8, color: "0.86 0.79 0.55", text: `${REPORT_TEMPLATE_VERSION} / ${reportType} / ${branding}` }),
    pdfTextLine({ x: 396, y: 44, size: 8, color: "0.86 0.79 0.55", text: "Generated by Numeria Studio" }),
  ].join("\n");
  const stream = `${contentLines}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return btoa(pdf);
}

function healthResponse() {
  return {
    status: "success",
    appId: "numeria-studio",
    service: "numeria-studio-site",
    version: APP_VERSION,
    releaseScope: "free-pro",
    productionUrl: "https://numeria-studio-site.karukimori.workers.dev",
    checks: {
      worker: "success",
      staticAssets: "configured",
      authProvider: "clerk",
      planContract: PLAN_CONTRACT_VERSION,
    },
  };
}

function versionResponse() {
  return {
    status: "success",
    appId: "numeria-studio",
    name: "numeria-studio-site",
    version: APP_VERSION,
    planContractVersion: PLAN_CONTRACT_VERSION,
    deploymentTarget: "cloudflare-workers-static-assets",
  };
}

function getExpectedCustomDomain(env = {}) {
  return env.NUMERIA_CUSTOM_DOMAIN
    || env.CUSTOM_DOMAIN
    || env.VITE_NUMERIA_CUSTOM_DOMAIN
    || "numeria-studio.com";
}

function getExpectedWorkerHost(env = {}) {
  return env.NUMERIA_WORKER_HOST
    || env.CLOUDFLARE_WORKER_HOST
    || "numeria-studio-site.karukimori.workers.dev";
}

function domainStatusResponse(request, env = {}) {
  const url = new URL(request.url);
  const currentHost = url.host.toLowerCase();
  const expectedCustomDomain = getExpectedCustomDomain(env).toLowerCase();
  const expectedWorkerHost = getExpectedWorkerHost(env).toLowerCase();
  const isCustomDomain = currentHost === expectedCustomDomain || currentHost.endsWith(`.${expectedCustomDomain}`);
  const isWorkerHost = currentHost === expectedWorkerHost;
  const routeReady = isCustomDomain || isWorkerHost;

  return {
    status: routeReady ? "success" : "warning",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    domainContractVersion: DOMAIN_CONTRACT_VERSION,
    currentHost,
    expectedCustomDomain,
    expectedWorkerHost,
    canonicalUrl: `https://${expectedCustomDomain}`,
    productionUrl: `https://${expectedWorkerHost}`,
    routeReady,
    currentRoute: isCustomDomain ? "custom-domain" : isWorkerHost ? "worker-host" : "unknown-host",
    customDomainReady: isCustomDomain,
    workerHostReady: isWorkerHost,
    cloudflareBindingRequired: true,
    secretValuesReturned: false,
    message: isCustomDomain
      ? "独自ドメインでWorkerへ到達しています。"
      : isWorkerHost
        ? "Cloudflare Workers標準URLで到達しています。独自ドメインの接続確認は未完了です。"
        : "想定外のHostで到達しています。CloudflareのWorker routeまたはCustom Domain設定を確認してください。",
  };
}

async function releaseStatusResponse(request = new Request("https://numeria-studio-site.karukimori.workers.dev/release/status"), env = {}) {
  const persistence = await persistenceStatusResponse(env);
  const integrations = await integrationsStatusResponse(request, env);
  const billing = billingStatusResponse(env);
  const growthEngineHandoff = growthEngineHandoffStatusResponse();
  const feedbackHub = feedbackHubStatusResponse(env);
  const auth = await authStatusResponse(new Request("https://local.test/release/status"), env);
  const domain = domainStatusResponse(request, env);
  return {
    status: persistence.status === "success" ? "success" : "warning",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    releaseScope: "free-pro",
    targetUrl: "https://numeria-studio.com/original.html",
    completedFeatures: [
      "Clerk login shell",
      "Free monthly appraisal limit",
      "Free one in-progress appraisal",
      "Free latest three completed appraisal detail visibility",
      "Pro unlimited appraisal and history contract",
      "Basic PDF export",
      "Pro detailed report and branding controls",
      "D1 persistence for usage, drafts, appraisal client profiles, completed appraisals, and report exports",
      "Selectable and editable appraisal client profile chips",
      "Numerology calculation preview while writing appraisals",
      "Feedback Hub embed payload",
      "Admin preview menus for unreleased features",
      "Structured PDF report template",
      "Server-side auth readiness contract",
      "Server-side Clerk JWT verification in observe/enforce modes",
      "Billing source readiness contract",
      "External billing read-only guard",
      "Custom domain readiness contract",
      "Growth Engine reservation handoff receiver",
      "Feedback Hub Free/Pro intake contract",
      "External integrations readiness inventory",
      "AI Platform Core usage event contract",
      "AI Platform Core usage event forwarding",
    ],
    pendingFeatures: [
      "Live Growth Engine or Stripe subscription credential confirmation",
      "Growth Engine Business plan handoff after Business release",
      "Japanese native PDF typography beyond browser print flow",
      "Clerk enforce-mode production rollout after token header confirmation",
    ],
    deferredFeatures: [
      "Business plan purchase",
      "Reservation, payment, refund, and sales management inside Numeria Studio",
      "Communication Planner message storage",
    ],
    checks: {
      persistence,
      aiUsage: {
        statusEndpoint: "/ai-usage/status",
        ...aiUsageStatusResponse(env),
      },
      aiPlatformCore: {
        statusEndpoint: "/apc/status",
        ...apcStatusResponse(env),
      },
      externalIntegrations: integrations,
      businessPurchasable: false,
      auth: {
        statusEndpoint: "/auth/status",
        ...auth,
      },
      billing: {
        statusEndpoint: "/billing/status",
        ...billing,
      },
      growthEngineHandoff,
      feedbackHub,
      domain: {
        statusEndpoint: "/domain/status",
        ...domain,
      },
      sourceOfTruth: "Numeria owns sessions, calculations, report snapshots, and appraisal client snapshots only.",
    },
  };
}

function requireAdmin(request, env = {}, body = {}) {
  const adminEmail = getAdminEmail(request, body);
  const adminMode = Boolean(adminEmail && getAdminEmails(env).includes(adminEmail));

  return { adminEmail, adminMode };
}

function adminStatusResponse(request, env = {}, body = {}) {
  const { adminEmail, adminMode } = requireAdmin(request, env, body);

  const base = {
    status: adminMode ? "success" : "error",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    adminContractVersion: ADMIN_CONTRACT_VERSION,
    adminMode,
    mode: "monitoring-only",
    message: adminMode
      ? "管理者モードを利用できます。"
      : "管理者として確認できませんでした。",
  };

  if (!adminMode) {
    return {
      ...base,
      errorCode: "ADMIN_ACCESS_REQUIRED",
    };
  }

  return {
    ...base,
    adminEmail,
    permissions: ["release_monitoring", "usage_inspection", "plan_contract_review"],
    endpoints: {
      contracts: "/contracts/status",
      usage: "/api/usage",
      subscription: "/api/billing/subscription",
      billing: "/billing/status",
    },
    planSummary: {
      free: {
        monthlyAppraisals: PLAN_CONFIG.free.entitlements.monthlyAppraisals,
        inProgressAppraisals: PLAN_CONFIG.free.entitlements.inProgressAppraisals,
        viewableCompletedAppraisals: PLAN_CONFIG.free.entitlements.viewableCompletedAppraisals,
        mainDivinationLocked: PLAN_CONFIG.free.entitlements.mainDivinationLocked,
      },
      pro: {
        monthlyAppraisals: "unlimited",
        inProgressAppraisals: "unlimited",
        viewableCompletedAppraisals: "unlimited",
      },
      business: {
        status: "preparing",
      },
    },
  };
}

async function adminAccountResponse(request, env = {}, body = {}) {
  const { adminEmail, adminMode } = requireAdmin(request, env, body);

  if (!adminMode) {
    return {
      status: "error",
      appId: "numeria-studio",
      adminContractVersion: ADMIN_CONTRACT_VERSION,
      adminMode: false,
      errorCode: "ADMIN_ACCESS_REQUIRED",
      message: "管理者として確認できませんでした。",
    };
  }

  const url = new URL(request.url);
  const targetWorkspaceId =
    String(body.targetWorkspaceId || body.workspaceId || url.searchParams.get("workspaceId") || "")
      .trim() || "ws_personal";
  const targetUserId =
    String(body.targetUserId || body.userId || url.searchParams.get("userId") || "")
      .trim() || "browser-user";
  const targetRecord = await loadUsageRecord(env, targetWorkspaceId, targetUserId);
  const billingSubscription = await fetchExternalBillingSubscription(env, targetWorkspaceId, targetUserId);
  const effectiveRecord = applyBillingSubscription(targetRecord, billingSubscription);
  const planId = normalizePlanId(effectiveRecord.planId);
  const plan = getPlanConfigForPlan(planId);

  return {
    status: "success",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    adminContractVersion: ADMIN_CONTRACT_VERSION,
    adminMode: true,
    adminEmail,
    target: {
      workspaceId: targetWorkspaceId,
      userId: targetUserId,
      billingMonth: targetRecord.billingMonth,
    },
    subscription: {
      planId,
      planName: plan.name,
      billingStatus: planId === PLAN_IDS.FREE ? "free" : "active",
      source: billingSubscription.subscription?.source || "numeria-worker-mvp",
      readStatus: billingSubscription.status,
      readReason: billingSubscription.reason,
      externalBilling: billingStatusResponse(env),
    },
    usage: usageResponse(effectiveRecord),
    limits: plan.entitlements,
    historyPolicy: {
      visibleCompletedAppraisals: plan.entitlements.viewableCompletedAppraisals,
      lockedDetailsAreRetained: true,
    },
  };
}

async function contractsStatusResponse(env = {}) {
  const persistence = await persistenceStatusResponse(env);
  const externalIntegrations = await integrationsStatusResponse(
    new Request("https://numeria-studio-site.karukimori.workers.dev/contracts/status"),
    env,
  );
  const auth = await authStatusResponse(new Request("https://local.test/contracts/status"), env);
  const billing = billingStatusResponse(env);
  const domain = domainStatusResponse(new Request("https://numeria-studio-site.karukimori.workers.dev/contracts/status"), env);
  const aiUsage = aiUsageStatusResponse(env);
  const aiPlatformCore = apcStatusResponse(env);
  const growthEngineHandoff = growthEngineHandoffStatusResponse();
  const feedbackHub = feedbackHubStatusResponse(env);
  return {
    status: "success",
    appId: "numeria-studio",
    contractVersion: PLAN_CONTRACT_VERSION,
    identityMode: "workspaceId+userId",
    plans: {
      free: {
        available: true,
        monthlyAppraisals: PLAN_CONFIG.free.entitlements.monthlyAppraisals,
        completionCountTrigger: PLAN_CONFIG.free.entitlements.completionCountTrigger,
        inProgressAppraisals: PLAN_CONFIG.free.entitlements.inProgressAppraisals,
        viewableCompletedAppraisals: PLAN_CONFIG.free.entitlements.viewableCompletedAppraisals,
        appraisalClients: PLAN_CONFIG.free.entitlements.appraisalClients,
        pdfExport: PLAN_CONFIG.free.entitlements.pdfExport,
        mainDivinationLocked: PLAN_CONFIG.free.entitlements.mainDivinationLocked,
      },
      pro: {
        available: true,
        monthlyAppraisals: "unlimited",
        inProgressAppraisals: "unlimited",
        viewableCompletedAppraisals: "unlimited",
        appraisalClients: "unlimited",
        pdfExport: true,
        mainDivinationLocked: false,
      },
      business: {
        available: false,
        purchasable: false,
        status: "preparing",
      },
    },
    sourceOfTruth: {
      numeriaOwns: [
        "Session",
        "Report",
        "CalculationResult",
        "NumeriaSnapshot",
        "AppraisalClientSnapshot",
      ],
      externalReferencesOnly: [
        "Customer",
        "Reservation",
        "Payment",
        "Sales",
        "Conversation",
        "Message",
        "AIActivity",
        "AIUsage",
      ],
    },
    events: {
      sessionStarted: "studio.session.started.v1",
      sessionCompleted: "studio.session.completed.v1",
      reportGenerated: "studio.report.generated.v1",
    },
    integrations: {
      statusEndpoint: "/integrations/status",
      externalIntegrations,
      growthEngineHandoff,
      feedbackHub,
    },
    reports: {
      templateVersion: REPORT_TEMPLATE_VERSION,
      workerPdf: "structured-one-page-pdf",
      japanesePrintFlow: "browser-print-to-pdf",
    },
    billing: {
      statusEndpoint: "/billing/status",
      ...billing,
    },
    domain: {
      statusEndpoint: "/domain/status",
      ...domain,
    },
    aiUsage: {
      statusEndpoint: "/ai-usage/status",
      ...aiUsage,
    },
    aiPlatformCore: {
      statusEndpoint: "/apc/status",
      ...aiPlatformCore,
    },
    auth: {
      statusEndpoint: "/auth/status",
      ...auth,
    },
    persistence: {
      statusEndpoint: "/persistence/status",
      ...persistence,
    },
  };
}

function getClerkPublishableKey(request, env = {}) {
  return env.CLERK_PUBLISHABLE_KEY
    || env.VITE_CLERK_PUBLISHABLE_KEY
    || request.headers.get("X-Clerk-Publishable-Key")
    || globalThis.CLERK_PUBLISHABLE_KEY
    || globalThis.VITE_CLERK_PUBLISHABLE_KEY
    || "";
}

function getClerkSecretKey(env = {}) {
  return env.CLERK_SECRET_KEY
    || env.CLERK_API_KEY
    || globalThis.CLERK_SECRET_KEY
    || globalThis.CLERK_API_KEY
    || "";
}

function getClerkJwksUrl(request, env = {}) {
  const explicitUrl = env.CLERK_JWKS_URL
    || env.NUMERIA_CLERK_JWKS_URL
    || globalThis.CLERK_JWKS_URL
    || globalThis.NUMERIA_CLERK_JWKS_URL
    || "";
  if (explicitUrl) return explicitUrl;

  const publishableKey = getClerkPublishableKey(request, env);
  const encodedFrontendHost = String(publishableKey).split("_").at(-1) || "";
  try {
    const frontendHost = atob(encodedFrontendHost).replace(/\$$/, "");
    return frontendHost ? `https://${frontendHost}/.well-known/jwks.json` : "";
  } catch {
    return "";
  }
}

function getAuthEnforcementMode(env = {}) {
  const raw = env.AUTH_ENFORCEMENT_MODE
    || env.NUMERIA_AUTH_ENFORCEMENT_MODE
    || globalThis.AUTH_ENFORCEMENT_MODE
    || "observe";
  return String(raw).toLowerCase() === "enforce" ? "enforce" : "observe";
}

function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

function getExpectedClerkIssuer(env = {}) {
  return env.CLERK_JWT_ISSUER
    || env.CLERK_ISSUER
    || env.NUMERIA_CLERK_ISSUER
    || globalThis.CLERK_JWT_ISSUER
    || globalThis.CLERK_ISSUER
    || "";
}

async function fetchClerkJwks(jwksUrl) {
  const response = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`JWKS fetch failed: ${response.status}`);
  }
  const body = await response.json();
  return Array.isArray(body.keys) ? body.keys : [];
}

async function verifyClerkSessionToken(request, env = {}) {
  const token = getBearerToken(request);
  const jwksUrl = getClerkJwksUrl(request, env);
  if (!token) {
    return { verified: false, reason: "missing-bearer-token", userId: "", method: jwksUrl ? "jwks-rs256" : "not-configured" };
  }
  if (!jwksUrl) {
    return { verified: false, reason: "jwks-not-configured", userId: "", method: "not-configured" };
  }

  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) {
      return { verified: false, reason: "malformed-jwt", userId: "", method: "jwks-rs256" };
    }

    const header = base64UrlJson(headerPart);
    const payload = base64UrlJson(payloadPart);
    if (header.alg !== "RS256") {
      return { verified: false, reason: "unsupported-algorithm", userId: "", method: "jwks-rs256" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && Number(payload.exp) <= now) {
      return { verified: false, reason: "token-expired", userId: "", method: "jwks-rs256" };
    }
    if (payload.nbf && Number(payload.nbf) > now) {
      return { verified: false, reason: "token-not-yet-valid", userId: "", method: "jwks-rs256" };
    }

    const expectedIssuer = getExpectedClerkIssuer(env);
    if (expectedIssuer && payload.iss !== expectedIssuer) {
      return { verified: false, reason: "issuer-mismatch", userId: "", method: "jwks-rs256" };
    }

    const keys = await fetchClerkJwks(jwksUrl);
    const jwk = keys.find((key) => key.kid === header.kid) || keys[0];
    if (!jwk) {
      return { verified: false, reason: "jwks-key-not-found", userId: "", method: "jwks-rs256" };
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecode(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );

    return {
      verified,
      reason: verified ? "verified" : "signature-invalid",
      userId: verified ? String(payload.sub || "") : "",
      sessionId: verified ? String(payload.sid || "") : "",
      method: "jwks-rs256",
    };
  } catch (error) {
    return {
      verified: false,
      reason: `verification-error:${error?.message || "unknown"}`,
      userId: "",
      method: "jwks-rs256",
    };
  }
}

function isAuthOptionalApi(pathname) {
  return pathname === "/api/plans" || pathname === "/api/auth/config";
}

async function authenticateApiRequest(request, env = {}) {
  const url = new URL(request.url);
  const enforcementMode = getAuthEnforcementMode(env);
  const verification = await verifyClerkSessionToken(request, env);
  if (enforcementMode === "enforce" && !verification.verified && !isAuthOptionalApi(url.pathname)) {
    return {
      auth: verification,
      response: json({
        status: "error",
        errorCode: "AUTH_SESSION_REQUIRED",
        message: "ログインセッションを確認できません。再ログインしてからお試しください。",
        authProvider: "clerk",
        enforcementMode,
        verificationReason: verification.reason,
      }, { status: 401 }),
    };
  }
  return { auth: verification, response: null };
}

async function authStatusResponse(request, env = {}) {
  const publishableKey = getClerkPublishableKey(request, env);
  const secretKey = getClerkSecretKey(env);
  const jwksUrl = getClerkJwksUrl(request, env);
  const enforcementMode = getAuthEnforcementMode(env);
  const verification = await verifyClerkSessionToken(request, env);
  const serverVerificationReady = Boolean(secretKey || jwksUrl);
  const clientAuthReady = Boolean(publishableKey);
  const enforceModeReady = clientAuthReady && Boolean(jwksUrl);
  const rolloutBlockers = [
    !clientAuthReady ? "CLERK_PUBLISHABLE_KEY is not configured." : "",
    !jwksUrl ? "CLERK_JWKS_URL could not be resolved." : "",
  ].filter(Boolean);

  return {
    status: serverVerificationReady || enforcementMode === "observe" ? "success" : "warning",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    authProvider: "clerk",
    authContractVersion: AUTH_CONTRACT_VERSION,
    clientAuthReady,
    serverVerificationReady,
    serverVerificationMethod: jwksUrl ? "jwks-rs256" : "not-configured",
    enforcementMode,
    enforceModeReady,
    enforceModeRollout: {
      currentMode: enforcementMode,
      targetMode: "enforce",
      ready: enforceModeReady,
      recommendedAction: enforceModeReady
        ? "AUTH_ENFORCEMENT_MODE=enforce can be tested with a signed-in production user."
        : "Keep observe mode until Clerk publishable key and JWKS URL are configured.",
      requiredRuntimeConfig: [
        "CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY",
        "CLERK_JWKS_URL or a Clerk publishable key that can resolve JWKS",
        "AUTH_ENFORCEMENT_MODE=enforce",
      ],
      blockers: rolloutBlockers,
    },
    incomingRequestHasBearerToken: Boolean(getBearerToken(request)),
    incomingRequestVerified: verification.verified,
    incomingRequestVerificationReason: verification.reason,
    identityMode: "workspaceId+userId",
    secretValuesReturned: false,
    message: verification.verified
      ? "ClerkセッションJWTをサーバー側で検証しました。"
      : serverVerificationReady
        ? "サーバー側認証検証を有効化できます。"
        : "MVPではobserveモードです。CLERK_JWKS_URLを設定するとサーバー側検証を有効化できます。",
  };
}

function getAdminEmails(env = {}) {
  const raw =
    env.ADMIN_EMAILS ||
    env.VITE_ADMIN_EMAILS ||
    globalThis.ADMIN_EMAILS ||
    globalThis.VITE_ADMIN_EMAILS ||
    "illusionddt@gmail.com";

  return String(raw)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminEmail(request, body = {}) {
  return String(
    body.adminEmail ||
      body.email ||
      request.headers.get("X-Admin-Email") ||
      ""
  )
    .trim()
    .toLowerCase();
}

function getClerkFrontendOrigin(publishableKey) {
  const encodedFrontendApi = publishableKey
    .replace(/^pk_(test|live)_/, "")
    .replace(/\$$/, "");
  try {
    const decoded = atob(encodedFrontendApi).replace(/\$$/, "");
    const url = decoded.startsWith("http") ? new URL(decoded) : new URL(`https://${decoded}`);
    return url.origin;
  } catch {
    return null;
  }
}

function acceptsHtml(request) {
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html") || accept.includes("*/*");
}

function isAppRouteFallback(request, url) {
  if (request.method !== "GET" || !acceptsHtml(request)) return false;
  if (url.pathname === "/" || url.pathname === "/original.html" || url.pathname === "/original") return false;
  return !url.pathname.split("/").pop().includes(".");
}

async function clerkBrowserScriptResponse(request, env = {}) {
  const publishableKey = getClerkPublishableKey(request, env);
  const frontendOrigin = getClerkFrontendOrigin(publishableKey);
  if (!frontendOrigin) {
    return new Response("Login settings are not ready.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const upstream = await fetch(`${frontendOrigin}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function clerkBrowserAssetResponse(request, env = {}) {
  const url = new URL(request.url);
  const publishableKey = getClerkPublishableKey(request, env);
  const frontendOrigin = getClerkFrontendOrigin(publishableKey);
  if (!frontendOrigin) {
    return new Response("Login settings are not ready.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const upstream = await fetch(`${frontendOrigin}/npm/@clerk/clerk-js@6/dist${url.pathname}`);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function handleApi(request, env = {}, ctx = null) {
  const url = new URL(request.url);
  const body = await readJson(request);
  const { auth, response: authResponse } = await authenticateApiRequest(request, env);
  if (authResponse) return authResponse;

  if (url.pathname === "/api/plans" && request.method === "GET") {
    return json({ status: "success", plans: PLAN_CONFIG });
  }

  if (url.pathname === "/api/auth/config" && request.method === "GET") {
    const publishableKey = getClerkPublishableKey(request, env);
    return json({
      status: publishableKey ? "success" : "warning",
      authProvider: "clerk",
      publishableKey: publishableKey || null,
      message: publishableKey
        ? "Login is configured."
        : "ログイン設定がまだ本番環境に反映されていません。",
    });
  }

  if (url.pathname === "/api/admin/status" && ["GET", "POST"].includes(request.method)) {
    const adminStatus = adminStatusResponse(request, env, body);
    return json(adminStatus, { status: adminStatus.adminMode ? 200 : 403 });
  }

  if (url.pathname === "/api/admin/account" && ["GET", "POST"].includes(request.method)) {
    const adminAccount = await adminAccountResponse(request, env, body);
    return json(adminAccount, { status: adminAccount.adminMode ? 200 : 403 });
  }

  const { workspaceId, userId } = getScope(request, body, auth);

  if (url.pathname === "/api/feedback/submit" && request.method === "POST") {
    const feedback = await feedbackSubmitResponse(env, body, { workspaceId, userId });
    return json(feedback, { status: 202 });
  }

  const record = await loadUsageRecord(env, workspaceId, userId);
  const billingSubscription = await fetchExternalBillingSubscription(env, workspaceId, userId);
  const effectiveRecord = applyBillingSubscription(record, billingSubscription);

  if (url.pathname === "/api/usage" && request.method === "GET") {
    const usage = usageResponse(effectiveRecord);
    return json({
      status: "success",
      workspaceId,
      userId,
      usage,
      subscriptionSource: billingSubscription.status === "success" ? "external" : "numeria-worker-mvp",
      billingReadiness: billingSubscription.readiness,
      historyPolicy: { visibleCompletedAppraisals: usage.entitlements.viewableCompletedAppraisals, lockedDetailsAreRetained: true },
    });
  }

  if (url.pathname === "/api/appraisals/status" && request.method === "GET") {
    const usage = usageResponse(effectiveRecord);
    return json({
      status: "success",
      workspaceId,
      userId,
      activeDraft: usage.activeDraft,
      inProgressAppraisals: usage.inProgressAppraisals,
      completedAppraisals: usage.completedAppraisals,
      visibleCompletedAppraisals: usage.visibleCompletedAppraisals,
      lockedCompletedAppraisalIds: usage.lockedCompletedAppraisalIds,
      clientHistorySummaries: usage.clientHistorySummaries,
      reportExports: usage.reportExports,
      historyPolicy: {
        visibleCompletedAppraisals: usage.entitlements.viewableCompletedAppraisals,
        lockedDetailsAreRetained: true,
      },
    });
  }

  if (url.pathname === "/api/billing/subscription" && request.method === "GET") {
    const billing = billingStatusResponse(env);
    const externalSubscription = billingSubscription.subscription;
    const effectivePlanId = externalSubscription?.planId || record.planId;
    return json({
      status: "success",
      workspaceId,
      userId,
      subscription: {
        planId: effectivePlanId,
        billingStatus: externalSubscription?.billingStatus || (effectivePlanId === PLAN_IDS.FREE ? "free" : "active"),
        currentPeriod: externalSubscription?.currentPeriod || record.billingMonth,
        source: externalSubscription ? externalSubscription.source : "numeria-worker-mvp",
        readStatus: billingSubscription.status,
        readReason: billingSubscription.reason,
        externalBilling: billing,
      },
    });
  }

  if (url.pathname === "/api/billing/subscription" && request.method === "PATCH") {
    const billing = billingStatusResponse(env);
    if (!billing.mvpPlanSwitchingEnabled) {
      return json({
        status: "error",
        errorCode: "EXTERNAL_BILLING_SOURCE_READ_ONLY",
        message: "契約状態は外部の請求元を正として読み取ります。Numeria内ではプランを直接変更できません。",
        billing,
      }, { status: 409 });
    }

    const requestedPlanId = normalizePlanId(body.planId);
    if (requestedPlanId === PLAN_IDS.BUSINESS) {
      return json({
        status: "error",
        errorCode: "BUSINESS_PREPARING",
        message: "Businessプランは準備中です。購入はまだできません。",
      }, { status: 409 });
    }
    record.planId = requestedPlanId;
    await saveUsageRecord(env, workspaceId, userId, record);
    return json({
      status: "success",
      subscription: {
        planId: record.planId,
        billingStatus: record.planId === PLAN_IDS.FREE ? "free" : "active",
        currentPeriod: record.billingMonth,
      },
      usage: usageResponse(record),
    });
  }

  if (url.pathname === "/api/appraisal-clients" && request.method === "POST") {
    const snapshot = usageResponse(effectiveRecord);
    const decision = evaluateUsageLimit(snapshot, "create_appraisal_client");
    if (!decision.allowed) {
      return json({ status: "error", errorCode: decision.reason, message: decision.message, upgradeBenefit: decision.upgradeBenefit, usage: snapshot }, { status: 402 });
    }
    const profileIndex = (record.appraisalClientProfiles || []).length + 1;
    const profileTimestamp = Date.now();
    const appraisalClient = {
      id: `acl_${profileTimestamp}_${profileIndex}_${Math.random().toString(36).slice(2, 8)}`,
      clientName: String(body.clientName || "未設定").trim() || "未設定",
      birthDate: String(body.birthDate || "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    record.appraisalClientProfiles = [
      ...(record.appraisalClientProfiles || []),
      appraisalClient,
    ];
    record.appraisalClients = Math.max(Number(record.appraisalClients || 0) + 1, record.appraisalClientProfiles.length);
    await saveUsageRecord(env, workspaceId, userId, record);
    return json({
      status: "success",
      appraisalClientRef: appraisalClient.id,
      appraisalClient,
      sourceOfTruth: "numeria-appraisal-client-profile",
      limitPolicy: isUnlimited(snapshot.entitlements.appraisalClients) ? "profile-count-unlimited" : "free-three-appraisal-client-profiles",
      usage: usageResponse(applyBillingSubscription(record, billingSubscription)),
    }, { status: 201 });
  }

  if (url.pathname.startsWith("/api/appraisal-clients/") && ["PATCH", "DELETE"].includes(request.method)) {
    const profileId = decodeURIComponent(url.pathname.split("/").pop() || "");
    const profiles = Array.isArray(record.appraisalClientProfiles) ? record.appraisalClientProfiles : [];
    const existingProfile = profiles.find((profile) => profile.id === profileId);
    if (!existingProfile) {
      return json({
        status: "error",
        errorCode: "APPRAISAL_CLIENT_PROFILE_NOT_FOUND",
        message: "依頼者プロフィールが見つかりません。",
        usage: usageResponse(effectiveRecord),
      }, { status: 404 });
    }

    if (request.method === "DELETE") {
      record.appraisalClientProfiles = profiles.filter((profile) => profile.id !== profileId);
      record.appraisalClients = record.appraisalClientProfiles.length;
      await saveUsageRecord(env, workspaceId, userId, record);
      return json({
        status: "success",
        deletedAppraisalClientRef: profileId,
        usage: usageResponse(applyBillingSubscription(record, billingSubscription)),
      });
    }

    const updatedProfile = {
      ...existingProfile,
      clientName: String(body.clientName || existingProfile.clientName || "未設定").trim() || "未設定",
      birthDate: String(body.birthDate ?? existingProfile.birthDate ?? "").trim(),
      updatedAt: new Date().toISOString(),
    };
    record.appraisalClientProfiles = profiles.map((profile) => profile.id === profileId ? updatedProfile : profile);
    record.appraisalClients = record.appraisalClientProfiles.length;
    await saveUsageRecord(env, workspaceId, userId, record);
    return json({
      status: "success",
      appraisalClient: updatedProfile,
      usage: usageResponse(applyBillingSubscription(record, billingSubscription)),
    });
  }

  if (url.pathname === "/api/sessions/start" && request.method === "POST") {
    const sessionId = body.sessionId || `ses_${Date.now()}`;
    const externalReferences = normalizeGrowthEngineExternalReferences(body);
    await saveUsageRecord(env, workspaceId, userId, record);
    const usage = usageResponse(effectiveRecord);
    const correlationId = body.correlationId || createCorrelationId("session");
    enqueueApcActivity(ctx, env, {
      workspaceId,
      userId,
      planId: usage.planId,
      featureKey: "studio.session",
      eventName: "studio.session.started.v1",
      correlationId,
      metadata: {
        sessionId,
        externalReferences,
        countPolicy: "completion-button-only",
        draftPolicy: "not-counted-until-draft-save",
      },
    });
    return json({
      status: "success",
      sessionId,
      sessionStatus: "started",
      eventName: "studio.session.started.v1",
      correlationId,
      externalReferences,
      countPolicy: "completion-button-only",
      draftPolicy: "not-counted-until-draft-save",
      usage,
    }, { status: 201 });
  }

  if (url.pathname === "/api/appraisals/save-draft" && request.method === "POST") {
    const snapshot = usageResponse(effectiveRecord);
    const appraisalId = body.appraisalId || body.id || body.draftId || `draft_${Date.now()}`;
    const currentDraft = record.activeDraft;
    const isSameDraft = currentDraft && currentDraft.id === appraisalId;
    const decision = isSameDraft
      ? { allowed: true }
      : evaluateUsageLimit(snapshot, "save_in_progress_appraisal");
    if (!decision.allowed) {
      return json({ status: "error", errorCode: decision.reason, message: decision.message, upgradeBenefit: decision.upgradeBenefit, usage: snapshot }, { status: 402 });
    }
    record.activeDraft = {
      id: appraisalId,
      clientName: String(body.clientName || currentDraft?.clientName || "未設定").trim(),
      birthDate: String(body.birthDate || currentDraft?.birthDate || "").trim(),
      lifePathNumber: body.lifePathNumber || currentDraft?.lifePathNumber || null,
      question: String(body.question || currentDraft?.question || "").trim(),
      notes: String(body.notes || currentDraft?.notes || "").trim(),
      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),
      externalReferences: normalizeGrowthEngineExternalReferences(body) || currentDraft?.externalReferences || null,
      updatedAt: new Date().toISOString(),
    };
    record.inProgressAppraisals = record.activeDraft ? 1 : 0;
    await saveUsageRecord(env, workspaceId, userId, record);
    return json({
      status: "success",
      draftId: appraisalId,
      activeDraft: record.activeDraft,
      limitPolicy: "free-one-in-progress-appraisal",
      usage: usageResponse(applyBillingSubscription(record, billingSubscription)),
    }, { status: 201 });
  }

  if (url.pathname === "/api/appraisals/complete" && request.method === "POST") {
    const snapshot = usageResponse(effectiveRecord);
    const decision = evaluateUsageLimit(snapshot, "complete_appraisal");
    if (!decision.allowed) {
      return json({ status: "error", errorCode: decision.reason, message: decision.message, upgradeBenefit: decision.upgradeBenefit, usage: snapshot }, { status: 402 });
    }
    const appraisalId = body.appraisalId || body.id || `app_${Date.now()}`;
    if (record.activeDraft && record.activeDraft.id !== appraisalId) {
      return json({
        status: "error",
        errorCode: "ACTIVE_APPRAISAL_REQUIRED",
        message: `未完了の案件「${record.activeDraft.clientName || "未設定"}」を先に完成してください。`,
        upgradeBenefit: "同時進行できる未完了案件数を増やす場合はProをご利用ください。",
        usage: snapshot,
      }, { status: 409 });
    }
    const completedAt = new Date().toISOString();
    const currentDraft = record.activeDraft;
    const completedAppraisal = {
      id: appraisalId,
      clientName: String(body.clientName || currentDraft?.clientName || "未設定").trim(),
      birthDate: String(body.birthDate || currentDraft?.birthDate || "").trim(),
      lifePathNumber: body.lifePathNumber || currentDraft?.lifePathNumber || null,
      question: String(body.question || currentDraft?.question || "").trim(),
      notes: String(body.notes || currentDraft?.notes || "").trim(),
      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),
      externalReferences: normalizeGrowthEngineExternalReferences(body) || currentDraft?.externalReferences || null,
      completedAt,
    };
    record.monthlyAppraisals += 1;
    if (currentDraft?.id === appraisalId) {
      record.activeDraft = null;
    }
    record.inProgressAppraisals = record.activeDraft ? 1 : 0;
    record.completedAppraisalIds = [...(record.completedAppraisalIds || []), appraisalId];
    record.completedAppraisals = [...(record.completedAppraisals || []), completedAppraisal];
    await saveUsageRecord(env, workspaceId, userId, record);
    const updatedUsage = usageResponse(applyBillingSubscription(record, billingSubscription));
    const aiUsageEvent = createAiUsageEvent({
      eventName: "studio.session.completed.v1",
      workspaceId,
      userId,
      planId: updatedUsage.planId,
      featureKey: "appraisal_completion",
      correlationId: appraisalId,
    });
    const aiUsageDelivery = await recordAiUsageEvent(env, aiUsageEvent);
    const correlationId = body.correlationId || createCorrelationId("complete");
    enqueueApcActivity(ctx, env, {
      workspaceId,
      userId,
      planId: updatedUsage.planId,
      featureKey: "studio.appraisal.complete",
      eventName: "studio.session.completed.v1",
      correlationId,
      metadata: {
        appraisalId,
        monthlyAppraisals: updatedUsage.monthlyAppraisals,
        countPolicy: "appraisal_completed_button",
      },
    });
    return json({
      status: "success",
      appraisalId,
      appraisal: completedAppraisal,
      sessionStatus: "completed",
      eventName: "studio.session.completed.v1",
      correlationId,
      countPolicy: "appraisal_completed_button",
      aiUsageEvent: {
        eventId: aiUsageEvent.eventId,
        eventName: aiUsageEvent.eventName,
        recorded: true,
        forwarded: aiUsageDelivery.forwarded,
        forwardingMode: aiUsageDelivery.forwardingMode,
        dataPolicy: aiUsageEvent.dataPolicy,
      },
      historyPolicy: {
        visibleCompletedAppraisals: updatedUsage.entitlements.viewableCompletedAppraisals,
        visibleCompletedAppraisalIds: updatedUsage.visibleCompletedAppraisalIds,
        lockedCompletedAppraisalIds: updatedUsage.lockedCompletedAppraisalIds,
        lockedDetailsAreRetained: true,
      },
      usage: updatedUsage,
    }, { status: 201 });
  }

  if (url.pathname === "/api/reports/export" && request.method === "POST") {
    const snapshot = usageResponse(effectiveRecord);
    const format = String(body.format || "pdf").toLowerCase();
    const reportType = String(body.reportType || "basic").toLowerCase();
    const removeBranding = Boolean(body.removeBranding);
    const checks = [
      format === "pdf" ? evaluateUsageLimit(snapshot, "export_pdf_report") : {
        allowed: false,
        reason: "REPORT_FORMAT_NOT_SUPPORTED",
        message: "現在出力できる形式はPDFのみです。",
        upgradeBenefit: "Word出力や共有リンクは今後の拡張候補です。",
      },
      reportType === "detailed" ? evaluateUsageLimit(snapshot, "export_detailed_report") : { allowed: true },
      removeBranding ? evaluateUsageLimit(snapshot, "remove_report_branding") : { allowed: true },
    ];
    const blocked = checks.find((check) => !check.allowed);

    if (blocked) {
      return json({
        status: "error",
        errorCode: blocked.reason,
        message: blocked.message,
        upgradeBenefit: blocked.upgradeBenefit,
        usage: snapshot,
      }, { status: 402 });
    }

    const exportId = `rep_${Date.now()}`;
    const generatedAt = new Date().toISOString();
    const branding = removeBranding ? "hidden" : "numeria-logo-included";
    const fileName = `numeria-${reportType}-report-${exportId}.pdf`;
    const reportSnapshot = createReportSnapshot({
      exportId,
      reportType,
      branding,
      body,
    });
    const pdfBase64 = createReportPdfBase64({
      exportId,
      reportType,
      branding,
      body: reportSnapshot,
    });
    const reportEvent = {
      exportId,
      appraisalId: body.appraisalId || null,
      reportType,
      branding,
      format,
      generatedAt,
    };
    record.reportExports = [
      ...(record.reportExports || []),
      reportEvent,
    ];
    await saveUsageRecord(env, workspaceId, userId, record);
    await saveReportEvent(env, workspaceId, userId, record, reportEvent);
    const updatedUsage = usageResponse(applyBillingSubscription(record, billingSubscription));
    const aiUsageEvent = createAiUsageEvent({
      eventName: "studio.report.generated.v1",
      workspaceId,
      userId,
      planId: updatedUsage.planId,
      featureKey: `report_export_${reportType}`,
      correlationId: exportId,
    });
    const aiUsageDelivery = await recordAiUsageEvent(env, aiUsageEvent);
    const correlationId = body.correlationId || createCorrelationId("report");
    enqueueApcActivity(ctx, env, {
      workspaceId,
      userId,
      planId: updatedUsage.planId,
      featureKey: "studio.report.export",
      eventName: "studio.report.generated.v1",
      correlationId,
      metadata: {
        exportId,
        appraisalId: body.appraisalId || null,
        reportType,
        format,
        branding,
      },
    });
    return json({
      status: "success",
      exportId,
      eventName: "studio.report.generated.v1",
      correlationId,
      generatedAt,
      format,
      reportType,
      branding,
      fileName,
      mimeType: "application/pdf",
      downloadUrl: `data:application/pdf;base64,${pdfBase64}`,
      downloadPolicy: "inline-pdf-data-url-mvp",
      reportSnapshot,
      reportTemplateVersion: REPORT_TEMPLATE_VERSION,
      aiUsageEvent: {
        eventId: aiUsageEvent.eventId,
        eventName: aiUsageEvent.eventName,
        recorded: true,
        forwarded: aiUsageDelivery.forwarded,
        forwardingMode: aiUsageDelivery.forwardingMode,
        dataPolicy: aiUsageEvent.dataPolicy,
      },
      message: "PDFを生成しました。ダウンロードできます。",
      usage: updatedUsage,
    }, { status: 201 });
  }

  return json({ status: "error", errorCode: "NOT_FOUND", message: "API endpoint not found." }, { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json(healthResponse());
    }
    if (url.pathname === "/version") {
      return json(versionResponse());
    }
    if (url.pathname === "/release/status") {
      return json(await releaseStatusResponse(request, env));
    }
    if (url.pathname === "/domain/status") {
      return json(domainStatusResponse(request, env));
    }
    if (url.pathname === "/apc/status") {
      return json(apcStatusResponse(env));
    }
    if (url.pathname === "/auth/status") {
      return json(await authStatusResponse(request, env));
    }
    if (url.pathname === "/billing/status") {
      return json(billingStatusResponse(env));
    }
    if (url.pathname === "/integrations/status") {
      return json(await integrationsStatusResponse(request, env));
    }
    if (url.pathname === "/feedback-hub/status") {
      return json(feedbackHubStatusResponse(env));
    }
    if (url.pathname === "/growth-handoff/status") {
      return json(growthEngineHandoffStatusResponse());
    }
    if (url.pathname === "/ai-usage/status") {
      return json(aiUsageStatusResponse(env));
    }
    if (url.pathname === "/contracts/status") {
      return json(await contractsStatusResponse(env));
    }
    if (url.pathname === "/persistence/status") {
      return json(await persistenceStatusResponse(env));
    }
    if (url.pathname === "/clerk.browser.js" && (request.method === "GET" || request.method === "HEAD")) {
      return clerkBrowserScriptResponse(request, env);
    }
    if (/^\/[A-Za-z0-9_-]+_clerk\.browser_[A-Za-z0-9]+_[0-9.]+\.js$/.test(url.pathname)
      && (request.method === "GET" || request.method === "HEAD")) {
      return clerkBrowserAssetResponse(request, env);
    }
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, ctx);
    }
    if (isAppRouteFallback(request, url)) {
      const fallbackUrl = new URL("/original.html", request.url);
      return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET" || !acceptsHtml(request)) {
      return response;
    }

    const fallbackUrl = new URL("/original.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
  },
};
