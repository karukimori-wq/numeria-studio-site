import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";

const APP_VERSION = "0.3.1-release-monitoring";
const PLAN_CONTRACT_VERSION = "free-pro-business-preparing.v1";
const ADMIN_CONTRACT_VERSION = "admin-mode-mvp.v1";

const runtimeStore = globalThis.__numeriaUsageStore || new Map();
globalThis.__numeriaUsageStore = runtimeStore;

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

function getScope(request, body = {}) {
  const url = new URL(request.url);
  return {
    workspaceId: body.workspaceId || request.headers.get("X-Workspace-Id") || url.searchParams.get("workspaceId") || "ws_personal",
    userId: body.userId || request.headers.get("X-User-Id") || url.searchParams.get("userId") || "anonymous",
  };
}

function getRecord(workspaceId, userId) {
  const billingMonth = getBillingMonth();
  const key = scopeKey(workspaceId, userId, billingMonth);
  const current = runtimeStore.get(key) || {
    planId: PLAN_IDS.FREE,
    monthlyAppraisals: 0,
    appraisalClients: 0,
    billingMonth,
    inProgressAppraisals: 0,
    activeDraft: null,
    completedAppraisalIds: [],
    completedAppraisals: [],
  };
  runtimeStore.set(key, current);
  return current;
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

function adminAccountResponse(request, env = {}, body = {}) {
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
  const targetRecord = getRecord(targetWorkspaceId, targetUserId);
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

function contractsStatusResponse() {
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
        appraisalClients: "unlimited",
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

async function handleApi(request, env = {}) {
  const url = new URL(request.url);
  const body = await readJson(request);
  const { workspaceId, userId } = getScope(request, body);
  const record = getRecord(workspaceId, userId);

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
    const adminAccount = adminAccountResponse(request, env, body);
    return json(adminAccount, { status: adminAccount.adminMode ? 200 : 403 });
  }

  if (url.pathname === "/api/usage" && request.method === "GET") {
    return json({ status: "success", workspaceId, userId, usage: usageResponse(record), historyPolicy: { visibleCompletedAppraisals: PLAN_CONFIG.free.entitlements.viewableCompletedAppraisals, lockedDetailsAreRetained: true } });
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
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
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
    record.appraisalClients += 1;
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
    return json({
      status: "success",
      appraisalClientRef: `acl_${Date.now()}`,
      sourceOfTruth: "numeria-appraisal-client-profile",
      limitPolicy: "profile-count-unlimited",
      usage: usageResponse(record),
    }, { status: 201 });
  }

  if (url.pathname === "/api/sessions/start" && request.method === "POST") {
    const sessionId = body.sessionId || `ses_${Date.now()}`;
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
    return json({
      status: "success",
      sessionId,
      sessionStatus: "started",
      eventName: "studio.session.started.v1",
      countPolicy: "completion-button-only",
      draftPolicy: "not-counted-until-draft-save",
      usage: usageResponse(record),
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
      question: String(body.question || currentDraft?.question || "").trim(),
      notes: String(body.notes || currentDraft?.notes || "").trim(),
      resultSummary: String(body.resultSummary || currentDraft?.resultSummary || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    record.inProgressAppraisals = record.activeDraft ? 1 : 0;
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
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
    const completedAt = new Date().toISOString();
    const currentDraft = record.activeDraft;
    const completedAppraisal = {
      id: appraisalId,
      clientName: String(body.clientName || currentDraft?.clientName || "未設定").trim(),
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
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
    return json({
      status: "success",
      appraisalId,
      appraisal: completedAppraisal,
      sessionStatus: "completed",
      eventName: "studio.session.completed.v1",
      countPolicy: "appraisal_completed_button",
      historyPolicy: { visibleCompletedAppraisals: 3, lockedDetailsAreRetained: true },
      usage: usageResponse(record),
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
    return json({
      status: "success",
      exportId,
      format,
      reportType,
      branding: removeBranding ? "hidden" : "numeria-logo-included",
      fileName: `numeria-${reportType}-report-${exportId}.pdf`,
      downloadPolicy: "mvp-export-contract",
      message: "PDF出力を受け付けました。実PDF生成は次の実装ステップで接続します。",
      usage: snapshot,
    }, { status: 201 });
  }

  return json({ status: "error", errorCode: "NOT_FOUND", message: "API endpoint not found." }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json(healthResponse());
    }
    if (url.pathname === "/version") {
      return json(versionResponse());
    }
    if (url.pathname === "/contracts/status") {
      return json(contractsStatusResponse());
    }
    if (url.pathname === "/clerk.browser.js" && (request.method === "GET" || request.method === "HEAD")) {
      return clerkBrowserScriptResponse(request, env);
    }
    if (/^\/[A-Za-z0-9_-]+_clerk\.browser_[A-Za-z0-9]+_[0-9.]+\.js$/.test(url.pathname)
      && (request.method === "GET" || request.method === "HEAD")) {
      return clerkBrowserAssetResponse(request, env);
    }
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
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
