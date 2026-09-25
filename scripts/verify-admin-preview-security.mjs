import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wrangler = readFileSync("wrangler.jsonc", "utf8");
const aiEntry = readFileSync("src/ai-worker-entry.js", "utf8");
const secureEntry = readFileSync("src/secure-worker-entry.js", "utf8");
const profilePatch = readFileSync("scripts/patch-profile-sources.mjs", "utf8");
const readinessPatch = readFileSync("scripts/patch-admin-readiness-auth.mjs", "utf8");
const adminPreviewPatch = readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8");

assert.match(wrangler, /"main": "src\/ai-worker-entry\.js"/);
assert.match(aiEntry, /import secureWorker from "\.\/secure-worker-entry\.js"/);
assert.match(aiEntry, /return secureWorker\.fetch\(request, env, ctx\)/);
assert.match(secureEntry, /incomingRequestVerified !== true/);
assert.match(secureEntry, /ADMIN_USER_IDS/);
assert.match(secureEntry, /CLERK_SECRET_KEY/);
assert.match(secureEntry, /\/v1\/users\//);
assert.match(secureEntry, /headers\.delete\("X-Admin-Email"\)/);
assert.match(secureEntry, /identitySource: "clerk-user-id-allowlist"/);
assert.match(secureEntry, /identitySource: "clerk-backend-email-allowlist"/);
assert.match(secureEntry, /subscriptionPlanUnaffected: true/);
assert.match(secureEntry, /businessUiPreviewEnabled: enabled/);
assert.match(secureEntry, /previewPlanId: enabled \? "business" : null/);
assert.match(secureEntry, /businessPurchasable: false/);
assert.match(secureEntry, /serverUsageBypassEnabled: false/);

assert.match(profilePatch, /NumeriaAuthenticatedFetch\(\\`\/api\/admin\/status\\`/);
assert.match(profilePatch, /NumeriaAdminPreviewRender/);
assert.match(profilePatch, /ADMIN PREVIEW · BUSINESS UI/);
assert.match(profilePatch, /ADMIN未認識 · USER UI/);
assert.match(profilePatch, /NumeriaAdminPreviewState/);
assert.match(profilePatch, /actualPlan=subscription&&subscription\.subscription&&subscription\.subscription\.planId\|\|\\"free\\"/);
assert.match(profilePatch, /businessUiPreviewEnabled\?\\"business\\":actualPlan/);
assert.match(profilePatch, /developerPreview:preview/);
assert.match(readinessPatch, /headers\.Authorization="Bearer "\+token/);
assert.match(readinessPatch, /Admin readiness panel still trusts the browser-provided admin email header/);
assert.doesNotMatch(readinessPatch, /const secureHeaders = '[^']*X-Admin-Email/);

// Developer preview remains an entitlement layered over the real plan.
// The legacy UI may receive plan="business" only as a verified admin UI projection;
// billing/usage state remains under actualPlan and /api/billing/subscription.
assert.match(adminPreviewPatch, /ar!==`free`\|\|tr===`admin`/);
assert.doesNotMatch(adminPreviewPatch, /ar\s*=\s*`(?:pro|business)`/);
assert.doesNotMatch(adminPreviewPatch, /plan\s*:\s*`business`/);

console.log("Secure admin Business UI preview contract verified behind the AI outer Worker entrypoint, including visible admin recognition diagnostics.");
