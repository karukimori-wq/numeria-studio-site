import assert from "node:assert/strict";

const DEFAULT_PRODUCTION_URL = "https://numeria-studio-site.karukimori.workers.dev";
const rawBaseUrl = process.argv[2] || process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || DEFAULT_PRODUCTION_URL;
const baseUrl = rawBaseUrl.replace(/\/+$/, "");

const jsonEndpoints = [
  "/health",
  "/version",
  "/contracts/status",
  "/release/status",
  "/auth/status",
  "/domain/status",
  "/billing/status",
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
  const response = await fetchWithRetry(path);
  const contentType = response.headers.get("content-type") || "";
  assert.match(contentType, /application\/json/, `${path} should return JSON`);
  const data = await response.json();
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

const domain = results.get("/domain/status");
assert.ok(["custom-domain", "worker-host", "unknown-host"].includes(domain.currentRoute), "Domain status should report the route class");
assert.equal(domain.secretValuesReturned, false, "Domain status must not expose secrets");

const release = results.get("/release/status");
assert.equal(release.releaseScope, "free-pro", "Release scope should stay Free / Pro");
assert.equal(release.checks?.businessPurchasable, false, "Release status must keep Business unavailable");
assert.equal(release.checks?.billing?.secretValuesReturned, false, "Release billing check must not expose secrets");
assert.equal(release.checks?.domain?.secretValuesReturned, false, "Release domain check must not expose secrets");

const contracts = results.get("/contracts/status");
assert.equal(contracts.plans?.business?.purchasable, false, "Contracts status must keep Business unavailable");
assert.equal(contracts.billing?.secretValuesReturned, false, "Contracts billing check must not expose secrets");
assert.equal(contracts.domain?.secretValuesReturned, false, "Contracts domain check must not expose secrets");

console.log(`Production readiness verified at ${baseUrl}`);
