import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, isUnlimited, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";

const APP_VERSION = "0.3.2-apc-forwarding";
const PLAN_CONTRACT_VERSION = "free-pro-business-preparing.v1";
const ADMIN_CONTRACT_VERSION = "admin-mode-mvp.v1";
const AUTH_CONTRACT_VERSION = "clerk-server-auth-readiness.v1";
const AI_USAGE_CONTRACT_VERSION = "ai-platform-core-usage-events.v1";
const APC_CONTRACT_VERSION = "ai-platform-core-activity-forwarding.v1";

const runtimeStore = globalThis.__numeriaUsageStore || new Map();
globalThis.__numeriaUsageStore = runtimeStore;
const runtimeAiUsageEvents = globalThis.__numeriaAiUsageEvents || [];
globalThis.__numeriaAiUsageEvents = runtimeAiUsageEvents;

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

function createReportSnapshot({ exportId, reportType, branding, body = {} }) {
  return {
    exportId,
    reportType,
    branding,
    clientName: String(body.clientName || "未設定").trim(),
    birthDate: String(body.birthDate || "").trim(),
    lifePathNumber: body.lifePathNumber || null,
    question: String(body.question || "").trim(),
    resultSummary: String(body.resultSummary || "").trim(),
    notes: reportType === "detailed" ? String(body.notes || "").trim() : "",
  };
}

function createReportPdfBase64({ exportId, reportType, branding, body = {} }) {
  const title = reportType === "detailed" ? "Numeria Studio Detailed Report" : "Numeria Studio Basic Report";
  const lines = [
    title,
    branding === "hidden" ? "Branding: Hidden" : "Branding: Numeria Studio",
    `Export ID: ${exportId}`,
    `Client: ${asciiPdfText(body.clientName)}`,
    `Birth Date: ${asciiPdfText(body.birthDate, "Not provided")}`,
    `Life Path: ${asciiPdfText(body.lifePathNumber ? `LP${body.lifePathNumber}` : "", "Not calculated")}`,
    `Question: ${asciiPdfText(body.question, "No question provided")}`,
    `Result: ${asciiPdfText(body.resultSummary, "No result summary provided")}`,
    reportType === "detailed"
      ? `Notes: ${asciiPdfText(body.notes, "No notes provided")}`
      : "Report Type: Basic",
  ];
  const contentLines = [
    "q 0.12 0.09 0.20 rg 0 742 612 50 re f Q",
    "q 0.73 0.58 0.20 RG 54 728 504 1 re f Q",
    "1 1 1 rg",
    `BT /F1 20 Tf 54 760 Td (${escapePdfText(lines[0])}) Tj ET`,
    "0.08 0.07 0.12 rg",
    `BT /F1 11 Tf 54 714 Td (${escapePdfText(lines[1])}) Tj ET`,
    `BT /F1 9 Tf 420 714 Td (${escapePdfText(lines[2])}) Tj ET`,
    "q 0.73 0.58 0.20 RG 54 684 504 1 re f Q",
    "BT /F1 14 Tf 54 660 Td (Report Details) Tj ET",
    `BT /F1 12 Tf 54 620 Td (${escapePdfText(lines[3])}) Tj ET`,
    `BT /F1 12 Tf 54 585 Td (${escapePdfText(lines[4])}) Tj ET`,
    `BT /F1 12 Tf 54 550 Td (${escapePdfText(lines[5])}) Tj ET`,
    "q 0.85 0.83 0.88 RG 54 522 504 1 re f Q",
    `BT /F1 12 Tf 54 485 Td (${escapePdfText(lines[6])}) Tj ET`,
    `BT /F1 12 Tf 54 435 Td (${escapePdfText(lines[7])}) Tj ET`,
    "q 0.85 0.83 0.88 RG 54 405 504 1 re f Q",
    `BT /F1 9 Tf 54 52 Td (${escapePdfText(lines[8])}) Tj ET`,
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

async function releaseStatusResponse(env = {}) {
  const persistence = await persistenceStatusResponse(env);
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
      "Server-side auth readiness contract",
      "Server-side Clerk JWT verification in observe/enforce modes",
      "AI Platform Core usage event contract",
      "AI Platform Core usage event forwarding",
    ],
    pendingFeatures: [
      "Stripe real subscription sync",
      "Growth Engine Business handoff",
      "Production-grade PDF template rendering",
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
      businessPurchasable: false,
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
  const planId = normalizePlanId(targetRecord.planId);
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
      source: "numeria-worker-mvp",
    },
    usage: usageResponse(targetRecord),
    limits: plan.entitlements,
    historyPolicy: {
      visibleCompletedAppraisals: plan.entitlements.viewableCompletedAppraisals,
      lockedDetailsAreRetained: true,
    },
  };
}

