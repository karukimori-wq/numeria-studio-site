import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wrangler = readFileSync("wrangler.jsonc", "utf8");
const source = readFileSync("src/growth-subscription-source.js", "utf8");
const entry = readFileSync("src/ai-worker-entry.js", "utf8");

assert.match(wrangler, /"binding": "GROWTH_ENGINE_SERVICE"/);
assert.match(wrangler, /"service": "growth-engine"/);
assert.match(source, /productCode: PRODUCT_CODE/);
assert.match(source, /const PRODUCT_CODE = "numeria-studio"/);
assert.match(source, /PLATFORM_SUBSCRIPTION_INTEGRATION_SECRET/);
assert.match(source, /x-platform-subscription-secret/);
assert.match(source, /\/api\/subscriptions\/entitlement/);
assert.match(source, /planId = body\.planId === "pro" \? "pro" : "free"/);
assert.match(source, /paymentDetailsReturned: false/);
assert.match(source, /rawStripeObjectsReturned: false/);

assert.match(entry, /\/subscription-source\/status/);
assert.match(entry, /\/api\/billing\/subscription/);
assert.match(entry, /resolveEffectiveSubscription/);
assert.match(entry, /source: "growth-engine"/);
assert.match(entry, /source: "numeria-worker-mvp-fallback"/);
assert.match(entry, /requiredForProduction: true/);
assert.match(entry, /localMvpFallbackEnabledUntilCanonicalReady: true/);
assert.doesNotMatch(entry, /planId:\s*"business"/);
assert.doesNotMatch(source, /card_number|payment_details|sales_amount/i);

console.log("Growth Engine canonical subscription source contract verified: Service Binding + integration secret, Numeria product scope, Free/Pro only, and explicit temporary MVP fallback.");
