import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("dist/original.html", "utf8");
assert.match(html, /NumeriaRuntimeAssetVersioning\.v1/, "Production HTML must include runtime asset versioning marker.");
assert.match(html, /NumeriaMenuNavigationReadiness\.v1/, "Production HTML must include one-tap menu navigation readiness.");
assert.match(html, /NumeriaMobileMenuNativeFallback\.v2/, "Production HTML must include native app navigation fallback v2 and scroll-safe taps.");
assert.match(html, /NumeriaDedicatedSupportPlanPages\.v1/, "Production HTML must include dedicated Support and Plan pages.");

const appMatch = html.match(/assets\/(numeria-app-runtime-[a-f0-9]{12}\.js)/);
const indexMatch = html.match(/assets\/(index-runtime-[a-f0-9]{12}\.js)/);
assert.ok(appMatch, "Production HTML must reference a content-versioned Numeria app bundle.");
assert.ok(indexMatch, "Production HTML must reference a content-versioned index bundle.");

const appPath = `dist/assets/${appMatch[1]}`;
const indexPath = `dist/assets/${indexMatch[1]}`;
assert.ok(existsSync(appPath), `Versioned Numeria app bundle is missing: ${appPath}`);
assert.ok(existsSync(indexPath), `Versioned index bundle is missing: ${indexPath}`);

const appSource = readFileSync(appPath, "utf8");
const indexSource = readFileSync(indexPath, "utf8");
assert.ok(appSource.includes("NumeriaNavigationBridge.v2"), "Versioned Numeria app bundle must contain navigation bridge v2.");
assert.ok(appSource.includes("numeria-navigation-ready"), "Versioned Numeria app bundle must signal navigation readiness.");
assert.ok(indexSource.includes(appMatch[1]), "Versioned index bundle must import the versioned Numeria app bundle.");

assert.ok(html.includes("queuePageNavigation"), "Production menu must queue one-tap navigation while the app hydrates.");
assert.ok(html.includes("waitForNavigationAction"), "Production menu must automatically resume reading actions when Navigation API becomes ready.");
assert.ok(html.includes("NumeriaNativeNavigationFallback.v2"), "Production menu must fall back to the app's own React navigation controls.");
assert.ok(html.includes('dashboard:["ホーム","ダッシュボード"]'), "Native fallback must recognize the renamed mobile Home button.");
assert.ok(html.includes('appraisalProfiles:["カルテ","鑑定カルテ"]'), "Native fallback must recognize the renamed mobile Karte button.");
assert.ok(html.includes('reading:["鑑定","新しい鑑定"]'), "Native fallback must recognize the renamed mobile Reading button.");
assert.ok(html.includes('settings:["鑑定書","鑑定書テンプレート"]'), "Native fallback must recognize the renamed mobile Report button.");
assert.ok(html.includes("MENU_TAP_MOVE_PX=12"), "Production menu must distinguish a tap from a scrolling gesture.");
assert.ok(html.includes('document.addEventListener("pointermove"'), "Production menu must observe pointer movement before activating an item.");
assert.ok(html.includes("touch-action:pan-y"), "Production menu items must allow vertical touch scrolling.");
assert.ok(!html.includes('["click","pointerup","touchend"]'), "Production menu must not activate every touchend/pointerup without movement checks.");
assert.ok(html.includes('data-page="support"'), "Production HTML must contain the dedicated Support page.");
assert.ok(html.includes('data-page="plan"'), "Production HTML must contain the dedicated Plan page.");
assert.ok(html.includes("window.NumeriaDedicatedPages.openSupport()"), "Hamburger Inquiry must route to the dedicated Support page.");
assert.ok(html.includes("window.NumeriaDedicatedPages.openPlan()"), "Hamburger Plan must route to the dedicated Plan page.");
assert.ok(html.includes('data-mobile-support-nav],.mobile-support'), "Bottom Support must route to the same dedicated Support page.");
assert.ok(html.includes("/api/feedback/submit"), "Dedicated Support page must submit through the Feedback endpoint.");
assert.ok(html.includes("/api/billing/subscription?workspaceId="), "Dedicated Plan page must read current subscription state.");
assert.ok(!html.includes("少し待ってからもう一度押してください"), "Production menu must not ask the user to tap the same item again.");

console.log(`Versioned runtime assets, renamed native navigation, dedicated Support/Plan pages, and scroll-safe mobile menu verified: ${indexMatch[1]} -> ${appMatch[1]}`);
