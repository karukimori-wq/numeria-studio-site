import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import worker from "../src/worker.js";

class MockD1 {
  constructor() {
    this.usageRecords = new Map();
    this.reportEvents = new Map();
    this.tables = new Set(["usage_records", "report_events"]);
  }

  prepare(sql) {
    return new MockD1Statement(this, sql);
  }
}

class MockD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM usage_records")) {
      return this.db.usageRecords.get(this.args[0]) || null;
    }
    return null;
  }

  async all() {
    if (this.sql.includes("sqlite_master")) {
      return {
        results: this.args
          .filter((name) => this.db.tables.has(name))
          .map((name) => ({ name })),
      };
    }

    return { results: [] };
  }

  async run() {
    if (this.sql.includes("INTO usage_records")) {
      const [
        scopeKey,
        workspaceId,
        userId,
        billingMonth,
        planId,
        monthlyAppraisals,
        appraisalClients,
        inProgressAppraisals,
        appraisalClientProfilesJson,
        activeDraftJson,
        completedAppraisalIdsJson,
        completedAppraisalsJson,
        reportExportsJson,
        updatedAt,
      ] = this.args;
      const existing = this.db.usageRecords.get(scopeKey) || {
        created_at: "2026-09-09T00:00:00.000Z",
      };
      this.db.usageRecords.set(scopeKey, {
        ...existing,
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        billing_month: billingMonth,
        plan_id: planId,
        monthly_appraisals: monthlyAppraisals,
        appraisal_clients: appraisalClients,
        in_progress_appraisals: inProgressAppraisals,
        appraisal_client_profiles_json: appraisalClientProfilesJson,
        active_draft_json: activeDraftJson,
        completed_appraisal_ids_json: completedAppraisalIdsJson,
        completed_appraisals_json: completedAppraisalsJson,
        report_exports_json: reportExportsJson,
        updated_at: updatedAt,
      });
      return { success: true };
    }

    if (this.sql.includes("INTO report_events")) {
      const [
        eventId,
        scopeKey,
        workspaceId,
        userId,
        appraisalId,
        reportType,
        format,
        branding,
        eventName,
        generatedAt,
      ] = this.args;
      this.db.reportEvents.set(eventId, {
        event_id: eventId,
        scope_key: scopeKey,
        workspace_id: workspaceId,
        user_id: userId,
        appraisal_id: appraisalId,
        report_type: reportType,
        format,
        branding,
        event_name: eventName,
        generated_at: generatedAt,
      });
      return { success: true };
    }

    return { success: true };
  }
}

async function jsonFetch(path, options = {}, env) {
  const response = await worker.fetch(new Request(`https://local.test${path}`, options), env);
  const body = await response.json();
  return { response, body };
}

const subtle = globalThis.crypto?.subtle || webcrypto.subtle;

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createSignedJwt(privateKey, header, payload) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function createTestClerkJwt() {
  const keyPair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await subtle.exportKey("jwk", keyPair.publicKey);
  publicJwk.kid = "test-key";
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  const now = Math.floor(Date.now() / 1000);
  const token = await createSignedJwt(
    keyPair.privateKey,
    { kid: "test-key", alg: "RS256", typ: "JWT" },
    {
      sub: "clerk_user_1",
      sid: "sess_1",
      iss: "https://clerk.test",
      nbf: now - 60,
      exp: now + 3600,
    },
  );
  return { token, publicJwk };
}

const db = new MockD1();
const env = { NUMERIA_DB: db };
const headers = {
  "content-type": "application/json",
  "x-workspace-id": "d1_ws",
  "x-user-id": "d1_user",
};

const persistence = await jsonFetch("/persistence/status", {}, env);
assert.equal(persistence.body.storageDriver, "durable-d1");
assert.equal(persistence.body.durable, true);
assert.ok(persistence.body.retainedDataClasses.includes("appraisalClientProfiles"));

