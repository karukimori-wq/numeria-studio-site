import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaMenuNavigationReadiness.v1";
if (html.includes(marker)) {
  throw new Error("Menu navigation readiness patch was applied more than once.");
}

const oldNavigate = 'function navigatePage(item){var api=nav();if(!api||typeof api.go!=="function"){setStatus("画面遷移の準備中です。少し待ってからもう一度押してください。");return}closeMenu();api.go(item.page);if(item.focus)setTimeout(function(){waitForElement(item.focus,0)},30)}';
const newNavigate = 'let pendingNavigationItem=null;let pendingNavigationTimer=null;function navigationReady(){var api=nav();return!!(api&&typeof api.go==="function")}function runPageNavigation(item){var api=nav();if(!api||typeof api.go!=="function")return false;pendingNavigationItem=null;if(pendingNavigationTimer){clearInterval(pendingNavigationTimer);pendingNavigationTimer=null}closeMenu();api.go(item.page);if(item.focus)setTimeout(function(){waitForElement(item.focus,0)},60);return true}function flushPendingNavigation(){if(!pendingNavigationItem||!navigationReady())return false;var item=pendingNavigationItem;setStatus("");return runPageNavigation(item)}function queuePageNavigation(item){pendingNavigationItem=item;setStatus("画面を準備しています…");if(flushPendingNavigation())return;var started=Date.now();if(pendingNavigationTimer)clearInterval(pendingNavigationTimer);pendingNavigationTimer=setInterval(function(){if(flushPendingNavigation()||Date.now()-started>8000){if(pendingNavigationTimer){clearInterval(pendingNavigationTimer);pendingNavigationTimer=null}if(pendingNavigationItem)setStatus("画面の読み込みに時間がかかっています。通信状態を確認してください。")}},120)}function waitForNavigationAction(isReady,run,preparingMessage,timeoutMessage){var api=nav();if(api&&isReady(api)){closeMenu();run(api);return}setStatus(preparingMessage);var started=Date.now();var timer=setInterval(function(){var readyApi=nav();if(readyApi&&isReady(readyApi)){clearInterval(timer);setStatus("");closeMenu();run(readyApi)}else if(Date.now()-started>8000){clearInterval(timer);setStatus(timeoutMessage)}},120)}function navigatePage(item){if(!runPageNavigation(item))queuePageNavigation(item)}';
if (!html.includes(oldNavigate)) {
  throw new Error("Expected side-menu navigatePage implementation was not found.");
}
html = html.replace(oldNavigate, newNavigate);

const oldNewReading = 'if(item.action==="newReading"){closeMenu();if(api&&typeof api.newReading==="function")api.newReading();else if(api&&typeof api.go==="function")api.go("reading");else setStatus("鑑定画面の準備中です。");return}';
const newNewReading = 'if(item.action==="newReading"){waitForNavigationAction(function(ready){return typeof ready.newReading==="function"},function(ready){ready.newReading()},"鑑定画面を準備しています…","鑑定画面の読み込みに時間がかかっています。");return}';
if (!html.includes(oldNewReading)) {
  throw new Error("Expected side-menu newReading implementation was not found.");
}
html = html.replace(oldNewReading, newNewReading);

const oldFeedback = 'if(item.action==="feedback"){closeMenu();if(api&&typeof api.openFeedback==="function")api.openFeedback();else setStatus("問い合わせ画面の準備中です。");return}';
const newFeedback = 'if(item.action==="feedback"){waitForNavigationAction(function(ready){return typeof ready.openFeedback==="function"},function(ready){ready.openFeedback()},"問い合わせ画面を準備しています…","問い合わせ画面の読み込みに時間がかかっています。");return}';
if (!html.includes(oldFeedback)) {
  throw new Error("Expected side-menu feedback implementation was not found.");
}
html = html.replace(oldFeedback, newFeedback);

const oldFeedbackAdmin = '{"id":"feedbackAdmin","label":"Feedback Hub管理","action":"page","page":"admin","access":"adminOnly"}';
const newFeedbackAdmin = '{"id":"feedbackAdmin","label":"Feedback Hub管理","action":"page","page":"admin","focus":".admin-feedback-list","access":"adminOnly"}';
if (!html.includes(oldFeedbackAdmin)) {
  throw new Error("Feedback Hub admin menu config was not found in the rebuilt menu runtime.");
}
html = html.replace(oldFeedbackAdmin, newFeedbackAdmin);

if (!html.includes("</body>")) {
  throw new Error("Expected closing body tag was not found.");
}
const readyListener = `<script id="numeria-menu-navigation-readiness">/* ${marker} */window.addEventListener("numeria-navigation-ready",function(){if(window.NumeriaMobileSideMenu&&typeof window.NumeriaMobileSideMenu.refresh==="function")window.NumeriaMobileSideMenu.refresh();});</script>`;
html = html.replace("</body>", `${readyListener}</body>`);

for (const staleText of [
  "画面遷移の準備中です。少し待ってからもう一度押してください。",
  "鑑定画面の準備中です。",
  "問い合わせ画面の準備中です。",
]) {
  if (html.includes(staleText)) {
    throw new Error(`Legacy retry behavior remains after readiness patch: ${staleText}`);
  }
}

writeFileSync(htmlPath, html);
console.log("Mobile menu navigation readiness patched: one-tap queue, automatic resume, Feedback Hub focus.");
