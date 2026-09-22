import assert from "node:assert/strict";

const baseUrl = String(process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");

let response;
let body = {};
for (let attempt = 1; attempt <= 10; attempt += 1) {
  response = await fetch(`${baseUrl}/admin-preview/status`, {
    headers: { Accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") || "";
  body = /application\/json/.test(contentType) ? await response.json().catch(() => ({})) : {};
  if (
    response.status === 200
    && body.adminPreviewContractVersion === "numeria-admin-developer-preview.v2"
    && body.browserAssertedAdminEmailTrusted === false
    && body.identityProviderReady === true
    && body.status === "success"
  ) break;
  await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
}

assert.equal(response?.status, 200, `Admin preview status endpoint failed with HTTP ${response?.status}`);
assert.equal(body.adminPreviewContractVersion, "numeria-admin-developer-preview.v2");
assert.equal(body.browserAssertedAdminEmailTrusted, false);
assert.equal(body.subscriptionPlanUnaffected, true);
assert.equal(body.businessPurchasable, false);
assert.equal(body.secretValuesReturned, false);
assert.equal(
  body.identityProviderReady,
  true,
  "Admin developerPreview identity is not ready. Configure CLERK_SECRET_KEY or NUMERIA_ADMIN_USER_IDS in the Worker environment.",
);
assert.equal(body.status, "success");

console.log("Production admin developerPreview identity readiness verified.");
