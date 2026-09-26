import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const build = pkg.scripts?.build || "";
const navPatch = readFileSync("scripts/patch-navigation-bridge.mjs", "utf8");
const menuPatch = readFileSync("scripts/patch-side-menu-rebuild.mjs", "utf8");

assert.match(build, /patch-navigation-bridge\.mjs/, "Production build must expose the stable Navigation API.");
assert.match(build, /patch-side-menu-rebuild\.mjs/, "Production build must rebuild the side menu.");
assert.doesNotMatch(build, /patch-side-menu-tap-bridge\.mjs/, "Transparent tap bridge must not run in Production.");
assert.doesNotMatch(build, /patch-divination-current-label-click\.mjs/, "Text-click divination workaround must not run in Production.");
assert.doesNotMatch(build, /patch-divination-settings-menu-fallback\.mjs/, "Divination menu fallback must not run in Production.");

for (const token of ["NumeriaNavigationBridge.v1", "go:function(page){k(page)}", "newReading:function(){di()}", "openFeedback:function(){Vn(!0)}", "signOut:function(){return n()}"]) {
  assert.ok(navPatch.includes(token), `Navigation bridge is missing ${token}`);
}

for (const label of ["鑑定", "カルテ", "お知らせ", "問い合わせ", "占術変更", "アカウント", "鑑定書テンプレート", "管理者メニュー", "ログアウト"]) {
  assert.ok(menuPatch.includes(label), `Side menu config is missing ${label}`);
}

assert.ok(menuPatch.includes('htmlPath = "dist/original.html"'), "Rebuilt menu must patch the HTML actually used by the mobile app.");
assert.ok(menuPatch.includes("single source of truth"), "Menu must keep one explicit source of truth.");
assert.ok(menuPatch.includes("#numeria-mobile-menu-button"), "Menu must provide a standalone menu-only top trigger.");
assert.ok(menuPatch.includes("background:transparent"), "The mobile top trigger must not recreate a top background band.");
assert.ok(menuPatch.includes("window.NumeriaNavigation"), "Menu must navigate through the stable Navigation API.");
assert.ok(menuPatch.includes("installGlobalItemEvents"), "Menu items must be handled from a stable global event listener for mobile Safari.");
assert.ok(menuPatch.includes('"pointerup"'), "Menu items must handle pointerup, not only click.");
assert.ok(menuPatch.includes('"touchend"'), "Menu items must handle touchend, not only click.");
assert.ok(menuPatch.includes("activateButton(button,event)"), "Menu item activation must target the real menu button.");
assert.ok(menuPatch.includes("showNotice()"), "Notice menu item must open an in-app notice panel instead of doing nothing.");
assert.ok(!menuPatch.includes("clickLabel("), "Rebuilt menu must not proxy navigation by searching labels.");
assert.ok(!menuPatch.includes("rgba(196,166,93,.001)"), "Rebuilt menu must not use transparent tap overlays.");
assert.ok(!menuPatch.includes("Growth Engine"), "Core mobile menu must not expose secondary product navigation by default.");

console.log("Rebuilt mobile side menu contract verified: core Numeria items, menu-only top trigger, direct Navigation API, real item tap events.");