const releaseStatus = await jsonFetch("/release/status", {}, env);
assert.equal(releaseStatus.response.status, 200);
assert.equal(releaseStatus.body.releaseScope, "free-pro");
assert.ok(releaseStatus.body.completedFeatures.includes("D1 persistence for usage, drafts, appraisal client profiles, completed appraisals, and report exports"));
assert.ok(releaseStatus.body.completedFeatures.includes("Selectable and editable appraisal client profile chips"));
assert.ok(releaseStatus.body.completedFeatures.includes("Numerology calculation preview while writing appraisals"));
assert.ok(releaseStatus.body.completedFeatures.includes("Server-side auth readiness contract"));
assert.ok(releaseStatus.body.completedFeatures.includes("Server-side Clerk JWT verification in observe/enforce modes"));
assert.ok(releaseStatus.body.completedFeatures.includes("Billing source readiness contract"));
assert.ok(releaseStatus.body.completedFeatures.includes("External billing read-only guard"));
assert.ok(releaseStatus.body.completedFeatures.includes("Custom domain readiness contract"));
assert.ok(releaseStatus.body.completedFeatures.includes("AI Platform Core usage event contract"));
assert.ok(releaseStatus.body.completedFeatures.includes("AI Platform Core usage event forwarding"));
assert.ok(releaseStatus.body.pendingFeatures.includes("Live Growth Engine or Stripe subscription credential confirmation"));
assert.ok(releaseStatus.body.pendingFeatures.includes("Clerk enforce-mode production rollout after token header confirmation"));
assert.equal(releaseStatus.body.checks.auth.statusEndpoint, "/auth/status");
assert.equal(releaseStatus.body.checks.auth.enforcementMode, "observe");
assert.equal(releaseStatus.body.checks.domain.statusEndpoint, "/domain/status");
assert.equal(releaseStatus.body.checks.domain.currentRoute, "unknown-host");
assert.equal(releaseStatus.body.checks.domain.secretValuesReturned, false);
assert.equal(releaseStatus.body.checks.aiUsage.statusEndpoint, "/ai-usage/status");
assert.equal(releaseStatus.body.checks.billing.statusEndpoint, "/billing/status");
assert.equal(releaseStatus.body.checks.billing.secretValuesReturned, false);
assert.equal(releaseStatus.body.checks.growthEngineHandoff.statusEndpoint, "/growth-handoff/status");
assert.equal(releaseStatus.body.checks.growthEngineHandoff.receiverReady, true);
assert.equal(releaseStatus.body.checks.growthEngineHandoff.businessPurchasable, false);
assert.equal(releaseStatus.body.checks.growthEngineHandoff.queryIdentityTrustedForAuthorization, false);
assert.equal(releaseStatus.body.checks.aiPlatformCore.statusEndpoint, "/apc/status");
assert.equal(releaseStatus.body.checks.aiPlatformCore.failurePolicy, "non_blocking");
assert.ok(releaseStatus.body.deferredFeatures.includes("Business plan purchase"));

const billingStatus = await jsonFetch("/billing/status", {}, {
  ...env,
  GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
  GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
});
assert.equal(billingStatus.response.status, 200);
assert.equal(billingStatus.body.billingContractVersion, "growth-engine-stripe-subscription-readiness.v1");
assert.equal(billingStatus.body.configured, true);
assert.equal(billingStatus.body.provider, "growth-engine");
assert.equal(billingStatus.body.tokenConfigured, true);
assert.equal(billingStatus.body.timeoutMs, 1500);
assert.equal(billingStatus.body.mvpPlanSwitchingEnabled, false);
assert.equal(billingStatus.body.businessPurchasable, false);
assert.equal(billingStatus.body.secretValuesReturned, false);
assert.doesNotMatch(JSON.stringify(billingStatus.body), /growth_secret_not_returned/);

const growthHandoffStatus = await jsonFetch("/growth-handoff/status", {}, env);
assert.equal(growthHandoffStatus.response.status, 200);
assert.equal(growthHandoffStatus.body.contractVersion, "growth-engine-reservation-handoff.v1");
assert.equal(growthHandoffStatus.body.sourceApp, "growth-engine");
assert.equal(growthHandoffStatus.body.routePath, "/app/growth/start");
assert.equal(growthHandoffStatus.body.acceptedIntent, "start_appraisal_session");
assert.equal(growthHandoffStatus.body.receiverReady, true);
assert.equal(growthHandoffStatus.body.businessPurchasable, false);
assert.equal(growthHandoffStatus.body.businessFeatureEnabled, false);
assert.equal(growthHandoffStatus.body.queryIdentityTrustedForAuthorization, false);
assert.equal(growthHandoffStatus.body.externalReferencesOnly, true);
assert.equal(growthHandoffStatus.body.secretValuesReturned, false);

