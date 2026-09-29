import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function assertBundleSyntax(source, label) {
  const parseableSource = source
    .replace(/\bimport\{[^;]+;\s*/g, "")
    .replace(/import\.meta\.url/g, "\"\"")
    .replace(/;?export\{[^}]+\};?/g, "");
  assert.doesNotThrow(() => new Function(parseableSource), `${label} must be syntactically valid JavaScript.`);
}

const html = readFileSync("dist/original.html", "utf8");
const extensionlessHtml = readFileSync("dist/original", "utf8");
assert.match(html, /NumeriaStaleRouteRecovery\.v1/, "Production HTML must clear stale dedicated-page routes before app startup.");
assert.match(html, /NumeriaRuntimeAssetVersioning\.v1/, "Production HTML must include runtime asset versioning marker.");
assert.match(html, /NumeriaRuntimeBootDiagnostics\.v5/, "Production HTML must include browser runtime boot diagnostics.");
assert.match(html, /numeria-recovery=NumeriaRuntimeBootDiagnostics\.v5/, "Production HTML must retry the cached legacy index with a recovery URL.");
assert.match(html, /numeria-direct=NumeriaRuntimeBootDiagnostics\.v5/, "Production HTML must include direct React mount recovery.");
assert.match(extensionlessHtml, /NumeriaRuntimeBootDiagnostics\.v5/, "Extensionless Production HTML must include browser runtime boot diagnostics.");
assert.match(extensionlessHtml, /numeria-recovery=NumeriaRuntimeBootDiagnostics\.v5/, "Extensionless Production HTML must retry the cached legacy index with a recovery URL.");
assert.match(extensionlessHtml, /numeria-direct=NumeriaRuntimeBootDiagnostics\.v5/, "Extensionless Production HTML must include direct React mount recovery.");
assert.ok(html.includes("function authMounted()"), "Production diagnostics must treat the login screen as a valid mounted surface.");
assert.ok(html.includes("はじめての方はこちら|新規登録|パスワードを忘れた方"), "Production diagnostics must recognize the signed-out login screen.");
assert.match(html, /NumeriaMenuNavigationReadiness\.v1/, "Production HTML must include one-tap menu navigation readiness.");
assert.match(html, /NumeriaMobileMenuNativeFallback\.v1/, "Production HTML must include native app navigation fallback and scroll-safe taps.");
const rscDonePosition = html.indexOf("self.__VINEXT_RSC_DONE__=true");
const bootstrapPosition = html.indexOf('<script id="_R_">import(');
assert.ok(rscDonePosition >= 0, "Production HTML must include inline RSC completion payload.");
assert.ok(bootstrapPosition >= 0, "Production HTML must include the Vinext index bootstrap.");
assert.ok(rscDonePosition < bootstrapPosition, "Production HTML must load inline RSC payload before the Vinext index bootstrap.");

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
assert.ok(appSource.includes("NumeriaIOSRuntimeRecovery.v2"), "Versioned Numeria app bundle must contain the iOS runtime recovery marker.");
assert.ok(appSource.includes("NumeriaAppBundleSyntaxGuards.v1"), "Versioned Numeria app bundle must contain syntax guard repairs.");
assert.ok(appSource.includes("numeria-navigation-ready"), "Versioned Numeria app bundle must signal navigation readiness.");
assertBundleSyntax(appSource, "Versioned Numeria app bundle");
assert.ok(indexSource.includes(appMatch[1]), "Versioned index bundle must import the versioned Numeria app bundle.");
assert.ok(indexSource.includes("NumeriaRscBootstrapOrder.v2"), "Versioned index bundle must wait for inline RSC payload before bootstrapping.");
assertBundleSyntax(indexSource, "Versioned index bundle");
assert.ok(extensionlessHtml.includes(appMatch[1]), "Extensionless Production HTML must reference the versioned Numeria app bundle.");
assert.ok(extensionlessHtml.includes(indexMatch[1]), "Extensionless Production HTML must reference the versioned index bundle.");
assert.ok(html.includes("data-numeria-direct-root"), "Production recovery must create a dedicated direct-mount root.");
assert.ok(html.includes('client.createRoot(root)'), "Production recovery must create a fresh React root for the empty direct-mount container.");
assert.ok(html.includes('render(React.createElement(Component))'), "Production recovery must directly mount the Numeria app component when RSC leaves the page blank.");
assert.ok(!extensionlessHtml.includes("assets/index-CYZnnbch.js"), "Extensionless Production HTML must not boot the stale index bundle.");
assert.ok(!extensionlessHtml.includes('import("/assets/index-CYZnnbch.js")'), "Extensionless Production HTML must not import the stale index bundle.");
assert.ok(!extensionlessHtml.includes("assets/numeria-app-Cckhajir.js"), "Extensionless Production HTML must not preload the stale Numeria app bundle.");

