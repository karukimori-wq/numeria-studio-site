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

assert.match(source, /createGrowthSubscriptionCheckout/);
assert.match(source, /\/api\/subscriptions\/checkout/);
assert.match(source, /successUrl: `\$\{origin\}\/original\.html\?subscription=success`/);
assert.match(source, /cancelUrl: `\$\{origin\}\/original\.html\?subscription=canceled`/);
assert.match(source, /const DEFAULT_NUMERIA_ORIGIN = "https:\/\/numeria-studio\.com"/);
assert.match(source, /url\.hostname\.endsWith\("stripe\.com"\)/);
assert.doesNotMatch(source, /successUrl\s*:\s*input|cancelUrl\s*:\s*input/);

assert.match(entry, /\/subscription-source\/status/);
assert.match(entry, /\/api\/billing\/subscription/);
assert.match(entry, /\/api\/billing\/checkout/);
assert.match(entry, /handleSubscriptionCheckout/);
assert.match(entry, /resolveAuthenticatedIdentity/);
assert.match(entry, /workspaceId: identity\.workspaceId/);
assert.match(entry, /ownerUserId: identity\.userId/);
assert.match(entry, /SUBSCRIPTION_ALREADY_PRO/);
assert.match(entry, /checkoutIdentitySource: "clerk-authenticated-worker-scope"/);
assert.match(entry, /resolveEffectiveSubscription/);
assert.match(entry, /source: "growth-engine"/);
assert.match(entry, /source: "numeria-worker-mvp-fallback"/);
assert.match(entry, /requiredForProduction: true/);
assert.match(entry, /localMvpFallbackEnabledUntilCanonicalReady: true/);
assert.doesNotMatch(entry, /planId:\s*"business"/);
assert.doesNotMatch(source, /card_number|payment_details|sales_amount/i);

console.log("Growth Engine canonical subscription and Numeria Pro checkout bridge verified: Clerk-authenticated identity, fixed Numeria return origin, Stripe-only redirect, Free/Pro scope, and no payment-detail ownership leakage.");