const feedbackHubStatus = await jsonFetch("/feedback-hub/status", {}, env);
assert.equal(feedbackHubStatus.response.status, 200);
assert.equal(feedbackHubStatus.body.feedbackHubContractVersion, "feedback-hub-free-pro-intake.v1");
assert.deepEqual(feedbackHubStatus.body.allowedPlans, ["free", "pro"]);
assert.equal(feedbackHubStatus.body.businessRequired, false);
assert.equal(feedbackHubStatus.body.billingBlocked, false);
assert.equal(feedbackHubStatus.body.secretValuesReturned, false);

const integrationsStatus = await jsonFetch("/integrations/status", {}, {
  ...env,
  GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
  GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
  FEEDBACK_HUB_SUBMIT_URL: "https://feedback-hub.karukimori.workers.dev/api/embed/feedback",
  FEEDBACK_HUB_API_TOKEN: "feedback_secret_not_returned",
  AI_PLATFORM_CORE_BASE_URL: "https://ai-platform-core.karukimori.workers.dev",
  APC_API_TOKEN: "apc_secret_not_returned",
});
assert.equal(integrationsStatus.response.status, 200);
assert.equal(integrationsStatus.body.integrationsContractVersion, "numeria-free-pro-integrations-readiness.v1");
assert.equal(integrationsStatus.body.releaseScope, "free-pro");
assert.equal(integrationsStatus.body.overallReadyForFreePro, true);
assert.equal(integrationsStatus.body.secretValuesReturned, false);
assert.ok(integrationsStatus.body.readinessItems.some((item) => item.key === "growthEngineBilling" && item.configured === true));
assert.ok(integrationsStatus.body.readinessItems.some((item) => item.key === "feedbackHub" && item.configured === true));
assert.ok(integrationsStatus.body.readinessItems.some((item) => item.key === "aiPlatformCoreActivity" && item.configured === true));
assert.doesNotMatch(JSON.stringify(integrationsStatus.body), /growth_secret_not_returned|feedback_secret_not_returned|apc_secret_not_returned/);

const feedbackFallback = await jsonFetch("/api/feedback/submit", {
  method: "POST",
  headers,
  body: JSON.stringify({
    planId: "free",
    currentScreen: "Free Pro Dashboard",
    category: "plan_or_limit_question",
    initialMessage: "Free上限の案内を改善したい",
    secret: "secret_not_returned",
    customerMaster: { name: "do not send" },
  }),
}, env);
assert.equal(feedbackFallback.response.status, 202);
assert.equal(feedbackFallback.body.accepted, true);
assert.equal(feedbackFallback.body.allowedPlans.includes("free"), true);
assert.equal(feedbackFallback.body.businessRequired, false);
assert.equal(feedbackFallback.body.billingBlocked, false);
assert.equal(feedbackFallback.body.forwarding.forwarded, false);
assert.equal(feedbackFallback.body.forwarding.reason, "FEEDBACK_HUB_NOT_CONFIGURED");
assert.equal(feedbackFallback.body.secretValuesReturned, false);
assert.doesNotMatch(JSON.stringify(feedbackFallback.body), /secret_not_returned|customerMaster|do not send/);

const feedbackFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url) === "https://feedback-hub.karukimori.workers.dev/api/embed/feedback") {
    assert.equal(init.headers.Authorization, "Bearer feedback_secret_not_returned");
    const payload = JSON.parse(init.body);
    assert.equal(payload.sourceApp, "numeria-studio");
    assert.equal(payload.planId, "pro");
    assert.equal(payload.currentScreen, "Free Pro Dashboard");
    assert.equal(payload.category, "bug_report");
    assert.doesNotMatch(JSON.stringify(payload), /feedback_secret_not_returned|secret_not_returned|customerMaster/);
    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "content-type": "application/json" },
    });
  }
  return feedbackFetch(url, init);
};

