import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaMobileMenuNativeFallback.v2";

if (html.includes(marker)) {
  throw new Error("Mobile menu native fallback patch was applied more than once.");
}

const oldNav = 'function nav(){return window.NumeriaNavigation||null}';
const newNav = 'let nativeFallbackPage="";function normalizedNativeText(node){return String(node&&node.textContent||"").replace(/\\s+/g," ").trim()}function nativeSidebarButtons(){return Array.from(document.querySelectorAll("aside.sidebar button"))}function nativeSidebarButton(labels){var wanted=Array.isArray(labels)?labels:[labels];var buttons=nativeSidebarButtons();for(var i=0;i<wanted.length;i++){var label=wanted[i];var exact=buttons.find(function(button){return normalizedNativeText(button)===label});if(exact)return exact;var ending=buttons.find(function(button){return normalizedNativeText(button).endsWith(label)});if(ending)return ending}for(var j=0;j<wanted.length;j++){var fallback=buttons.find(function(button){return normalizedNativeText(button).indexOf(wanted[j])!==-1});if(fallback)return fallback}return null}function nativeNavButtonByIndex(index){var buttons=Array.from(document.querySelectorAll("aside.sidebar nav button"));return buttons[index]||null}function nativeButtonForPage(page){var byLabel={dashboard:["ホーム","ダッシュボード"],appraisalProfiles:["カルテ","鑑定カルテ"],reading:["鑑定","新しい鑑定"],settings:["鑑定書","鑑定書テンプレート"],account:["アカウント管理","アカウント"],admin:["サイト管理"]}[page]||[];var button=nativeSidebarButton(byLabel);if(button)return button;var index={dashboard:0,appraisalProfiles:1,reading:2,settings:3}[page];return Number.isInteger(index)?nativeNavButtonByIndex(index):null}function clickNativePage(page){var button=nativeButtonForPage(page);if(!button)return false;button.click();nativeFallbackPage=page;return true}function pageFromNativeButton(button){var text=normalizedNativeText(button);if(text.endsWith("ホーム")||text.indexOf("ダッシュボード")!==-1)return"dashboard";if(text.endsWith("カルテ")||text.indexOf("鑑定カルテ")!==-1)return"appraisalProfiles";if(text.endsWith("鑑定")&&!text.endsWith("鑑定書")||text.indexOf("新しい鑑定")!==-1)return"reading";if(text.endsWith("鑑定書")||text.indexOf("鑑定書テンプレート")!==-1)return"settings";if(text.indexOf("アカウント管理")!==-1)return"account";if(text.indexOf("サイト管理")!==-1)return"admin";return""}function nativeFallbackApi(){if(!document.querySelector("aside.sidebar"))return null;return{version:"NumeriaNativeNavigationFallback.v2",go:function(page){return clickNativePage(page)},newReading:function(){return clickNativePage("reading")},openFeedback:function(){var button=nativeSidebarButton(["βフィードバック","サポート"]);if(!button)return false;button.click();return true},getPage:function(){var active=document.querySelector("aside.sidebar button.active");return pageFromNativeButton(active)||nativeFallbackPage},getRole:function(){return window.NumeriaAdminPreviewState&&window.NumeriaAdminPreviewState.adminMode?"admin":""},getPlan:function(){var state=window.NumeriaAdminPreviewState||{};return String(state.uiPlan||state.actualPlan||"free").toLowerCase()}}}function nav(){return window.NumeriaNavigation||nativeFallbackApi()}';

if (!html.includes(oldNav)) {
  throw new Error("Expected mobile menu nav() implementation was not found.");
}
html = html.replace(oldNav, newNav);

const oldRunPage = 'function runPageNavigation(item){var api=nav();if(!api||typeof api.go!=="function")return false;pendingNavigationItem=null;if(pendingNavigationTimer){clearInterval(pendingNavigationTimer);pendingNavigationTimer=null}closeMenu();api.go(item.page);if(item.focus)setTimeout(function(){waitForElement(item.focus,0)},60);return true}';
const newRunPage = 'function runPageNavigation(item){var api=nav();if(!api||typeof api.go!=="function")return false;var result=api.go(item.page);if(result===false)return false;pendingNavigationItem=null;if(pendingNavigationTimer){clearInterval(pendingNavigationTimer);pendingNavigationTimer=null}closeMenu();if(item.focus)setTimeout(function(){waitForElement(item.focus,0)},60);return true}';
if (!html.includes(oldRunPage)) {
  throw new Error("Expected queued page navigation implementation was not found.");
}
html = html.replace(oldRunPage, newRunPage);

