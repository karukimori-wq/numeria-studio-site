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
assert.match(secureEntry, /businessPurchasable: false/);
assert.match(secureEntry, /serverUsageBypassEnabled: false/);

assert.match(profilePatch, /NumeriaAuthenticatedFetch\(\\`\/api\/admin\/status\\`/);
assert.match(readinessPatch, /headers\.Authorization="Bearer "\+token/);
assert.match(readinessPatch, /Admin readiness panel still trusts the browser-provided admin email header/);
assert.doesNotMatch(readinessPatch, /const secureHeaders = '[^']*X-Admin-Email/);

// Developer preview remains an entitlement layered over the real plan.
assert.match(adminPreviewPatch, /ar!==`free`\|\|tr===`admin`/);
assert.doesNotMatch(adminPreviewPatch, /ar\s*=\s*`(?:pro|business)`/);
assert.doesNotMatch(adminPreviewPatch, /plan\s*:\s*`business`/);

console.log("Secure admin developer preview contract verified behind the AI outer Worker entrypoint.");
