import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaMobileMenuNativeFallback.v1";

// Keep mobile menu taps reliable on iOS Safari while still ignoring real scroll gestures.
if (html.includes(marker)) {
  throw new Error("Mobile menu native fallback patch was applied more than once.");
}

const oldNav = 'function nav(){return window.NumeriaNavigation||null}';
const newNav = 'let nativeFallbackPage="";function normalizedNativeText(node){return String(node&&node.textContent||"").replace(/\\s+/g," ").trim()}function nativeSidebarButton(label){return Array.from(document.querySelectorAll("aside.sidebar button")).find(function(button){return normalizedNativeText(button).indexOf(label)!==-1})||null}function clickNativeSidebarButton(label){var button=nativeSidebarButton(label);if(!button)return false;button.click();return true}function nativeRouteLabel(page){return{dashboard:"ダッシュボード",appraisalProfiles:"鑑定カルテ",settings:"鑑定書テンプレート",account:"アカウント管理",admin:"サイト管理"}[page]||""}function pageFromNativeButton(button){var text=normalizedNativeText(button);if(text.indexOf("ダッシュボード")!==-1)return"dashboard";if(text.indexOf("鑑定カルテ")!==-1)return"appraisalProfiles";if(text.indexOf("新しい鑑定")!==-1)return"reading";if(text.indexOf("鑑定書テンプレート")!==-1)return"settings";if(text.indexOf("アカウント管理")!==-1)return"account";if(text.indexOf("サイト管理")!==-1)return"admin";return""}function nativeFallbackApi(){if(!document.querySelector("aside.sidebar"))return null;return{version:"NumeriaNativeNavigationFallback.v1",go:function(page){var label=nativeRouteLabel(page);if(!label)return false;var ok=clickNativeSidebarButton(label);if(ok)nativeFallbackPage=page;return ok},newReading:function(){var ok=clickNativeSidebarButton("新しい鑑定");if(ok)nativeFallbackPage="reading";return ok},openFeedback:function(){return clickNativeSidebarButton("βフィードバック")},getPage:function(){var active=document.querySelector("aside.sidebar button.active");return pageFromNativeButton(active)||nativeFallbackPage},getRole:function(){return window.NumeriaAdminPreviewState&&window.NumeriaAdminPreviewState.adminMode?"admin":""},getPlan:function(){var state=window.NumeriaAdminPreviewState||{};return String(state.uiPlan||state.actualPlan||"free").toLowerCase()}}}function nav(){return window.NumeriaNavigation||nativeFallbackApi()}';

if (!html.includes(oldNav)) {
  throw new Error("Expected mobile menu nav() implementation was not found.");
}
html = html.replace(oldNav, newNav);

const oldEvents = 'function installGlobalItemEvents(){if(window.__numeriaMenuItemEventsInstalled)return;window.__numeriaMenuItemEventsInstalled=true;["click","pointerup","touchend"].forEach(function(type){document.addEventListener(type,function(event){var button=event.target&&event.target.closest&&event.target.closest("#"+MENU_ID+" .numeria-menu-item");if(!button)return;activateButton(button,event)}, {capture:true,passive:false})})}';
const newEvents = 'let menuTouchGesture=null;let lastTouchActivation=0;const MENU_TAP_MOVE_PX=18;function menuItemFromTarget(target){return target&&target.closest&&target.closest("#"+MENU_ID+" .numeria-menu-item")}function touchPoint(event){var touch=event.changedTouches&&event.changedTouches[0]||event.touches&&event.touches[0];return touch?{x:touch.clientX,y:touch.clientY}:null}function beginMenuTouch(event){var button=menuItemFromTarget(event.target),point=touchPoint(event);if(!button||!point)return;menuTouchGesture={button:button,x:point.x,y:point.y,moved:false}}function moveMenuTouch(event){var gesture=menuTouchGesture,point=touchPoint(event);if(!gesture||!point)return;var dx=point.x-gesture.x,dy=point.y-gesture.y;if(Math.sqrt(dx*dx+dy*dy)>MENU_TAP_MOVE_PX)gesture.moved=true}function endMenuTouch(event){var gesture=menuTouchGesture;menuTouchGesture=null;if(!gesture||gesture.moved)return;var button=menuItemFromTarget(event.target);if(!button||button!==gesture.button)return;lastTouchActivation=Date.now();activateButton(button,event)}function cancelMenuTouch(){menuTouchGesture=null}function installGlobalItemEvents(){if(window.__numeriaMenuItemEventsInstalled)return;window.__numeriaMenuItemEventsInstalled=true;document.addEventListener("touchstart",beginMenuTouch,{capture:true,passive:true});document.addEventListener("touchmove",moveMenuTouch,{capture:true,passive:true});document.addEventListener("touchend",endMenuTouch,{capture:true,passive:false});document.addEventListener("touchcancel",cancelMenuTouch,{capture:true,passive:true});document.addEventListener("click",function(event){var button=menuItemFromTarget(event.target);if(!button)return;if(Date.now()-lastTouchActivation<700){event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();return}activateButton(button,event)},{capture:true,passive:false})}';

if (!html.includes(oldEvents)) {
  throw new Error("Expected mobile menu global item event implementation was not found.");
}
html = html.replace(oldEvents, newEvents);

if (!html.includes("</head>")) {
  throw new Error("Expected closing head tag was not found.");
}
const scrollStyle = `<style id="numeria-menu-scroll-safe">/* ${marker} */#numeria-rebuilt-side-menu .numeria-menu-item{touch-action:manipulation!important}</style>`;
html = html.replace("</head>", `${scrollStyle}</head>`);

for (const token of [
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
]) {
  if (!html.includes(token)) {
    throw new Error(`Mobile menu fallback output is missing ${token}`);
  }
}

if (html.includes('["click","pointerup","touchend"]')) {
  throw new Error("Legacy swipe-sensitive menu event fan-out remains in Production HTML.");
}

writeFileSync(htmlPath, html);
console.log("Mobile menu native navigation fallback and scroll-safe tap recognition patched.");