try {
  const feedbackForwarded = await jsonFetch("/api/feedback/submit", {
    method: "POST",
    headers,
    body: JSON.stringify({
      planId: "pro",
      currentScreen: "Free Pro Dashboard",
      category: "bug_report",
      initialMessage: "保存時にエラーが出ました",
      secret: "secret_not_returned",
    }),
  }, {
    ...env,
    FEEDBACK_HUB_SUBMIT_URL: "https://feedback-hub.karukimori.workers.dev/api/embed/feedback",
    FEEDBACK_HUB_API_TOKEN: "feedback_secret_not_returned",
  });
  assert.equal(feedbackForwarded.response.status, 202);
  assert.equal(feedbackForwarded.body.forwarding.forwarded, true);
  assert.equal(feedbackForwarded.body.secretValuesReturned, false);
  assert.doesNotMatch(JSON.stringify(feedbackForwarded.body), /feedback_secret_not_returned|secret_not_returned/);
} finally {
  globalThis.fetch = feedbackFetch;
}

const domainStatus = await jsonFetch("/domain/status", {}, env);
assert.equal(domainStatus.response.status, 200);
assert.equal(domainStatus.body.domainContractVersion, "cloudflare-custom-domain-readiness.v1");
assert.equal(domainStatus.body.currentRoute, "unknown-host");
assert.equal(domainStatus.body.expectedCustomDomain, "numeria-studio.com");
assert.equal(domainStatus.body.secretValuesReturned, false);

const customDomainStatus = await worker.fetch(new Request("https://numeria-studio.com/domain/status"), env);
const customDomainBody = await customDomainStatus.json();
assert.equal(customDomainStatus.status, 200);
assert.equal(customDomainBody.currentRoute, "custom-domain");
assert.equal(customDomainBody.customDomainReady, true);

const originalFetchForBilling = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const requestUrl = new URL(String(url));
  if (requestUrl.origin === "https://growth-engine.karukimori.workers.dev") {
    assert.equal(requestUrl.searchParams.get("workspaceId"), "billing_ws");
    assert.equal(requestUrl.searchParams.get("userId"), "billing_user");
    assert.equal(init.headers.Authorization, "Bearer growth_secret_not_returned");
    return new Response(JSON.stringify({
      status: "success",
      subscription: {
        planId: "pro",
        billingStatus: "active",
        currentPeriod: "2026-09",
        source: "growth-engine",
      },
    }), { headers: { "content-type": "application/json" } });
  }
  return originalFetchForBilling(url, init);
};

try {
  const externalUsage = await jsonFetch("/api/usage", {
    headers: {
      "content-type": "application/json",
      "x-workspace-id": "billing_ws",
      "x-user-id": "billing_user",
    },
  }, {
    ...env,
    GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
    GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
  });
  assert.equal(externalUsage.response.status, 200);
  assert.equal(externalUsage.body.subscriptionSource, "external");
  assert.equal(externalUsage.body.usage.planId, "pro");
  assert.equal(externalUsage.body.usage.entitlements.monthlyAppraisals, "unlimited");

  const externalSubscription = await jsonFetch("/api/billing/subscription", {
    headers: {
      "content-type": "application/json",
      "x-workspace-id": "billing_ws",
      "x-user-id": "billing_user",
    },
  }, {
    ...env,
    GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
    GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
  });
  assert.equal(externalSubscription.response.status, 200);
  assert.equal(externalSubscription.body.subscription.planId, "pro");
  assert.equal(externalSubscription.body.subscription.source, "growth-engine");
  assert.equal(externalSubscription.body.subscription.readStatus, "success");

  const externalPlanPatch = await jsonFetch("/api/billing/subscription", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": "billing_ws",
      "x-user-id": "billing_user",
    },
    body: JSON.stringify({ planId: "free" }),
  }, {
    ...env,
    GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
    GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
  });
  assert.equal(externalPlanPatch.response.status, 409);
  assert.equal(externalPlanPatch.body.errorCode, "EXTERNAL_BILLING_SOURCE_READ_ONLY");
  assert.equal(externalPlanPatch.body.billing.provider, "growth-engine");
  assert.equal(externalPlanPatch.body.billing.mvpPlanSwitchingEnabled, false);
  assert.doesNotMatch(JSON.stringify(externalPlanPatch.body), /growth_secret_not_returned/);
} finally {
  globalThis.fetch = originalFetchForBilling;
}

