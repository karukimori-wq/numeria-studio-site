import assert from "node:assert/strict";

const DEFAULT_PRODUCTION_URL = "https://numeria-studio-site.karukimori.workers.dev";
const rawBaseUrl = process.argv[2] || process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || DEFAULT_PRODUCTION_URL;
const baseUrl = rawBaseUrl.replace(/\/+$/, "");
const requireClerkEnforceReady = process.env.REQUIRE_CLERK_ENFORCE_READY === "1";
const requireAuthEnforceMode = process.env.REQUIRE_AUTH_ENFORCE_MODE === "1";

const jsonEndpoints = [
  "/health",
  "/version",
  "/contracts/status",
  "/release/status",
  "/auth/status",
  "/domain/status",
  "/billing/status",
  "/feedback-hub/status",
  "/growth-handoff/status",
  "/persistence/status",
  "/ai-usage/status",
  "/apc/status",
];

async function fetchWithRetry(path, attempts = 5) {
  const url = `${baseUrl}${path}`;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: path.endsWith(".html") || path === "/" ? "text/html" : "application/json" },
      });
      if (response.ok) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw lastError;
}

function collectSecretLeaks(value, path = "$", leaks = []) {
  if (!value || typeof value !== "object") return leaks;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key === "secretValuesReturned" && child === true) leaks.push(childPath);
    collectSecretLeaks(child, childPath, leaks);
  }
  return leaks;
}

async function verifyHtml(path) {
  const response = await fetchWithRetry(path);
  const html = await response.text();
  assert.match(html, /Numeria Studio/, `${path} should include Numeria Studio marker`);
}

async function verifyJson(path) {
  let response;
  let contentType = "";
  let body = "";
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    response = await fetchWithRetry(path, 1);
    contentType = response.headers.get("content-type") || "";
    body = await response.text();
    if (/application\/json/.test(contentType)) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
  }
  assert.match(contentType, /application\/json/, `${path} should return JSON`);
  const data = JSON.parse(body);
  assert.equal(data.appId, "numeria-studio", `${path} should identify numeria-studio`);
  assert.ok(["success", "warning"].includes(data.status), `${path} should return success or warning status`);
  assert.deepEqual(collectSecretLeaks(data), [], `${path} must not expose secret values`);
  return data;
}

await verifyHtml("/");
await verifyHtml("/index.html");

const results = new Map();
for (const endpoint of jsonEndpoints) {
  results.set(endpoint, await verifyJson(endpoint));
}

const billing = results.get("/billing/status");
assert.equal(billing.businessPurchasable, false, "Business must not be purchasable in this release");
assert.equal(billing.secretValuesReturned, false, "Billing status must not expose secrets");
assert.ok(Array.isArray(billing.supportedPlans), "Billing status should list supported plans");
assert.ok(billing.supportedPlans.includes("free"), "Billing status should include free");
assert.ok(billing.supportedPlans.includes("pro"), "Billing status should include pro");

const feedbackHub = results.get("/feedback-hub/status");
assert.equal(feedbackHub.feedbackHubContractVersion, "feedback-hub-free-pro-intake.v1", "Feedback Hub status should expose its contract");
assert.deepEqual(feedbackHub.allowedPlans, ["free", "pro"], "Feedback Hub should support Free and Pro");
assert.equal(feedbackHub.businessRequired, false, "Feedback Hub must not require Business");
assert.equal(feedbackHub.billingBlocked, false, "Feedback Hub must not be billing-blocked");
assert.equal(feedbackHub.secretValuesReturned, false, "Feedback Hub status must not expose secrets");

