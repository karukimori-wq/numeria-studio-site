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

for (const token of ["NumeriaNavigationBridge.v1", "go:function(page){k(page)}", "openGuide:function(){Fn(!0)}", "openFeedback:function(){Vn(!0)}", "signOut:function(){return n()}"]) {
  assert.ok(navPatch.includes(token), `Navigation bridge is missing ${token}`);
}

for (const label of ["占術の設定・変更", "鑑定書テンプレート", "使い方", "プラン・契約", "利用状況", "アカウント設定", "Growth Engine", "Feedback / サポート履歴", "管理者メニュー", "ログアウト"]) {
  assert.ok(menuPatch.includes(label), `Side menu config is missing ${label}`);
}

assert.ok(menuPatch.includes('htmlPath = "dist/original.html"'), "Rebuilt menu must patch the HTML actually used by the mobile app.");
assert.ok(menuPatch.includes("single source of truth"), "Menu must keep one explicit source of truth.");
assert.ok(menuPatch.includes("window.NumeriaNavigation"), "Menu must navigate through the stable Navigation API.");
assert.ok(!menuPatch.includes("clickLabel("), "Rebuilt menu must not proxy navigation by searching labels.");
assert.ok(!menuPatch.includes("rgba(196,166,93,.001)"), "Rebuilt menu must not use transparent tap overlays.");

console.log("Rebuilt mobile side menu contract verified: direct Navigation API, single config, no transparent/text-click hacks.");
