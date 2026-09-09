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
  "scripts/patch-legacy-static-assets.mjs",
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
const mainSource = readFileSync("src/main.jsx", "utf8");
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
assert.match(originalHtml, /cdn\.jsdelivr\.net\/npm\/@clerk\/clerk-js/, "login should have a CDN fallback when the Worker proxy cannot fetch the login library");
assert.match(originalHtml, /unpkg\.com\/@clerk\/clerk-js/, "login should have a second CDN fallback when the primary login script fails");
assert.doesNotMatch(originalHtml, /esm\.sh\/@clerk/);
assert.doesNotMatch(originalHtml, /openSignIn/);
assert.doesNotMatch(originalHtml, /openSignUp/);
assert.doesNotMatch(originalHtml, /authRedirectUrl/);
assert.doesNotMatch(originalHtml, /window\.location\.assign/);
assert.match(originalHtml, /client\.signUp\.create/);
assert.match(originalHtml, /prepareEmailAddressVerification/);
assert.match(originalHtml, /attemptEmailAddressVerification/);
assert.match(originalHtml, /client\.signIn\.create/);
assert.match(originalHtml, /setActive/);
assert.match(originalHtml, /data-clerk-publishable-key/);
assert.match(originalHtml, /typeof window\.Clerk==="function"/);
assert.doesNotMatch(originalHtml, /;window\.Clerk=new window\.Clerk\(config\.publishableKey\)\}await/);
assert.match(legacyHtml, /assets\/numeria-app-Cckhajir\.js/);
assert.match(numeriaAppSource, /NumeriaInstallAuthBridge\?\.\(X\)/);
assert.match(numeriaAppSource, /タロットを選んだFreeユーザーはタロットを利用できます/);
assert.match(numeriaAppSource, /無料版では初回に選んだメイン占術を固定します/);
assert.doesNotMatch(numeriaAppSource, /タロットは管理者確認用/);
assert.doesNotMatch(numeriaAppSource, /無料版で利用できる占術は1つです/);
assert.match(numeriaAppSource, /\/api\/appraisals\/save-draft/);
assert.match(numeriaAppSource, /Ci=async\(\)=>/);
assert.match(numeriaAppSource, /Ii=async\(\)=>/);
assert.match(readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8"), /Expected three legacy PDF navigation calls/);
assert.match(readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8"), /manticDraftPayloadWithDetails/);
assert.match(readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8"), /numerologyDraftPayloadWithDetails/);
assert.match(packageJson, /restore-original-site\.mjs/);
assert.doesNotMatch(html, /https:\/\/numeria-studio\.karukimori\.workers\.dev/);
assert.match(authGateSource, /@clerk\/clerk-js/);
assert.match(authGateSource, /\/api\/auth\/config/);
assert.match(authGateSource, /openSignIn/);
assert.match(authGateSource, /openSignUp/);
assert.match(authGateSource, /\/api\/billing\/subscription/);
assert.match(authGateSource, /\/api\/usage/);
assert.match(authGateSource, /VITE_CLERK_PUBLISHABLE_KEY/);
assert.match(authGateSource, /今月の鑑定完成数/);
assert.match(authGateSource, /途中保存/);
assert.match(authGateSource, /表示できる鑑定履歴/);
assert.match(authGateSource, /鑑定対象者プロフィール: 上限なし/);
assert.match(authGateSource, /business/);
assert.match(authGateSource, /準備中/);
assert.match(mainSource, /AdminPreviewPanel/);
assert.match(mainSource, /管理者だけの先行メニュー/);
assert.match(mainSource, /Business連携/);
assert.match(mainSource, /実PDF生成/);
assert.match(mainSource, /AI利用記録/);
assert.match(mainSource, /通常ユーザーには表示しないBusiness予定機能/);
assert.match(mainSource, /showAdminFeatures && <AdminPreviewPanel/);
assert.match(mainSource, /apiRequest\("\/api\/admin\/status"/);
assert.match(mainSource, /serverAdminMode/);
assert.match(mainSource, /showAdminFeatures/);
assert.match(mainSource, /管理者プレビュー（準備中）/);
assert.match(mainSource, /管理者プレビュー（準備中）/);
assert.doesNotMatch(mainSource, /<h2>管理者状態<\/h2>/);
assert.match(planSource, /FREE_MONTHLY_APPRAISAL_LIMIT/);
assert.match(planSource, /FREE_IN_PROGRESS_APPRAISAL_LIMIT/);
assert.match(planSource, /viewableCompletedAppraisals/);
assert.match(planSource, /completionCountTrigger/);
assert.doesNotMatch(planSource, /FREE_APPRAISAL_CLIENT_LIMIT/);
assert.match(workerSource, /BUSINESS_PREPARING/);
assert.doesNotMatch(workerSource, /message: isAdmin/, "Worker admin status should not reference undefined isAdmin");
assert.match(workerSource, /\/api\/auth\/config/);
assert.match(workerSource, /CLERK_PUBLISHABLE_KEY/);
assert.match(workerSource, /\/clerk\.browser\.js/);
assert.match(workerSource, /getClerkFrontendOrigin/);
assert.match(workerSource, /clerkBrowserAssetResponse/);
assert.match(workerSource, /_clerk\\\.browser_/);
assert.match(workerSource, /\/api\/sessions\/start/);
assert.match(workerSource, /\/api\/appraisals\/save-draft/);
assert.match(workerSource, /\/api\/appraisals\/complete/);
assert.match(workerSource, /ACTIVE_APPRAISAL_REQUIRED/);
assert.match(workerSource, /未完了の案件/);
assert.match(workerSource, /usage\.entitlements\.viewableCompletedAppraisals/);
assert.match(workerSource, /snapshot\.entitlements\.viewableCompletedAppraisals/);
assert.match(workerSource, /\/api\/reports\/export/);
assert.match(workerSource, /createReportPdfBase64/);
assert.match(workerSource, /createReportSnapshot/);
assert.match(workerSource, /Report Details/);
assert.match(workerSource, /application\/pdf/);
assert.match(workerSource, /downloadUrl/);
assert.match(workerSource, /reportSnapshot/);
assert.match(workerSource, /inline-pdf-data-url-mvp/);
assert.match(workerSource, /studio\.report\.generated\.v1/);
assert.match(workerSource, /reportExports/);
assert.match(workerSource, /generatedAt/);
assert.match(mainSource, /response\.downloadUrl/);
assert.match(mainSource, /anchor\.download/);
assert.match(mainSource, /日本語PDF（印刷保存）/);
assert.match(mainSource, /window\.print/);
assert.match(mainSource, /escapePrintHtml/);
assert.match(mainSource, /clientName: currentCase\.clientName/);
assert.match(mainSource, /resultSummary: currentCase\.resultSummary/);
assert.match(workerSource, /completion-button-only/);
assert.match(workerSource, /studio\.session\.completed\.v1/);
assert.match(workerSource, /getPlanConfigForPlan/);
assert.match(workerSource, /export_detailed_report/);
assert.match(workerSource, /remove_report_branding/);
assert.match(planSource, /PRO_DETAILED_REPORT_REQUIRED/);
assert.match(planSource, /PRO_BRANDING_CONTROL_REQUIRED/);
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
assert.match(releasePlan, /Monthly completed appraisals: 20/);
assert.match(releasePlan, /Count trigger: pressing the appraisal completed button/);
assert.match(releasePlan, /In-progress draft appraisals: 1/);
assert.match(releasePlan, /Appraisal client profiles: unlimited/);
assert.match(releasePlan, /Visible completed appraisal details: latest 3 completed appraisals/);
assert.doesNotMatch(releasePlan, /Appraisal client snapshots: 3/);
assert.doesNotMatch(releasePlan, /Does not include:\n\n- PDF export/);
assert.match(releasePlan, /Business remains unavailable/);
assert.match(releasePlan, /workspaceId \+ userId \+ billingMonth/);

assert.equal(PLAN_CONFIG.free.entitlements.monthlyAppraisals, 20);
assert.equal(PLAN_CONFIG.free.entitlements.appraisalClients, "unlimited");
assert.equal(PLAN_CONFIG.free.entitlements.inProgressAppraisals, 1);
assert.equal(PLAN_CONFIG.free.entitlements.viewableCompletedAppraisals, 3);
assert.equal(PLAN_CONFIG.free.entitlements.pdfExport, true);
assert.equal(PLAN_CONFIG.free.entitlements.detailedReport, false);
assert.equal(PLAN_CONFIG.free.entitlements.brandedReport, false);
assert.equal(PLAN_CONFIG.pro.entitlements.monthlyAppraisals, "unlimited");
assert.equal(PLAN_CONFIG.pro.entitlements.appraisalClients, "unlimited");
assert.equal(PLAN_CONFIG.pro.entitlements.detailedReport, true);
assert.equal(PLAN_CONFIG.pro.entitlements.brandedReport, true);
assert.equal(PLAN_CONFIG.business.available, false);

const freeAtSessionLimit = createUsageSnapshot({ planId: "free", monthlyAppraisals: 20, appraisalClients: 0 });
assert.equal(evaluateUsageLimit(freeAtSessionLimit, "complete_appraisal").allowed, false);
assert.equal(evaluateUsageLimit(freeAtSessionLimit, "complete_appraisal").reason, "FREE_MONTHLY_APPRAISAL_LIMIT");

const freeAtDraftLimit = createUsageSnapshot({ planId: "free", monthlyAppraisals: 0, inProgressAppraisals: 1 });
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "save_in_progress_appraisal").allowed, false);
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "save_in_progress_appraisal").reason, "FREE_IN_PROGRESS_APPRAISAL_LIMIT");
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "export_pdf_report").allowed, true);
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "export_detailed_report").allowed, false);
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "export_detailed_report").reason, "PRO_DETAILED_REPORT_REQUIRED");
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "remove_report_branding").allowed, false);
assert.equal(evaluateUsageLimit(freeAtDraftLimit, "remove_report_branding").reason, "PRO_BRANDING_CONTROL_REQUIRED");

