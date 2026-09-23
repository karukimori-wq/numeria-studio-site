const PRODUCT_CODE = "numeria-studio";
const DEFAULT_NUMERIA_ORIGIN = "https://numeria-studio.com";

export function hasGrowthEngineServiceBinding(env = {}) {
  return Boolean(env.GROWTH_ENGINE_SERVICE && typeof env.GROWTH_ENGINE_SERVICE.fetch === "function");
}

export function hasPlatformSubscriptionSecret(env = {}) {
  return Boolean(String(env.PLATFORM_SUBSCRIPTION_INTEGRATION_SECRET || "").trim());
}

function numeriaOrigin(env = {}) {
  const raw = String(env.NUMERIA_CANONICAL_ORIGIN || DEFAULT_NUMERIA_ORIGIN).trim().replace(/\/$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return DEFAULT_NUMERIA_ORIGIN;
    return url.origin;
  } catch {
    return DEFAULT_NUMERIA_ORIGIN;
  }
}

async function growthFetch(env = {}, path, init = {}) {
  if (hasGrowthEngineServiceBinding(env)) {
    return env.GROWTH_ENGINE_SERVICE.fetch(`https://growth-engine.internal${path}`, init);
  }
  const base = String(env.GROWTH_ENGINE_BASE_URL || "https://growth-engine.karukimori.workers.dev").replace(/\/$/, "");
  return fetch(`${base}${path}`, init);
}

function subscriptionHeaders(env = {}) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-platform-subscription-secret": String(env.PLATFORM_SUBSCRIPTION_INTEGRATION_SECRET || ""),
    "x-source-app": "numeria-studio",
  };
}

export async function readGrowthSubscriptionStatus(env = {}) {
  try {
    const response = await growthFetch(env, "/api/subscriptions/status", { headers: { accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    return {
      reachable: response.ok,
      httpStatus: response.status,
      transport: hasGrowthEngineServiceBinding(env) ? "cloudflare-service-binding" : "https-fallback",
      contract: body.contract || null,
      owner: body.owner || null,
      entitlementReadReady: body.entitlementReadReady === true,
      checkoutReady: body.checkoutReady === true,
      integrationSecretConfiguredAtSource: body.integrationSecretConfigured === true,
      businessPurchasable: body.businessPurchasable === true,
      secretValuesExposed: body.secretValuesExposed === true,
    };
  } catch (error) {
    return {
      reachable: false,
      httpStatus: null,
      transport: hasGrowthEngineServiceBinding(env) ? "cloudflare-service-binding" : "https-fallback",
      contract: null,
      owner: null,
      entitlementReadReady: false,
      checkoutReady: false,
      integrationSecretConfiguredAtSource: false,
      businessPurchasable: false,
      secretValuesExposed: false,
      errorCode: String(error?.name || "FETCH_FAILED").slice(0, 80),
    };
  }
}

export async function fetchGrowthSubscriptionEntitlement(env = {}, { workspaceId, ownerUserId }) {
  if (!hasPlatformSubscriptionSecret(env)) {
    return { ok: false, status: 503, reason: "SUBSCRIPTION_INTEGRATION_SECRET_MISSING", entitlement: null };
  }

  const query = new URLSearchParams({ workspaceId, ownerUserId, productCode: PRODUCT_CODE });
  try {
    const response = await growthFetch(env, `/api/subscriptions/entitlement?${query.toString()}`, {
      headers: subscriptionHeaders(env),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.status !== "success") {
      return { ok: false, status: response.status, reason: body.errorCode || "GROWTH_SUBSCRIPTION_UNAVAILABLE", entitlement: null };
    }
    const planId = body.planId === "pro" ? "pro" : "free";
    return {
      ok: true,
      status: response.status,
      reason: null,
      entitlement: {
        workspaceId,
        ownerUserId,
        productCode: PRODUCT_CODE,
        planId,
        subscriptionStatus: body.subscriptionStatus || "expired",
        entitlementStatus: body.entitlementStatus || "inactive",
        validUntil: body.validUntil || null,
        entitlementRef: body.entitlementRef || null,
        updatedAt: body.updatedAt || null,
        source: "growth-engine",
      },
    };
  } catch (error) {
    return { ok: false, status: 503, reason: String(error?.name || "GROWTH_SUBSCRIPTION_FETCH_FAILED").slice(0, 80), entitlement: null };
  }
}

export async function createGrowthSubscriptionCheckout(env = {}, { workspaceId, ownerUserId }) {
  if (!hasPlatformSubscriptionSecret(env)) {
    return { ok: false, status: 503, reason: "SUBSCRIPTION_INTEGRATION_SECRET_MISSING", checkout: null };
  }

  const status = await readGrowthSubscriptionStatus(env);
  if (!status.reachable || !status.checkoutReady) {
    return { ok: false, status: 503, reason: "SUBSCRIPTION_CHECKOUT_NOT_READY", checkout: null };
  }

  const origin = numeriaOrigin(env);
  const payload = {
    workspaceId,
    ownerUserId,
    productCode: PRODUCT_CODE,
    successUrl: `${origin}/original.html?subscription=success`,
    cancelUrl: `${origin}/original.html?subscription=canceled`,
  };

  try {
    const response = await growthFetch(env, "/api/subscriptions/checkout", {
      method: "POST",
      headers: subscriptionHeaders(env),
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    const checkout = body?.checkout;
    const redirectUrl = String(checkout?.redirectUrl || "");
    let redirectAllowed = false;
    try {
      const url = new URL(redirectUrl);
      redirectAllowed = url.protocol === "https:" && url.hostname.endsWith("stripe.com");
    } catch {
      redirectAllowed = false;
    }
    if (!response.ok || body.status !== "success" || !redirectAllowed) {
      return { ok: false, status: response.status || 502, reason: body.errorCode || "SUBSCRIPTION_CHECKOUT_UNAVAILABLE", checkout: null };
    }
    return {
      ok: true,
      status: response.status,
      reason: null,
      checkout: {
        checkoutRef: checkout.checkoutRef || null,
        redirectUrl,
        productCode: PRODUCT_CODE,
        planId: "pro",
        source: "growth-engine",
      },
    };
  } catch (error) {
    return { ok: false, status: 503, reason: String(error?.name || "SUBSCRIPTION_CHECKOUT_FETCH_FAILED").slice(0, 80), checkout: null };
  }
}

export const GROWTH_SUBSCRIPTION_CONTRACT = Object.freeze({
  productCode: PRODUCT_CODE,
  canonicalOwner: "growth-engine",
  plans: ["free", "pro"],
  businessPurchasable: false,
  paymentDetailsReturned: false,
  rawStripeObjectsReturned: false,
  checkoutReturnOrigin: DEFAULT_NUMERIA_ORIGIN,
});
