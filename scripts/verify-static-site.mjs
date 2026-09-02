import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createUsageSnapshot, evaluateUsageLimit, PLAN_CONFIG } from "../src/plan-config.js";

const requiredFiles = [
  "index.html",
  "src/main.jsx",
  "src/styles.css",
  "src/plan-config.js",
  "src/worker.js",
  "vite.config.mjs",
  "favicon.svg",
  "legacy-static/README.md",
  "assets/index-CEGe-9Xe.css",
  "assets/index-CYZnnbch.js",
  "assets/framework-CXnKph_e.js",
  "assets/numeria-app-Cckhajir.js",
  "CLERK_AUTH_PLAN.md",
  "FREE_PRO_RELEASE_PLAN.md",
  "SUPABASE_MIGRATION_PLAN.md",
  ".env.example"
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `Missing required file: ${file}`);
}

const html = readFileSync("index.html", "utf8");
const appSource = readFileSync("src/main.jsx", "utf8");
const workerSource = readFileSync("src/worker.js", "utf8");
const planSource = readFileSync("src/plan-config.js", "utf8");
const wranglerConfig = readFileSync("wrangler.jsonc", "utf8");
const clerkPlan = readFileSync("CLERK_AUTH_PLAN.md", "utf8");
const supabasePlan = readFileSync("SUPABASE_MIGRATION_PLAN.md", "utf8");
const releasePlan = readFileSync("FREE_PRO_RELEASE_PLAN.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");
assert.match(html, /Numeria Studio/);
assert.match(html, /\/src\/main\.jsx/);
assert.doesNotMatch(html, /https:\/\/numeria-studio\.karukimori\.workers\.dev/);
assert.match(appSource, /@clerk\/react/);
assert.match(appSource, /VITE_CLERK_PUBLISHABLE_KEY/);
assert.match(appSource, /VITE_CLERK_APPLICATION_ID/);
assert.match(appSource, /VITE_ADMIN_EMAILS/);
assert.match(appSource, /illusionddt@gmail\.com/);
assert.match(appSource, /\/api\/embed\/feedback/);
assert.match(appSource, /numeria\.feedback\.mock\.last/);
assert.match(appSource, /料金・プラン比較/);
assert.match(appSource, /今月の鑑定数/);
assert.match(appSource, /鑑定対象者/);
assert.match(appSource, /Proへアップグレード/);
assert.match(appSource, /Business/);
assert.match(appSource, /準備中/);
assert.match(planSource, /FREE_MONTHLY_APPRAISAL_LIMIT/);
assert.match(planSource, /FREE_APPRAISAL_CLIENT_LIMIT/);
assert.match(workerSource, /BUSINESS_PREPARING/);
assert.match(workerSource, /\/api\/sessions\/start/);
assert.match(workerSource, /\/api\/appraisal-clients/);
assert.match(workerSource, /\/api\/billing\/subscription/);
assert.match(wranglerConfig, /"main": "src\/worker\.js"/);
assert.match(wranglerConfig, /"binding": "ASSETS"/);
assert.match(clerkPlan, /Authentication provider: Clerk/);
assert.match(clerkPlan, /app_3ImOuQXNBc9Rpqs3XoJEtw2NogR/);
assert.match(clerkPlan, /npx clerk init --app app_3ImOuQXNBc9Rpqs3XoJEtw2NogR/);
assert.match(clerkPlan, /illusionddt@gmail\.com/);
assert.match(supabasePlan, /new authentication direction is Clerk/);
assert.match(supabasePlan, /AITEC Apps/);
assert.match(envExample, /VITE_CLERK_APPLICATION_ID=app_3ImOuQXNBc9Rpqs3XoJEtw2NogR/);
assert.match(envExample, /VITE_PRICE_PRO_LABEL/);
assert.match(releasePlan, /Monthly appraisals: 20/);
assert.match(releasePlan, /Appraisal client snapshots: 3/);
assert.match(releasePlan, /Business remains unavailable/);
assert.match(releasePlan, /workspaceId \+ userId \+ billingMonth/);

assert.equal(PLAN_CONFIG.free.entitlements.monthlyAppraisals, 20);
assert.equal(PLAN_CONFIG.free.entitlements.appraisalClients, 3);
assert.equal(PLAN_CONFIG.pro.entitlements.monthlyAppraisals, "unlimited");
assert.equal(PLAN_CONFIG.pro.entitlements.appraisalClients, "unlimited");
assert.equal(PLAN_CONFIG.business.available, false);

const freeAtSessionLimit = createUsageSnapshot({ planId: "free", monthlyAppraisals: 20, appraisalClients: 0 });
assert.equal(evaluateUsageLimit(freeAtSessionLimit, "start_appraisal").allowed, false);
assert.equal(evaluateUsageLimit(freeAtSessionLimit, "start_appraisal").reason, "FREE_MONTHLY_APPRAISAL_LIMIT");

const freeAtClientLimit = createUsageSnapshot({ planId: "free", monthlyAppraisals: 0, appraisalClients: 3 });
assert.equal(evaluateUsageLimit(freeAtClientLimit, "create_appraisal_client").allowed, false);
assert.equal(evaluateUsageLimit(freeAtClientLimit, "create_appraisal_client").reason, "FREE_APPRAISAL_CLIENT_LIMIT");

const proUnlimited = createUsageSnapshot({ planId: "pro", monthlyAppraisals: 200, appraisalClients: 50 });
assert.equal(evaluateUsageLimit(proUnlimited, "start_appraisal").allowed, true);
assert.equal(evaluateUsageLimit(proUnlimited, "create_appraisal_client").allowed, true);

console.log("Static Numeria Studio site backup verified.");