const growthHandoff = results.get("/growth-handoff/status");
assert.equal(growthHandoff.sourceApp, "growth-engine", "Growth handoff status should identify Growth Engine");
assert.equal(growthHandoff.receiverReady, true, "Growth handoff receiver should be ready");
assert.equal(growthHandoff.businessPurchasable, false, "Growth handoff must not make Business purchasable");
assert.equal(growthHandoff.businessFeatureEnabled, false, "Growth handoff must not enable Business features");
assert.equal(growthHandoff.queryIdentityTrustedForAuthorization, false, "Growth handoff must not trust query identity for authorization");
assert.equal(growthHandoff.externalReferencesOnly, true, "Growth handoff should store external references only");
assert.deepEqual(collectSecretLeaks(growthHandoff), [], "Growth handoff status must not expose secret values");

const domain = results.get("/domain/status");
assert.ok(["custom-domain", "worker-host", "unknown-host"].includes(domain.currentRoute), "Domain status should report the route class");
assert.equal(domain.secretValuesReturned, false, "Domain status must not expose secrets");

const auth = results.get("/auth/status");
assert.equal(auth.authProvider, "clerk", "Auth status should identify Clerk");
assert.equal(auth.secretValuesReturned, false, "Auth status must not expose secrets");
assert.ok(auth.enforceModeRollout, "Auth status should include enforce rollout details");
assert.equal(auth.enforceModeRollout.targetMode, "enforce", "Auth rollout should target enforce mode");
assert.ok(Array.isArray(auth.enforceModeRollout.requiredRuntimeConfig), "Auth rollout should list required runtime config");
assert.ok(Array.isArray(auth.enforceModeRollout.blockers), "Auth rollout should list blockers");
if (requireClerkEnforceReady) {
  assert.equal(auth.enforceModeReady, true, "Clerk enforce readiness is required");
  assert.equal(auth.enforceModeRollout.ready, true, "Clerk enforce rollout should be ready");
}
if (requireAuthEnforceMode) {
  assert.equal(auth.enforcementMode, "enforce", "Auth enforcement mode should be enforce");
}

const release = results.get("/release/status");
assert.equal(release.releaseScope, "free-pro", "Release scope should stay Free / Pro");
assert.equal(release.checks?.businessPurchasable, false, "Release status must keep Business unavailable");
assert.equal(release.checks?.auth?.authProvider, "clerk", "Release auth check should identify Clerk");
assert.ok(release.checks?.auth?.enforceModeRollout, "Release auth check should include enforce rollout");
assert.equal(release.checks?.growthEngineHandoff?.receiverReady, true, "Release status should include Growth Engine handoff readiness");
assert.equal(release.checks?.growthEngineHandoff?.businessPurchasable, false, "Release Growth handoff must keep Business unavailable");
assert.equal(release.checks?.feedbackHub?.businessRequired, false, "Release Feedback Hub check must not require Business");
assert.equal(release.checks?.feedbackHub?.billingBlocked, false, "Release Feedback Hub check must not be billing-blocked");
assert.equal(release.checks?.billing?.secretValuesReturned, false, "Release billing check must not expose secrets");
assert.equal(release.checks?.domain?.secretValuesReturned, false, "Release domain check must not expose secrets");

const contracts = results.get("/contracts/status");
assert.equal(contracts.plans?.business?.purchasable, false, "Contracts status must keep Business unavailable");
assert.equal(contracts.integrations?.growthEngineHandoff?.receiverReady, true, "Contracts status should include Growth Engine handoff readiness");
assert.equal(contracts.integrations?.growthEngineHandoff?.queryIdentityTrustedForAuthorization, false, "Contracts Growth handoff must not trust query identity");
assert.equal(contracts.integrations?.feedbackHub?.feedbackHubContractVersion, "feedback-hub-free-pro-intake.v1", "Contracts status should include Feedback Hub readiness");
assert.equal(contracts.integrations?.feedbackHub?.businessRequired, false, "Contracts Feedback Hub must not require Business");
assert.equal(contracts.billing?.secretValuesReturned, false, "Contracts billing check must not expose secrets");
assert.equal(contracts.domain?.secretValuesReturned, false, "Contracts domain check must not expose secrets");

console.log(`Production readiness verified at ${baseUrl}`);