const oldWaitAction = 'function waitForNavigationAction(isReady,run,preparingMessage,timeoutMessage){var api=nav();if(api&&isReady(api)){closeMenu();run(api);return}setStatus(preparingMessage);var started=Date.now();var timer=setInterval(function(){var readyApi=nav();if(readyApi&&isReady(readyApi)){clearInterval(timer);setStatus("");closeMenu();run(readyApi)}else if(Date.now()-started>8000){clearInterval(timer);setStatus(timeoutMessage)}},120)}';
const newWaitAction = 'function waitForNavigationAction(isReady,run,preparingMessage,timeoutMessage){function attempt(api){if(!api||!isReady(api))return false;var result=run(api);if(result===false)return false;setStatus("");closeMenu();return true}var api=nav();if(attempt(api))return;setStatus(preparingMessage);var started=Date.now();var timer=setInterval(function(){if(attempt(nav())){clearInterval(timer)}else if(Date.now()-started>8000){clearInterval(timer);setStatus(timeoutMessage)}},120)}';
if (!html.includes(oldWaitAction)) {
  throw new Error("Expected queued action navigation implementation was not found.");
}
html = html.replace(oldWaitAction, newWaitAction);

const oldEvents = 'function installGlobalItemEvents(){if(window.__numeriaMenuItemEventsInstalled)return;window.__numeriaMenuItemEventsInstalled=true;["click","pointerup","touchend"].forEach(function(type){document.addEventListener(type,function(event){var button=event.target&&event.target.closest&&event.target.closest("#"+MENU_ID+" .numeria-menu-item");if(!button)return;activateButton(button,event)}, {capture:true,passive:false})})}';
const newEvents = 'let menuPointerGesture=null;let suppressMenuClickUntil=0;const MENU_TAP_MOVE_PX=12;function menuItemFromTarget(target){return target&&target.closest&&target.closest("#"+MENU_ID+" .numeria-menu-item")}function beginMenuPointer(event){var button=menuItemFromTarget(event.target);if(!button||event.isPrimary===false)return;menuPointerGesture={button:button,pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false}}function moveMenuPointer(event){var gesture=menuPointerGesture;if(!gesture||gesture.pointerId!==event.pointerId)return;var dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.sqrt(dx*dx+dy*dy)>MENU_TAP_MOVE_PX)gesture.moved=true}function endMenuPointer(event){var gesture=menuPointerGesture;if(!gesture||gesture.pointerId!==event.pointerId)return;menuPointerGesture=null;var button=menuItemFromTarget(event.target);if(gesture.moved||button!==gesture.button){suppressMenuClickUntil=Date.now()+700;return}suppressMenuClickUntil=Date.now()+700;activateButton(button,event)}function cancelMenuPointer(){if(menuPointerGesture)suppressMenuClickUntil=Date.now()+700;menuPointerGesture=null}function installGlobalItemEvents(){if(window.__numeriaMenuItemEventsInstalled)return;window.__numeriaMenuItemEventsInstalled=true;document.addEventListener("pointerdown",beginMenuPointer,{capture:true,passive:true});document.addEventListener("pointermove",moveMenuPointer,{capture:true,passive:true});document.addEventListener("pointerup",endMenuPointer,{capture:true,passive:false});document.addEventListener("pointercancel",cancelMenuPointer,{capture:true,passive:true});document.addEventListener("click",function(event){var button=menuItemFromTarget(event.target);if(!button)return;if(Date.now()<suppressMenuClickUntil){event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();return}activateButton(button,event)},{capture:true,passive:false})}';

if (!html.includes(oldEvents)) {
  throw new Error("Expected mobile menu global item event implementation was not found.");
}
html = html.replace(oldEvents, newEvents);

if (!html.includes("</head>")) {
  throw new Error("Expected closing head tag was not found.");
}
const scrollStyle = `<style id="numeria-menu-scroll-safe">/* ${marker} */#numeria-rebuilt-side-menu .numeria-menu-item{touch-action:pan-y!important}</style>`;
html = html.replace("</head>", `${scrollStyle}</head>`);

for (const token of [
  "NumeriaNativeNavigationFallback.v2",
  'dashboard:["ホーム","ダッシュボード"]',
  'appraisalProfiles:["カルテ","鑑定カルテ"]',
  'reading:["鑑定","新しい鑑定"]',
  'settings:["鑑定書","鑑定書テンプレート"]',
  'nativeNavButtonByIndex(index)',
  'var result=api.go(item.page);if(result===false)return false',
  'var result=run(api);if(result===false)return false',
  "MENU_TAP_MOVE_PX=12",
  'document.addEventListener("pointerdown"',
  'document.addEventListener("pointermove"',
  'document.addEventListener("pointercancel"',
  "touch-action:pan-y",
]) {
  if (!html.includes(token)) {
    throw new Error(`Mobile menu fallback output is missing ${token}`);
  }
}

if (html.includes('["click","pointerup","touchend"]')) {
  throw new Error("Legacy swipe-sensitive menu event fan-out remains in Production HTML.");
}

writeFileSync(htmlPath, html);
console.log("Mobile menu native navigation fallback v2 patched for renamed bottom navigation and scroll-safe taps.");
