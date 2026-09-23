import secureWorker from "./secure-worker-entry.js";
import {
  AI_ASSIST_CONTRACT,
  aiPlatformCoreBaseUrl,
  hasForbiddenAiAssistPayload,
  runBasicAiAssist,
  sanitizeAiAssistInput,
} from "./ai-assist-proxy.js";

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

function workspaceIdFrom(request) {
  const url = new URL(request.url);
  return request.headers.get("X-Workspace-Id") || url.searchParams.get("workspaceId") || "ws_personal";
}

function authHeaders(request, workspaceId) {
  const headers = new Headers();
  const authorization = request.headers.get("Authorization");
  const publishableKey = request.headers.get("X-Clerk-Publishable-Key");
  if (authorization) headers.set("Authorization", authorization);
  if (publishableKey) headers.set("X-Clerk-Publishable-Key", publishableKey);
  headers.set("X-Workspace-Id", workspaceId);
  return headers;
}

async function resolveAuthenticatedScope(request, env, ctx) {
  const workspaceId = workspaceIdFrom(request);
  const headers = authHeaders(request, workspaceId);

  const authUrl = new URL(request.url);
  authUrl.pathname = "/auth/status";
  authUrl.search = "";
  const authResponse = await secureWorker.fetch(new Request(authUrl.toString(), { method: "GET", headers }), env, ctx);
  const authBody = await authResponse.clone().json().catch(() => ({}));
  if (!authResponse.ok || authBody.incomingRequestVerified !== true) {
    return { ok: false, status: 401, workspaceId, message: "Clerkのログインセッションを確認できませんでした。" };
  }

  const usageUrl = new URL(request.url);
  usageUrl.pathname = "/api/usage";
  usageUrl.search = `?workspaceId=${encodeURIComponent(workspaceId)}`;
  const usageResponse = await secureWorker.fetch(new Request(usageUrl.toString(), { method: "GET", headers }), env, ctx);
  const usageBody = await usageResponse.clone().json().catch(() => ({}));
  const userId = String(usageBody.userId || "").trim();
  if (!usageResponse.ok || !userId || userId === "anonymous") {
    return { ok: false, status: 401, workspaceId, message: "認証済みユーザーIDを確認できませんでした。" };
  }

  const billingUrl = new URL(request.url);
  billingUrl.pathname = "/api/billing/subscription";
  billingUrl.search = `?workspaceId=${encodeURIComponent(workspaceId)}`;
  const billingResponse = await secureWorker.fetch(new Request(billingUrl.toString(), { method: "GET", headers }), env, ctx);
  const billingBody = await billingResponse.clone().json().catch(() => ({}));
  const planId = String(billingBody?.subscription?.planId || usageBody.planId || "free").toLowerCase();
  if (!billingResponse.ok) {
    return { ok: false, status: 503, workspaceId, userId, message: "契約状態を確認できませんでした。" };
  }
  if (!AI_ASSIST_CONTRACT.plans.includes(planId)) {
    return { ok: false, status: 403, workspaceId, userId, planId, message: "現在のリリースではFreeまたはProのAI補助を利用してください。" };
  }

  return { ok: true, workspaceId, userId, planId };
}

async function handleAiAssist(request, env, ctx) {
  const scope = await resolveAuthenticatedScope(request, env, ctx);
  if (!scope.ok) return json({ status: "error", errorCode: "AI_ASSIST_AUTH_OR_PLAN_FAILED", message: scope.message }, { status: scope.status });

  const body = await request.json().catch(() => ({}));
  if (hasForbiddenAiAssistPayload(body)) {
    return json({
      status: "error",
      errorCode: "AI_ASSIST_FORBIDDEN_PAYLOAD",
      message: "AI補助には氏名・出生名・生年月日・メール・全文Report・支払い情報を送信できません。",
    }, { status: 400 });
  }

  const input = sanitizeAiAssistInput(body);
  if (Object.keys(input.coreNumbers).length === 0) {
    return json({ status: "error", errorCode: "AI_ASSIST_CALCULATED_VALUES_REQUIRED", message: "計算済みの鑑定値が必要です。" }, { status: 400 });
  }

  const correlationId = request.headers.get("X-Correlation-Id") || `num_ai_${Date.now()}`;
  const result = await runBasicAiAssist({ env, ...scope, input, correlationId });
  if (!result.ok) {
    const gatewayMessage = result.gateway?.message || result.gateway?.error?.message || "AI Platform CoreでAI補助を実行できませんでした。";
    return json({
      status: "error",
      errorCode: result.gateway?.errorCode || result.gateway?.error?.code || "APC_AI_ASSIST_FAILED",
      message: gatewayMessage,
      activityId: result.activityId,
      capability: result.capability,
    }, { status: result.status || 502 });
  }

  return json({
    status: "success",
    activityId: result.activityId,
    capability: result.capability,
    planId: scope.planId,
    output: result.output,
    dataPolicy: AI_ASSIST_CONTRACT.dataPolicy,
  });
}

function aiAssistStatus(env = {}) {
  return {
    status: "success",
    appId: "numeria-studio",
    contract: AI_ASSIST_CONTRACT,
    apcBaseUrlConfigured: Boolean(aiPlatformCoreBaseUrl(env)),
    serverProxyOnly: true,
    clerkSessionRequired: true,
    subscriptionPlanSource: "numeria-worker-billing-subscription",
    providerKeysExposedToBrowser: false,
    forbiddenPersonalFields: ["name", "birthName", "birthday", "email", "fullReportBody", "paymentDetails"],
    secretValuesReturned: false,
  };
}

export default {
  async fetch(request, env = {}, ctx = null) {
    const url = new URL(request.url);
    if (url.pathname === "/ai-assist/status" && request.method === "GET") return json(aiAssistStatus(env));
    if (url.pathname === "/api/ai/assist" && request.method === "POST") return handleAiAssist(request, env, ctx);
    return secureWorker.fetch(request, env, ctx);
  },
};