const freeVisibleHistory = createUsageSnapshot({ planId: "free", completedAppraisalIds: ["a", "b", "c", "d", "e"] });
assert.deepEqual(freeVisibleHistory.visibleCompletedAppraisalIds, ["c", "d", "e"]);
assert.deepEqual(freeVisibleHistory.lockedCompletedAppraisalIds, ["a", "b"]);

const dashboardSource = readFileSync("src/main.jsx", "utf8");
assert.match(dashboardSource, /鑑定完成/);
assert.match(dashboardSource, /途中保存/);
assert.match(dashboardSource, /表示できる鑑定履歴/);
assert.match(dashboardSource, /api\/appraisals\/complete/);
assert.match(dashboardSource, /api\/appraisals\/save-draft/);
assert.match(dashboardSource, /api\/reports\/export/);
assert.match(dashboardSource, /鑑定書出力/);
assert.match(dashboardSource, /Numeriaロゴを非表示/);
assert.doesNotMatch(dashboardSource, /3名までの鑑定対象者管理/);
assert.doesNotMatch(dashboardSource, /鑑定件数と鑑定対象者管理が上限なし/);

const proUnlimited = createUsageSnapshot({ planId: "pro", monthlyAppraisals: 200, appraisalClients: 50 });
assert.equal(evaluateUsageLimit(proUnlimited, "complete_appraisal").allowed, true);
assert.equal(evaluateUsageLimit(proUnlimited, "save_in_progress_appraisal").allowed, true);
assert.equal(evaluateUsageLimit(proUnlimited, "export_detailed_report").allowed, true);
assert.equal(evaluateUsageLimit(proUnlimited, "remove_report_branding").allowed, true);

console.log("Static Numeria Studio site backup verified.");