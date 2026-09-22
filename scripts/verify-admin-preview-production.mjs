import assert from "node:assert/strict";

const baseUrl = (process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/admin-preview/status`, {
  headers: { Accept: "application/json" },
});
const body = await response.json().catch(() => ({}));

assert.equal(response.ok, true, `Admin preview status endpoint failed with HTTP ${response.status}`);
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