let authConfigBillingFetchCalled = false;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://growth-engine.karukimori.workers.dev")) {
    authConfigBillingFetchCalled = true;
    return new Response("unexpected billing fetch", { status: 500 });
  }
  return originalFetchForBilling(url, init);
};

try {
  const authConfig = await jsonFetch("/api/auth/config", {}, {
    ...env,
    GROWTH_ENGINE_BILLING_STATUS_URL: "https://growth-engine.karukimori.workers.dev/api/billing/status",
    GROWTH_ENGINE_API_TOKEN: "growth_secret_not_returned",
  });
  assert.equal(authConfig.response.status, 200);
  assert.equal(authConfigBillingFetchCalled, false);
} finally {
  globalThis.fetch = originalFetchForBilling;
}

const apcStatus = await jsonFetch("/apc/status", {}, {
  ...env,
  AI_PLATFORM_CORE_BASE_URL: "https://ai-platform-core.karukimori.workers.dev",
  APC_API_TOKEN: "apc_secret_not_returned",
});
assert.equal(apcStatus.response.status, 200);
assert.equal(apcStatus.body.apcContractVersion, "ai-platform-core-activity-forwarding.v1");
assert.equal(apcStatus.body.configured, true);
assert.equal(apcStatus.body.tokenConfigured, true);
assert.equal(apcStatus.body.secretValuesReturned, false);
assert.doesNotMatch(JSON.stringify(apcStatus.body), /apc_secret_not_returned/);

const authStatus = await jsonFetch("/auth/status", {
  headers: {
    authorization: "Bearer test-session-token",
    "x-clerk-publishable-key": "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA",
  },
}, { ...env, CLERK_SECRET_KEY: "sk_test_not_returned" });
assert.equal(authStatus.response.status, 200);
assert.equal(authStatus.body.authProvider, "clerk");
assert.equal(authStatus.body.authContractVersion, "clerk-server-auth-readiness.v1");
assert.equal(authStatus.body.clientAuthReady, true);
assert.equal(authStatus.body.serverVerificationReady, true);
assert.equal(authStatus.body.serverVerificationMethod, "jwks-rs256");
assert.equal(authStatus.body.enforceModeReady, true);
assert.equal(authStatus.body.enforceModeRollout.ready, true);
assert.equal(authStatus.body.enforceModeRollout.targetMode, "enforce");
assert.equal(authStatus.body.incomingRequestHasBearerToken, true);
assert.equal(authStatus.body.incomingRequestVerified, false);
assert.equal(authStatus.body.secretValuesReturned, false);
assert.doesNotMatch(JSON.stringify(authStatus.body), /sk_test_not_returned/);

const { token: testToken, publicJwk } = await createTestClerkJwt();
const authFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url) === "https://clerk.test/.well-known/jwks.json") {
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      headers: { "content-type": "application/json" },
    });
  }
  return authFetch(url);
};

const verifiedEnv = {
  ...env,
  CLERK_JWKS_URL: "https://clerk.test/.well-known/jwks.json",
  CLERK_JWT_ISSUER: "https://clerk.test",
};

try {
  const verifiedAuthStatus = await jsonFetch("/auth/status", {
    headers: { authorization: `Bearer ${testToken}` },
  }, verifiedEnv);
  assert.equal(verifiedAuthStatus.response.status, 200);
  assert.equal(verifiedAuthStatus.body.incomingRequestVerified, true);
  assert.equal(verifiedAuthStatus.body.incomingRequestVerificationReason, "verified");
  assert.equal(verifiedAuthStatus.body.serverVerificationMethod, "jwks-rs256");

  const blockedApi = await jsonFetch("/api/usage", {}, {
    ...verifiedEnv,
    AUTH_ENFORCEMENT_MODE: "enforce",
  });
  assert.equal(blockedApi.response.status, 401);
  assert.equal(blockedApi.body.errorCode, "AUTH_SESSION_REQUIRED");

  const verifiedApi = await jsonFetch("/api/usage", {
    headers: {
      authorization: `Bearer ${testToken}`,
      "x-workspace-id": "auth_ws",
      "x-user-id": "spoofed_user",
    },
  }, {
    ...verifiedEnv,
    AUTH_ENFORCEMENT_MODE: "enforce",
  });
  assert.equal(verifiedApi.response.status, 200);
  assert.equal(verifiedApi.body.workspaceId, "auth_ws");
  assert.equal(verifiedApi.body.userId, "clerk_user_1");
} finally {
  globalThis.fetch = authFetch;
}

