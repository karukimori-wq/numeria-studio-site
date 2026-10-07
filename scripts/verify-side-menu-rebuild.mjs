import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const build = pkg.scripts?.build || "";
const navPatch = readFileSync("scripts/patch-navigation-bridge.mjs", "utf8");
const menuPatch = readFileSync("scripts/patch-side-menu-rebuild.mjs", "utf8");
const readinessPatch = readFileSync("scripts/patch-menu-navigation-readiness.mjs", "utf8");
const nativeFallbackPatch = readFileSync("scripts/patch-mobile-menu-native-fallback.mjs", "utf8");

assert.match(build, /patch-navigation-bridge\.mjs/, "Production build must expose the stable Navigation API.");
assert.match(build, /patch-side-menu-rebuild\.mjs/, "Production build must rebuild the side menu.");
assert.match(build, /patch-menu-navigation-readiness\.mjs/, "Production build must add one-tap navigation readiness after rebuilding the menu.");
assert.match(build, /patch-mobile-menu-native-fallback\.mjs/, "Production build must add native app navigation fallback and scroll-safe taps.");
assert.ok(build.indexOf("patch-mobile-menu-native-fallback.mjs") > build.indexOf("patch-menu-navigation-readiness.mjs"), "Native fallback must run after navigation readiness patch.");
assert.doesNotMatch(build, /patch-side-menu-tap-bridge\.mjs/, "Transparent tap bridge must not run in Production.");
assert.doesNotMatch(build, /patch-divination-current-label-click\.mjs/, "Text-click divination workaround must not run in Production.");
assert.doesNotMatch(build, /patch-divination-settings-menu-fallback\.mjs/, "Divination menu fallback must not run in Production.");

for (const token of ["NumeriaNavigationBridge.v2", "go:function(page){k(page)}", "newReading:function(){di()}", "openFeedback:function(){Vn(!0)}", "signOut:function(){return n()}", "getRole:function(){return tr}", "getPlan:function(){return ar}", "numeria-navigation-ready"]) {
  assert.ok(navPatch.includes(token), `Navigation bridge is missing ${token}`);
}

for (const label of ["ダッシュボード", "鑑定", "カルテ", "鑑定書", "テンプレート", "占術変更", "AI設定", "お知らせ", "問い合わせ", "プラン・契約", "アカウント", "集客・顧客管理", "Feedback Hub管理", "管理者メニュー", "ログアウト"]) {
  assert.ok(menuPatch.includes(label), `Side menu config is missing ${label}`);
}

for (const token of [
  'access: "proLocked"',
  'access: "businessOnly"',
  'access: "adminOnly"',
  'return state.admin?"enabled":"hidden"',
  'return state.admin||state.plan==="business"?"enabled":"hidden"',
  'return"locked"',
  '占術変更はProプラン以上で利用できます。',
  'class="numeria-menu-badge">PRO</span>',
  'if(access==="hidden")return""',
  'window.NumeriaAdminPreviewState&&window.NumeriaAdminPreviewState.adminMode',
  'var admin=role==="admin"||previewAdmin',
  'state.page+"|"+String(state.admin)',
]) {
  assert.ok(menuPatch.includes(token), `Side menu access matrix is missing ${token}`);
}

for (const token of [
  "NumeriaMenuNavigationReadiness.v1",
  "queuePageNavigation",
  "flushPendingNavigation",
  "waitForNavigationAction",
  "画面を準備しています…",
  'focus":".admin-feedback-list"',
  "Legacy retry behavior remains after readiness patch",
]) {
  assert.ok(readinessPatch.includes(token), `Menu readiness patch is missing ${token}`);
}

for (const token of [
  "NumeriaMobileMenuNativeFallback.v1",
  "NumeriaNativeNavigationFallback.v1",
  'document.querySelectorAll("aside.sidebar button")',
  'dashboard:"ダッシュボード"',
  'appraisalProfiles:"鑑定カルテ"',
  'settings:"鑑定書テンプレート"',
  'account:"アカウント管理"',
  'admin:"サイト管理"',
  'clickNativeSidebarButton("新しい鑑定")',
  'clickNativeSidebarButton("βフィードバック")',
  "MENU_TAP_MOVE_PX=18",
  'document.addEventListener("touchstart"',
  'document.addEventListener("touchmove"',
  'document.addEventListener("touchcancel"',
  "touch-action:manipulation",
  "Legacy swipe-sensitive menu event fan-out remains",
]) {
  assert.ok(nativeFallbackPatch.includes(token), `Native mobile menu fallback is missing ${token}`);
}

assert.ok(menuPatch.includes('htmlPath = "dist/original.html"'), "Rebuilt menu must patch the HTML actually used by the mobile app.");
assert.ok(menuPatch.includes("Single source of truth"), "Menu must keep one explicit source of truth.");
assert.ok(menuPatch.includes("#numeria-mobile-menu-button"), "Menu must provide a standalone menu-only top trigger.");
assert.ok(menuPatch.includes("background:transparent"), "The mobile top trigger must not recreate a top background band.");
assert.ok(menuPatch.includes("window.NumeriaNavigation"), "Menu must prefer the stable Navigation API.");
assert.ok(menuPatch.includes("installGlobalItemEvents"), "Menu items must be handled from a stable global event listener for mobile Safari.");
assert.ok(menuPatch.includes("activateButton(button,event)"), "Menu item activation must target the real menu button.");
assert.ok(menuPatch.includes("showNotice()"), "Notice menu item must open an in-app notice panel instead of doing nothing.");
assert.ok(menuPatch.includes("showAiSettings()"), "AI settings menu item must open its dedicated page.");
assert.ok(menuPatch.includes("numeria-ai-settings-page"), "AI settings page must have a dedicated mobile page container.");
assert.ok(menuPatch.includes("https://growth-engine.karukimori.workers.dev/"), "Business customer-management navigation must point to Growth Engine Production.");
assert.ok(!menuPatch.includes("clickLabel("), "Rebuilt menu must not use the retired generic label proxy.");
assert.ok(!menuPatch.includes("rgba(196,166,93,.001)"), "Rebuilt menu must not use transparent tap overlays.");

console.log("Rebuilt mobile side menu verified: Navigation API + native fallback, one-tap auto-resume, and scroll-safe pointer gestures.");