const legacyIndexSource = readFileSync("dist/assets/index-CYZnnbch.js", "utf8");
const legacyAppSource = readFileSync("dist/assets/numeria-app-Cckhajir.js", "utf8");
assert.ok(legacyIndexSource.includes(appMatch[1]), "Legacy index bundle must import the recovered Numeria app bundle.");
assert.ok(legacyIndexSource.includes("NumeriaRscBootstrapOrder.v2"), "Legacy index bundle must wait for inline RSC payload before bootstrapping.");
assertBundleSyntax(legacyIndexSource, "Legacy index bundle");
assert.ok(legacyAppSource.includes("NumeriaNavigationBridge.v2"), "Legacy Numeria app bundle must contain navigation bridge v2.");
assert.ok(legacyAppSource.includes("NumeriaIOSRuntimeRecovery.v2"), "Legacy Numeria app bundle must contain the iOS runtime recovery marker.");
assert.ok(legacyAppSource.includes("NumeriaAppBundleSyntaxGuards.v1"), "Legacy Numeria app bundle must contain syntax guard repairs.");
assertBundleSyntax(legacyAppSource, "Legacy Numeria app bundle");

assert.ok(html.includes('startsWith(prefix)'), "Production recovery must detect stale support/plan hashes.");
assert.ok(html.includes('history.replaceState(null,"",location.pathname+location.search)'), "Production recovery must remove stale dedicated-page route state.");
assert.ok(html.includes("queuePageNavigation"), "Production menu must queue one-tap navigation while the app hydrates.");
assert.ok(html.includes("waitForNavigationAction"), "Production menu must automatically resume reading/contact actions when Navigation API becomes ready.");
assert.ok(html.includes("NumeriaNativeNavigationFallback.v1"), "Production menu must fall back to the app's own React navigation controls.");
assert.ok(html.includes('document.querySelectorAll("aside.sidebar button")'), "Native fallback must be scoped to the app's own sidebar buttons.");
assert.ok(html.includes("MENU_TAP_MOVE_PX=12"), "Production menu must distinguish a tap from a scrolling gesture.");
assert.ok(html.includes('document.addEventListener("pointermove"'), "Production menu must observe pointer movement before activating an item.");
assert.ok(html.includes("touch-action:pan-y"), "Production menu items must allow vertical touch scrolling.");
assert.ok(!html.includes('["click","pointerup","touchend"]'), "Production menu must not activate every touchend/pointerup without movement checks.");
assert.ok(!html.includes("少し待ってからもう一度押してください"), "Production menu must not ask the user to tap the same item again.");
assert.ok(!extensionlessHtml.includes("function ensureMobileReportQuickbar(){"), "Extensionless Production HTML must remove the unused PDF quickbar generator.");
assert.ok(!extensionlessHtml.includes("ensureMobileReportQuickbar()"), "Extensionless Production HTML must remove the unused PDF quickbar tick hook.");
assert.ok(!extensionlessHtml.includes("途中保存は画面上部または下部"), "Extensionless Production HTML must not inject the removed draft-save instruction.");

console.log(`Versioned runtime assets, stale-route recovery, native navigation fallback, and scroll-safe mobile menu verified: ${indexMatch[1]} -> ${appMatch[1]}`);
