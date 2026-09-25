import assert from "node:assert/strict";

const baseUrl = String(process.env.NUMERIA_PRODUCTION_URL || process.env.PRODUCTION_URL || "https://numeria-studio-site.karukimori.workers.dev").replace(/\/$/, "");

async function readStatus(attempts = 12) {
  let last = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${baseUrl}/ai-assist/status`, { headers: { accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    last = { response, body };
    if (
      response.ok
      && body.status === "success"
      && body.contract?.capability === "studio.report.ai_assist"
      && Array.isArray(body.contract?.plans)
      && body.contract.plans.includes("free")
      && body.contract.plans.includes("pro")
      && body.apcBaseUrlConfigured === true
      && body.apcServiceBindingConfigured === true
      && body.apcProvider?.transport === "cloudflare-service-binding"
      && body.apcProvider?.reachable === true
      && body.apcProvider?.openaiConfigured === true
      && body.apcProvider?.secretValuesExposed === false
      && body.aiGenerationReady === true
      && body.serverProxyOnly === true
      && body.clerkSessionRequired === true
      && body.subscriptionPlanSource === "growth-engine-when-ready"
      && body.providerKeysExposedToBrowser === false
    ) return last;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.error("AI assist Production readiness diagnostics:", JSON.stringify(last?.body || {}, null, 2));
  return last;
}

const result = await readStatus();
assert.ok(result, "AI assist Production status was not returned.");
assert.equal(result.response.ok, true, `AI assist status HTTP ${result.response.status}`);
assert.equal(result.body.status, "success");
assert.equal(result.body.contract.capability, "studio.report.ai_assist");
assert.deepEqual(result.body.contract.plans, ["free", "pro"]);
assert.equal(result.body.contract.businessAvailable, false);
assert.equal(result.body.apcBaseUrlConfigured, true);
assert.equal(result.body.apcServiceBindingConfigured, true);
assert.equal(result.body.apcProvider.transport, "cloudflare-service-binding");
assert.equal(result.body.apcProvider.reachable, true);
assert.equal(result.body.apcProvider.openaiConfigured, true);
assert.equal(result.body.apcProvider.secretValuesExposed, false);
assert.equal(result.body.aiGenerationReady, true);
assert.equal(result.body.serverProxyOnly, true);
assert.equal(result.body.clerkSessionRequired, true);
assert.equal(result.body.subscriptionPlanSource, "growth-engine-when-ready");
assert.equal(result.body.providerKeysExposedToBrowser, false);
assert.equal(result.body.secretValuesReturned, false);
assert.ok(result.body.forbiddenPersonalFields.includes("name"));
assert.ok(result.body.forbiddenPersonalFields.includes("birthName"));
assert.ok(result.body.forbiddenPersonalFields.includes("birthday"));
assert.ok(result.body.forbiddenPersonalFields.includes("fullReportBody"));

console.log("Production Numeria AI assist verified end-to-end to APC provider readiness through Cloudflare Service Binding: OpenAI configured, Free/Pro contract active, Growth Engine subscription source expected, and personal-data boundary intact.");
