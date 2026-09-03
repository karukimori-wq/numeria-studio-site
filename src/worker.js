import { createUsageSnapshot, evaluateUsageLimit, getBillingMonth, normalizePlanId, PLAN_CONFIG, PLAN_IDS } from "./plan-config.js";

const APP_VERSION = "0.3.1-release-monitoring";
const PLAN_CONTRACT_VERSION = "free-pro-business-preparing.v1";

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
        appraisalClients: PLAN_CONFIG.free.entitlements.appraisalClients,
      },
      pro: {
        available: true,
        monthlyAppraisals: "unlimited",
        appraisalClients: "unlimited",
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

  if (url.pathname === "/api/usage" && request.method === "GET") {
    return json({ status: "success", workspaceId, userId, usage: usageResponse(record) });
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
      sourceOfTruth: "numeria-appraisal-client-snapshot",
      usage: usageResponse(record),
    }, { status: 201 });
  }

  if (url.pathname === "/api/sessions/start" && request.method === "POST") {
    const snapshot = usageResponse(record);
    const decision = evaluateUsageLimit(snapshot, "start_appraisal");
    if (!decision.allowed) {
      return json({ status: "error", errorCode: decision.reason, message: decision.message, upgradeBenefit: decision.upgradeBenefit, usage: snapshot }, { status: 402 });
    }
    record.monthlyAppraisals += 1;
    runtimeStore.set(scopeKey(workspaceId, userId, record.billingMonth), record);
    return json({
      status: "success",
      sessionId: `ses_${Date.now()}`,
      sessionStatus: "started",
      eventName: "studio.session.started.v1",
      usage: usageResponse(record),
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
