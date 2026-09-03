import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createUsageSnapshot, evaluateUsageLimit, PLAN_CONFIG } from "../src/plan-config.js";

const requiredFiles = [
  "index.html",
  "original.html",
  "src/main.jsx",
  "src/auth-gate.js",
  "src/styles.css",
  "src/plan-config.js",
  "src/worker.js",
  "vite.config.mjs",
  "scripts/restore-original-site.mjs",
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
const originalHtml = readFileSync("original.html", "utf8");
const legacyHtml = readFileSync("original.html", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const authGateSource = readFileSync("src/auth-gate.js", "utf8");
const numeriaAppSource = readFileSync("assets/numeria-app-Cckhajir.js", "utf8");
const workerSource = readFileSync("src/worker.js", "utf8");
const planSource = readFileSync("src/plan-config.js", "utf8");
const wranglerConfig = readFileSync("wrangler.jsonc", "utf8");
const clerkPlan = readFileSync("CLERK_AUTH_PLAN.md", "utf8");
const supabasePlan = readFileSync("SUPABASE_MIGRATION_PLAN.md", "utf8");
const releasePlan = readFileSync("FREE_PRO_RELEASE_PLAN.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");
assert.match(html, /Numeria Studio/);
assert.match(html, /window\.location\.replace\("\/original\.html"\)/);
assert.doesNotMatch(html, /\/src\/auth-gate\.js/);
assert.doesNotMatch(html, /studio-auth-bar/);
assert.doesNotMatch(html, /signed-in-panel/);
assert.doesNotMatch(html, /signed-out-panel/);
assert.doesNotMatch(html, /プラン・請求/);
assert.doesNotMatch(html, /ログアウト/);
assert.doesNotMatch(html, /Clerk/);
assert.match(originalHtml, /Numeria Studio｜数秘術鑑定書作成/);
assert.match(originalHtml, /数秘術鑑定を10分で/);
assert.match(originalHtml, /NumeriaInstallAuthBridge/);
assert.match(originalHtml, /\/api\/auth\/config/);
assert.match(originalHtml, /\/clerk\.browser\.js/);
assert.doesNotMatch(originalHtml, /cdn\.jsdelivr\.net\/npm\/@clerk\/clerk-js/);
assert.doesNotMatch(originalHtml, /unpkg\.com\/@clerk\/clerk-js/);
assert.doesNotMatch(originalHtml, /esm\.sh\/@clerk/);
assert.match(originalHtml, /openSignIn/);
assert.match(originalHtml, /openSignUp/);
assert.match(legacyHtml, /assets\/numeria-app-Cckhajir\.js/);
assert.match(numeriaAppSource, /NumeriaInstallAuthBridge\?\.\(X\)/);
assert.match(packageJson, /restore-original-site\.mjs/);
assert.doesNotMatch(html, /https:\/\/numeria-studio\.karukimori\.workers\.dev/);
assert.match(authGateSource, /@clerk\/clerk-js/);
assert.match(authGateSource, /\/api\/auth\/config/);
assert.match(authGateSource, /openSignIn/);
assert.match(authGateSource, /openSignUp/);
assert.match(authGateSource, /\/api\/billing\/subscription/);
assert.match(authGateSource, /\/api\/usage/);
assert.match(authGateSource, /VITE_CLERK_PUBLISHABLE_KEY/);
assert.match(authGateSource, /今月の鑑定数/);
assert.match(authGateSource, /鑑定対象者/);
assert.match(authGateSource, /business/);
assert.match(authGateSource, /準備中/);
assert.match(planSource, /FREE_MONTHLY_APPRAISAL_LIMIT/);
assert.match(planSource, /FREE_APPRAISAL_CLIENT_LIMIT/);
assert.match(workerSource, /BUSINESS_PREPARING/);
assert.match(workerSource, /\/api\/auth\/config/);
assert.match(workerSource, /CLERK_PUBLISHABLE_KEY/);
assert.match(workerSource, /\/clerk\.browser\.js/);
assert.match(workerSource, /getClerkFrontendOrigin/);
assert.match(workerSource, /\/api\/sessions\/start/);
assert.match(workerSource, /\/api\/appraisal-clients/);
assert.match(workerSource, /\/api\/billing\/subscription/);
assert.match(workerSource, /url\.pathname === "\/health"/);
assert.match(workerSource, /url\.pathname === "\/version"/);
assert.match(workerSource, /url\.pathname === "\/contracts\/status"/);
assert.match(workerSource, /planContractVersion/);
assert.match(workerSource, /workspaceId\+userId/);
assert.match(workerSource, /studio\.session\.started\.v1/);
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