const contractStatus = await jsonFetch("/contracts/status", {}, { ...env, CLERK_SECRET_KEY: "sk_test_not_returned" });
assert.equal(contractStatus.body.auth.statusEndpoint, "/auth/status");
assert.equal(contractStatus.body.auth.serverVerificationReady, true);
assert.equal(contractStatus.body.auth.secretValuesReturned, false);
assert.equal(contractStatus.body.domain.statusEndpoint, "/domain/status");
assert.equal(contractStatus.body.domain.domainContractVersion, "cloudflare-custom-domain-readiness.v1");
assert.equal(contractStatus.body.domain.expectedWorkerHost, "numeria-studio-site.karukimori.workers.dev");
assert.equal(contractStatus.body.aiUsage.statusEndpoint, "/ai-usage/status");
assert.equal(contractStatus.body.aiUsage.aiUsageContractVersion, "ai-platform-core-usage-events.v1");
assert.equal(contractStatus.body.aiUsage.endpointConfigured, false);
assert.equal(contractStatus.body.aiUsage.secretValuesReturned, false);

const draft = await jsonFetch("/api/appraisals/save-draft", {
  method: "POST",
  headers,
  body: JSON.stringify({
    appraisalId: "app_d1_1",
    clientName: "A",
    birthDate: "1990-04-19",
    lifePathNumber: 6,
    question: "相談",
    resultSummary: "結果",
  }),
}, env);
assert.equal(draft.response.status, 201);
assert.equal(draft.body.activeDraft.birthDate, "1990-04-19");
assert.equal(draft.body.activeDraft.lifePathNumber, 6);
assert.equal(db.usageRecords.size, 1);

const completed = await jsonFetch("/api/appraisals/complete", {
  method: "POST",
  headers,
  body: JSON.stringify({ appraisalId: "app_d1_1" }),
}, env);
assert.equal(completed.response.status, 201);
assert.equal(completed.body.usage.monthlyAppraisals, 1);
assert.equal(completed.body.appraisal.birthDate, "1990-04-19");
assert.equal(completed.body.appraisal.lifePathNumber, 6);
assert.equal(completed.body.aiUsageEvent.eventName, "studio.session.completed.v1");
assert.equal(completed.body.aiUsageEvent.recorded, true);
assert.equal(completed.body.aiUsageEvent.forwarded, false);
assert.equal(completed.body.aiUsageEvent.forwardingMode, "observe");
assert.equal(completed.body.aiUsageEvent.dataPolicy, "metadata-only-no-consultation-body");

const aiUsageAfterCompletion = await jsonFetch("/ai-usage/status", {}, env);
assert.equal(aiUsageAfterCompletion.response.status, 200);
assert.equal(aiUsageAfterCompletion.body.aiUsageContractVersion, "ai-platform-core-usage-events.v1");
assert.equal(aiUsageAfterCompletion.body.endpointConfigured, false);
assert.equal(aiUsageAfterCompletion.body.willForwardInCurrentMode, false);
assert.equal(aiUsageAfterCompletion.body.secretValuesReturned, false);
assert.ok(aiUsageAfterCompletion.body.retainedEventCount >= 1);
assert.equal(aiUsageAfterCompletion.body.recentEvents.at(-1).eventName, "studio.session.completed.v1");
assert.equal(aiUsageAfterCompletion.body.recentEvents.at(-1).dataPolicy, "metadata-only-no-consultation-body");
assert.doesNotMatch(JSON.stringify(aiUsageAfterCompletion.body.recentEvents.at(-1)), /相談|結果/);

