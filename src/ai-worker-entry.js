import secureWorker from "./secure-worker-entry.js";
import {
  AI_ASSIST_CONTRACT,
  aiPlatformCoreBaseUrl,
  fetchAiPlatformCore,
  hasAiPlatformCoreServiceBinding,
  hasForbiddenAiAssistPayload,
  runBasicAiAssist,
  sanitizeAiAssistInput,
} from "./ai-assist-proxy.js";
import {
  AI_REPORT_GENERATION_CONTRACT,
  createStudioAiReportRequest,
  evaluateAiReportPlanGate,
  hasForbiddenAiReportPayload,
  normalizeStructuredReportDraft,
  requestAiReportGeneration,
  validateStructuredReportDraft,
  validateStudioAiReportRequest,
} from "./ai-report-generation-contract.js";
import {
  GROWTH_SUBSCRIPTION_CONTRACT,
  fetchGrowthSubscriptionEntitlement,
  hasGrowthEngineServiceBinding,
  hasPlatformSubscriptionSecret,
  readGrowthSubscriptionStatus,
} from "./growth-subscription-source.js";

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

async function resolveAuthenticatedIdentity(request, env, ctx) {
  const workspaceId = workspaceIdFrom(request);
  const headers = authHeaders(request, workspaceId);

  const authUrl = new URL(request.url);
  authUrl.pathname = "/auth/status";
  authUrl.search = "";
  const authResponse = await secureWorker.fetch(new Request(authUrl.toString(), { method: "GET", headers }), env, ctx);
  const authBody = await authResponse.clone().json().catch(() => ({}));
  if (!authResponse.ok || authBody.incomingRequestVerified !== true) {
    return { ok: false, status: 401, workspaceId, headers, message: "Clerkのログインセッションを確認できませんでした。" };
  }

  const usageUrl = new URL(request.url);
  usageUrl.pathname = "/api/usage";
  usageUrl.search = `?workspaceId=${encodeURIComponent(workspaceId)}`;
  const usageResponse = await secureWorker.fetch(new Request(usageUrl.toString(), { method: "GET", headers }), env, ctx);
  const usageBody = await usageResponse.clone().json().catch(() => ({}));
  const userId = String(usageBody.userId || "").trim();
  if (!usageResponse.ok || !userId || userId === "anonymous") {
    return { ok: false, status: 401, workspaceId, headers, message: "認証済みユーザーIDを確認できませんでした。" };
  }

  return {
    ok: true,
    status: 200,
    workspaceId,
    userId,
    localPlanId: String(usageBody.planId || "free").toLowerCase() === "pro" ? "pro" : "free",
    headers,
  };
}

async function resolveEffectiveSubscription(identity, env = {}) {
  const canonical = await fetchGrowthSubscriptionEntitlement(env, {
    workspaceId: identity.workspaceId,
    ownerUserId: identity.userId,
  });
  if (canonical.ok && canonical.entitlement) {
    return {
      planId: canonical.entitlement.planId,
      canonicalReady: true,
      source: "growth-engine",
      entitlement: canonical.entitlement,
      fallbackReason: null,
    };
  }
  return {
    planId: identity.localPlanId,
    canonicalReady: false,
    source: "numeria-worker-mvp-fallback",
    entitlement: null,
    fallbackReason: canonical.reason || "GROWTH_SUBSCRIPTION_UNAVAILABLE",
  };
}

async function readInnerBillingSubscription(request, identity, env, ctx) {
  const billingUrl = new URL(request.url);
  billingUrl.pathname = "/api/billing/subscription";
  billingUrl.search = `?workspaceId=${encodeURIComponent(identity.workspaceId)}`;
  const response = await secureWorker.fetch(new Request(billingUrl.toString(), { method: "GET", headers: identity.headers }), env, ctx);
  const body = await response.clone().json().catch(() => ({}));
  return { response, body };
}