async function contractsStatusResponse(env = {}) {
  const persistence = await persistenceStatusResponse(env);
  const auth = await authStatusResponse(new Request("https://local.test/contracts/status"), env);
  const aiUsage = aiUsageStatusResponse(env);
  const aiPlatformCore = apcStatusResponse(env);
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

  return {
    status: serverVerificationReady || enforcementMode === "observe" ? "success" : "warning",
    appId: "numeria-studio",
    appVersion: APP_VERSION,
    authProvider: "clerk",
    authContractVersion: AUTH_CONTRACT_VERSION,
    clientAuthReady: Boolean(publishableKey),
    serverVerificationReady,
    serverVerificationMethod: jwksUrl ? "jwks-rs256" : "not-configured",
    enforcementMode,
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

  const { workspaceId, userId } = getScope(request, body, auth);
  const record = await loadUsageRecord(env, workspaceId, userId);

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

  if (url.pathname === "/api/usage" && request.method === "GET") {
    const usage = usageResponse(record);
    return json({ status: "success", workspaceId, userId, usage, historyPolicy: { visibleCompletedAppraisals: usage.entitlements.viewableCompletedAppraisals, lockedDetailsAreRetained: true } });
  }

  if (url.pathname === "/api/appraisals/status" && request.method === "GET") {
    const usage = usageResponse(record);
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
    return json({
      status: "success",
      workspaceId,
      userId,
      subscription: {
        planId: record.planId,
        billingStatus: record.planId === PLAN_IDS.FREE ? "free" : "active",
        currentPeriod: record.billingMonth,
        source: "numeria-worker-mvp",
      },
    });
  }

  if (url.pathname === "/api/billing/subscription" && request.method === "PATCH") {
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
    const snapshot = usageResponse(record);
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
      usage: usageResponse(record),
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
        usage: usageResponse(record),
      }, { status: 404 });
    }

    if (request.method === "DELETE") {
      record.appraisalClientProfiles = profiles.filter((profile) => profile.id !== profileId);
      record.appraisalClients = record.appraisalClientProfiles.length;
      await saveUsageRecord(env, workspaceId, userId, record);
      return json({
        status: "success",
        deletedAppraisalClientRef: profileId,
        usage: usageResponse(record),
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
      usage: usageResponse(record),
    });
  }

  if (url.pathname === "/api/sessions/start" && request.method === "POST") {
    const sessionId = body.sessionId || `ses_${Date.now()}`;
    await saveUsageRecord(env, workspaceId, userId, record);
    const usage = usageResponse(record);
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
      countPolicy: "completion-button-only",
      draftPolicy: "not-counted-until-draft-save",
      usage,
    }, { status: 201 });
  }

  if (url.pathname === "/api/appraisals/save-draft" && request.method === "POST") {
    const snapshot = usageResponse(record);
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
      updatedAt: new Date().toISOString(),
    };
    record.inProgressAppraisals = record.activeDraft ? 1 : 0;
    await saveUsageRecord(env, workspaceId, userId, record);
    return json({
      status: "success",
      draftId: appraisalId,
      activeDraft: record.activeDraft,
      limitPolicy: "free-one-in-progress-appraisal",
      usage: usageResponse(record),
    }, { status: 201 });
  }

  if (url.pathname === "/api/appraisals/complete" && request.method === "POST") {
    const snapshot = usageResponse(record);
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
    const aiUsageEvent = createAiUsageEvent({
      eventName: "studio.session.completed.v1",
      workspaceId,
      userId,
      planId: record.planId,
      featureKey: "appraisal_completion",
      correlationId: appraisalId,
    });
    const aiUsageDelivery = await recordAiUsageEvent(env, aiUsageEvent);
    const updatedUsage = usageResponse(record);
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
    const snapshot = usageResponse(record);
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
    const aiUsageEvent = createAiUsageEvent({
      eventName: "studio.report.generated.v1",
      workspaceId,
      userId,
      planId: record.planId,
      featureKey: `report_export_${reportType}`,
      correlationId: exportId,
    });
    const aiUsageDelivery = await recordAiUsageEvent(env, aiUsageEvent);
    const updatedUsage = usageResponse(record);
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
      return json(await releaseStatusResponse(env));
    }
    if (url.pathname === "/apc/status") {
      return json(apcStatusResponse(env));
    }
    if (url.pathname === "/auth/status") {
      return json(await authStatusResponse(request, env));
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