const report = await jsonFetch("/api/reports/export", {
  method: "POST",
  headers,
  body: JSON.stringify({
    appraisalId: "app_d1_1",
    format: "pdf",
    reportType: "basic",
    clientName: "A",
    birthDate: "1990-04-19",
    lifePathNumber: 6,
    question: "相談",
    resultSummary: "結果",
  }),
}, env);
assert.equal(report.response.status, 201);
assert.equal(report.body.eventName, "studio.report.generated.v1");
assert.equal(report.body.reportSnapshot.birthDate, "1990-04-19");
assert.equal(report.body.reportSnapshot.lifePathNumber, 6);
assert.equal(report.body.reportSnapshot.templateVersion, "numeria-report-template.v1");
assert.equal(report.body.reportTemplateVersion, "numeria-report-template.v1");
assert.equal(report.body.usage.reportExports.length, 1);
assert.equal(db.reportEvents.size, 1);
assert.equal(report.body.aiUsageEvent.eventName, "studio.report.generated.v1");
assert.equal(report.body.aiUsageEvent.recorded, true);
assert.equal(report.body.aiUsageEvent.forwarded, false);
assert.equal(report.body.aiUsageEvent.forwardingMode, "observe");
assert.equal(report.body.aiUsageEvent.dataPolicy, "metadata-only-no-consultation-body");

const aiUsageAfterReport = await jsonFetch("/ai-usage/status", {}, env);
assert.ok(aiUsageAfterReport.body.retainedEventCount >= 2);
assert.equal(aiUsageAfterReport.body.recentEvents.at(-1).eventName, "studio.report.generated.v1");
assert.equal(aiUsageAfterReport.body.recentEvents.at(-1).featureKey, "report_export_basic");
assert.doesNotMatch(JSON.stringify(aiUsageAfterReport.body.recentEvents.at(-1)), /相談|結果/);

const usage = await jsonFetch("/api/usage", { headers }, env);
assert.equal(usage.body.usage.monthlyAppraisals, 1);
assert.equal(usage.body.usage.completedAppraisals.length, 1);
assert.equal(usage.body.usage.completedAppraisals[0].birthDate, "1990-04-19");
assert.equal(usage.body.usage.completedAppraisals[0].lifePathNumber, 6);
assert.equal(usage.body.usage.reportExports.length, 1);

const appraisalStatus = await jsonFetch("/api/appraisals/status", { headers }, env);
assert.equal(appraisalStatus.response.status, 200);
assert.equal(appraisalStatus.body.activeDraft, null);
assert.equal(appraisalStatus.body.completedAppraisals.length, 1);
assert.equal(appraisalStatus.body.visibleCompletedAppraisals.length, 1);
assert.equal(appraisalStatus.body.lockedCompletedAppraisalIds.length, 0);
assert.equal(appraisalStatus.body.reportExports.length, 1);

for (const clientIndex of [1, 2, 3]) {
  const clientResponse = await jsonFetch("/api/appraisal-clients", {
    method: "POST",
    headers,
    body: JSON.stringify({ clientName: `client_${clientIndex}`, birthDate: `1990-01-0${clientIndex}` }),
  }, env);
  assert.equal(clientResponse.response.status, 201);
  assert.equal(clientResponse.body.limitPolicy, "free-three-appraisal-client-profiles");
  assert.equal(clientResponse.body.appraisalClient.clientName, `client_${clientIndex}`);
  assert.equal(clientResponse.body.appraisalClient.birthDate, `1990-01-0${clientIndex}`);
  assert.equal(clientResponse.body.usage.appraisalClientProfiles.length, clientIndex);
}

const profileUsage = await jsonFetch("/api/usage", { headers }, env);
assert.deepEqual(
  profileUsage.body.usage.appraisalClientProfiles.map((profile) => profile.clientName),
  ["client_1", "client_2", "client_3"],
);