async function handleBillingSubscription(request, env, ctx) {
  const identity = await resolveAuthenticatedIdentity(request, env, ctx);
  if (!identity.ok) return json({ status: "error", errorCode: "SUBSCRIPTION_AUTH_FAILED", message: identity.message }, { status: identity.status });

  const [inner, effective] = await Promise.all([
    readInnerBillingSubscription(request, identity, env, ctx),
    resolveEffectiveSubscription(identity, env),
  ]);
  if (!inner.response.ok) return inner.response;

  const subscription = effective.canonicalReady
    ? {
        ...(inner.body.subscription || {}),
        workspaceId: identity.workspaceId,
        userId: identity.userId,
        planId: effective.planId,
        subscriptionStatus: effective.entitlement.subscriptionStatus,
        entitlementStatus: effective.entitlement.entitlementStatus,
        validUntil: effective.entitlement.validUntil,
        entitlementRef: effective.entitlement.entitlementRef,
        updatedAt: effective.entitlement.updatedAt,
        source: "growth-engine",
      }
    : inner.body.subscription;

  return json({
    ...inner.body,
    subscription,
    effectivePlanId: effective.planId,
    canonicalSubscription: {
      requiredForProduction: true,
      ready: effective.canonicalReady,
      source: effective.source,
      fallbackReason: effective.fallbackReason,
      contract: GROWTH_SUBSCRIPTION_CONTRACT,
      paymentDetailsReturned: false,
      rawStripeObjectsReturned: false,
      secretValuesReturned: false,
    },
  });
}

async function resolveAuthenticatedScope(request, env, ctx) {
  const identity = await resolveAuthenticatedIdentity(request, env, ctx);
  if (!identity.ok) return identity;
  const subscription = await resolveEffectiveSubscription(identity, env);
  const planId = subscription.planId;
  if (!AI_ASSIST_CONTRACT.plans.includes(planId)) {
    return { ok: false, status: 403, workspaceId: identity.workspaceId, userId: identity.userId, planId, message: "現在のリリースではFreeまたはProのAI補助を利用してください。" };
  }
  return { ...identity, planId, subscription };
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
    subscriptionSource: scope.subscription.source,
    output: result.output,
    dataPolicy: AI_ASSIST_CONTRACT.dataPolicy,
  });
}

async function handleAiReportGeneration(request, env, ctx) {
  const scope = await resolveAuthenticatedScope(request, env, ctx);
  if (!scope.ok) return json({ status: "error", errorCode: "AI_REPORT_AUTH_OR_PLAN_FAILED", message: scope.message }, { status: scope.status });

  const body = await request.json().catch(() => ({}));
  if (hasForbiddenAiReportPayload(body)) {
    return json({
      status: "error",
      errorCode: "AI_REPORT_FORBIDDEN_PAYLOAD",
      message: "AI鑑定書生成には支払い・売上・Stripe・秘密情報・Growth Engine顧客正本・会話全文を送信できません。",
    }, { status: 400 });
  }

  const payload = createStudioAiReportRequest({
    scope,
    body,
    appVersion: AI_ASSIST_CONTRACT.appVersion,
  });
  const validation = validateStudioAiReportRequest(payload);
  if (!validation.ok) {
    return json({
      status: "error",
      errorCode: validation.errorCode,
      message: "AI鑑定書生成には、Numeria側で確定済みの依頼内容・占術・鑑定結果・出力形式が必要です。",
      missing: validation.missing,
    }, { status: 400 });
  }

  const planGate = evaluateAiReportPlanGate(payload);
  if (!planGate.allowed) {
    return json({
      status: "error",
      errorCode: planGate.errorCode,
      message: planGate.message,
      featureKey: AI_REPORT_GENERATION_CONTRACT.featureKey,
      finalDefense: "AI Platform Core also enforces featureKey entitlement.",
    }, { status: 403 });
  }

  const generation = await requestAiReportGeneration({ fetchAiPlatformCore, env, payload });
  if (!generation.response.ok) {
    const error = generation.body?.error || {};
    return json({
      status: "error",
      errorCode: error.code || generation.body?.errorCode || "APC_AI_REPORT_GENERATION_FAILED",
      message: error.message || generation.body?.message || "AI Platform CoreでAI鑑定書を生成できませんでした。",
      retryable: error.retryable === true,
      correlationId: payload.correlationId,
      generationId: generation.body?.generationId || null,
    }, { status: generation.response.status || 502 });
  }

  const aiDraft = normalizeStructuredReportDraft(generation.body, payload);
  const draftValidation = validateStructuredReportDraft(aiDraft);
  if (!draftValidation.ok) {
    return json({
      status: "error",
      errorCode: "APC_STRUCTURED_REPORT_INVALID",
      message: "AI Platform CoreのStructured ReportがNumeriaのAI Draft要件を満たしていません。",
      missing: draftValidation.missing,
      correlationId: payload.correlationId,
    }, { status: 502 });
  }

  return json({
    status: "success",
    aiDraft,
    planId: scope.planId,
    subscriptionSource: scope.subscription.source,
    featureKey: AI_REPORT_GENERATION_CONTRACT.featureKey,
    formalReportCreated: false,
    reportSnapshotSaved: false,
    eventEmitted: false,
    nextStep: "fortune_teller_review_edit_finalize",
  });
}

