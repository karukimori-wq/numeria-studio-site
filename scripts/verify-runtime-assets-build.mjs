import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("dist/original.html", "utf8");
assert.match(html, /NumeriaStaleRouteRecovery\.v1/, "Production HTML must clear stale dedicated-page routes before app startup.");
assert.match(html, /NumeriaRuntimeAssetVersioning\.v1/, "Production HTML must include runtime asset versioning marker.");
assert.match(html, /NumeriaRuntimeBootDiagnostics\.v2/, "Production HTML must include browser runtime boot diagnostics.");
assert.match(html, /NumeriaMenuNavigationReadiness\.v1/, "Production HTML must include one-tap menu navigation readiness.");
assert.match(html, /NumeriaMobileMenuNativeFallback\.v1/, "Production HTML must include native app navigation fallback and scroll-safe taps.");

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
assert.ok(appSource.includes("NumeriaIOSRuntimeRecovery.v1"), "Versioned Numeria app bundle must contain the iOS runtime recovery marker.");
assert.ok(appSource.includes("numeria-navigation-ready"), "Versioned Numeria app bundle must signal navigation readiness.");
assert.ok(indexSource.includes(appMatch[1]), "Versioned index bundle must import the versioned Numeria app bundle.");

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

console.log(`Versioned runtime assets, stale-route recovery, native navigation fallback, and scroll-safe mobile menu verified: ${indexMatch[1]} -> ${appMatch[1]}`);