const editableProfile = profileUsage.body.usage.appraisalClientProfiles[1];
const updatedClient = await jsonFetch(`/api/appraisal-clients/${editableProfile.id}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ clientName: "client_2_updated", birthDate: "1991-02-03" }),
}, env);
assert.equal(updatedClient.response.status, 200);
assert.equal(updatedClient.body.appraisalClient.clientName, "client_2_updated");
assert.equal(updatedClient.body.appraisalClient.birthDate, "1991-02-03");
assert.equal(updatedClient.body.usage.appraisalClientProfiles[1].clientName, "client_2_updated");

const deletedClient = await jsonFetch(`/api/appraisal-clients/${editableProfile.id}`, {
  method: "DELETE",
  headers,
}, env);
assert.equal(deletedClient.response.status, 200);
assert.equal(deletedClient.body.usage.appraisalClients, 2);
assert.equal(deletedClient.body.usage.appraisalClientProfiles.length, 2);

const replacementClient = await jsonFetch("/api/appraisal-clients", {
  method: "POST",
  headers,
  body: JSON.stringify({ clientName: "client_replacement", birthDate: "1992-03-04" }),
}, env);
assert.equal(replacementClient.response.status, 201);
assert.equal(replacementClient.body.usage.appraisalClientProfiles.length, 3);

const blockedClient = await jsonFetch("/api/appraisal-clients", {
  method: "POST",
  headers,
  body: JSON.stringify({ clientName: "client_4" }),
}, env);
assert.equal(blockedClient.response.status, 402);
assert.equal(blockedClient.body.errorCode, "FREE_APPRAISAL_CLIENT_LIMIT");

const adminAccount = await jsonFetch("/api/admin/account", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    adminEmail: "illusionddt@gmail.com",
    targetWorkspaceId: "d1_ws",
    targetUserId: "d1_user",
  }),
}, env);
assert.equal(adminAccount.response.status, 200);
assert.equal(adminAccount.body.usage.monthlyAppraisals, 1);
assert.equal(adminAccount.body.usage.completedAppraisals.length, 1);
assert.equal(adminAccount.body.usage.reportExports.length, 1);
assert.equal(adminAccount.body.usage.appraisalClientProfiles.length, 3);

const uninitializedDb = new MockD1();
uninitializedDb.tables.delete("report_events");
const uninitialized = await jsonFetch("/persistence/status", {}, { NUMERIA_DB: uninitializedDb });
assert.equal(uninitialized.body.storageDriver, "d1-uninitialized");
assert.equal(uninitialized.body.durable, false);
assert.deepEqual(uninitialized.body.missingTables, ["report_events"]);

const policyDb = new MockD1();
const policyEnv = { NUMERIA_DB: policyDb };
const policyHeaders = {
  "content-type": "application/json",
  "x-workspace-id": "policy_ws",
  "x-user-id": "policy_user",
};

for (const clientName of ["Aさん", "Bさん", "Cさん", "Dさん"]) {
  const appraisalId = `policy_${clientName}`;
  const draftResponse = await jsonFetch("/api/appraisals/save-draft", {
    method: "POST",
    headers: policyHeaders,
    body: JSON.stringify({
      appraisalId,
      clientName,
      question: `${clientName}の相談`,
      resultSummary: `${clientName}の結果`,
    }),
  }, policyEnv);
  assert.equal(draftResponse.response.status, 201);

  const completeResponse = await jsonFetch("/api/appraisals/complete", {
    method: "POST",
    headers: policyHeaders,
    body: JSON.stringify({ appraisalId }),
  }, policyEnv);
  assert.equal(completeResponse.response.status, 201);
}

const policyStatus = await jsonFetch("/api/appraisals/status", { headers: policyHeaders }, policyEnv);
assert.equal(policyStatus.body.completedAppraisals.length, 4);
assert.equal(policyStatus.body.visibleCompletedAppraisals.length, 3);
assert.deepEqual(
  policyStatus.body.visibleCompletedAppraisals.map((appraisal) => appraisal.clientName),
  ["Bさん", "Cさん", "Dさん"],
);
assert.deepEqual(policyStatus.body.lockedCompletedAppraisalIds, ["policy_Aさん"]);

const firstDraft = await jsonFetch("/api/appraisals/save-draft", {
  method: "POST",
  headers: policyHeaders,
  body: JSON.stringify({
    appraisalId: "policy_draft_one",
    clientName: "Eさん",
  }),
}, policyEnv);
assert.equal(firstDraft.response.status, 201);

const blockedDraft = await worker.fetch(new Request("https://local.test/api/appraisals/save-draft", {
  method: "POST",
  headers: policyHeaders,
  body: JSON.stringify({
    appraisalId: "policy_draft_two",
    clientName: "Fさん",
  }),
}), policyEnv);
const blockedDraftBody = await blockedDraft.json();
assert.equal(blockedDraft.status, 402);
assert.equal(blockedDraftBody.errorCode, "FREE_IN_PROGRESS_APPRAISAL_LIMIT");

console.log("D1 persistence compatibility verified.");