async function readApcProviderReadiness(env = {}) {
  try {
    const response = await fetchAiPlatformCore(env, "/v1/providers/status", { headers: { accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    return {
      reachable: response.ok,
      transport: hasAiPlatformCoreServiceBinding(env) ? "cloudflare-service-binding" : "https-fallback",
      httpStatus: response.status,
      status: body.status || null,
      openaiConfigured: body?.providers?.openai?.configured === true,
      secretValuesExposed: body.secretValuesExposed === true,
    };
  } catch (error) {
    return {
      reachable: false,
      transport: hasAiPlatformCoreServiceBinding(env) ? "cloudflare-service-binding" : "https-fallback",
      httpStatus: null,
      status: "unreachable",
      openaiConfigured: false,
      secretValuesExposed: false,
      errorCode: String(error?.name || "FETCH_FAILED").slice(0, 80),
    };
  }
}

async function aiAssistStatus(env = {}) {
  const provider = await readApcProviderReadiness(env);
  return {
    status: "success",
    appId: "numeria-studio",
    contract: AI_ASSIST_CONTRACT,
    apcBaseUrlConfigured: Boolean(aiPlatformCoreBaseUrl(env)),
    apcServiceBindingConfigured: hasAiPlatformCoreServiceBinding(env),
    apcProvider: provider,
    aiGenerationReady: provider.reachable === true && provider.openaiConfigured === true && provider.secretValuesExposed === false,
    serverProxyOnly: true,
    clerkSessionRequired: true,
    subscriptionPlanSource: "growth-engine-when-ready",
    providerKeysExposedToBrowser: false,
    forbiddenPersonalFields: ["name", "birthName", "birthday", "email", "fullReportBody", "paymentDetails"],
    secretValuesReturned: false,
  };
}

async function aiReportStatus(env = {}) {
  const provider = await readApcProviderReadiness(env);
  return {
    status: "success",
    appId: "numeria-studio",
    contract: AI_REPORT_GENERATION_CONTRACT,
    apcBaseUrlConfigured: Boolean(aiPlatformCoreBaseUrl(env)),
    apcServiceBindingConfigured: hasAiPlatformCoreServiceBinding(env),
    apcProvider: provider,
    aiReportGenerationReady: provider.reachable === true && provider.openaiConfigured === true && provider.secretValuesExposed === false,
    serverProxyOnly: true,
    clerkSessionRequired: true,
    formalReportCreatedByApc: false,
    reportGeneratedEventTiming: "after_numeria_formal_report_snapshot_save",
    secretValuesReturned: false,
  };
}

async function subscriptionSourceStatus(env = {}) {
  const upstream = await readGrowthSubscriptionStatus(env);
  return {
    status: upstream.reachable ? "success" : "warning",
    appId: "numeria-studio",
    contract: GROWTH_SUBSCRIPTION_CONTRACT,
    serviceBindingConfigured: hasGrowthEngineServiceBinding(env),
    localIntegrationSecretConfigured: hasPlatformSubscriptionSecret(env),
    upstream,
    canonicalEntitlementReady: upstream.entitlementReadReady && hasPlatformSubscriptionSecret(env),
    checkoutReady: upstream.checkoutReady,
    localMvpFallbackEnabledUntilCanonicalReady: true,
    businessPurchasable: false,
    paymentDetailsReturned: false,
    rawStripeObjectsReturned: false,
    secretValuesReturned: false,
  };
}

export default {
  async fetch(request, env = {}, ctx = null) {
    const url = new URL(request.url);
    if (url.pathname === "/ai-assist/status" && request.method === "GET") return json(await aiAssistStatus(env));
    if (url.pathname === "/ai-report/status" && request.method === "GET") return json(await aiReportStatus(env));
    if (url.pathname === "/subscription-source/status" && request.method === "GET") return json(await subscriptionSourceStatus(env));
    if (url.pathname === "/api/billing/subscription" && request.method === "GET") return handleBillingSubscription(request, env, ctx);
    if (url.pathname === "/api/ai/assist" && request.method === "POST") return handleAiAssist(request, env, ctx);
    if (url.pathname === "/api/ai/reports/generate" && request.method === "POST") return handleAiReportGeneration(request, env, ctx);
    return secureWorker.fetch(request, env, ctx);
  },
};
