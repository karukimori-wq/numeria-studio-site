import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
const html = readFileSync(htmlPath, "utf8");

// The original application already renders its own bottom menu. The v1
// runtime appended a second, foreground menu to document.body. Keep the
// original menu and remove only that overlay from any restored build input.
let cleaned = html
  .replace(/<style\b[^>]*\bid=["']numeria-mobile-bottom-navigation-style["'][^>]*>[\s\S]*?<\/style>\s*/gi, "")
  .replace(/<script\b[^>]*\bid=["']numeria-mobile-bottom-navigation-runtime["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

// Upgrade the retained sidebar-as-bottom-menu, never append a second navigation.
const supportStart = 'function ensureSupportNav(){';
const supportEnd = 'function ensureChrome(){';
const start = cleaned.indexOf(supportStart), end = cleaned.indexOf(supportEnd, start);
if (start < 0 || end < start) throw new Error("Original support navigation generator was not found.");
cleaned = cleaned.slice(0, start) + `function ensureSupportNav(){var nav=document.querySelector(".sidebar nav");if(!nav||nav.querySelector("[data-mobile-support-nav]"))return;var button=document.createElement("button");button.type="button";button.setAttribute("data-mobile-support-nav","true");button.setAttribute("aria-label","設定を開く");button.innerHTML='<span class="nav-icon" aria-hidden="true"><svg class="numeria-settings-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg></span>設定';button.addEventListener("click",function(){if(window.NumeriaMobileSideMenu)window.NumeriaMobileSideMenu.openSettings()});nav.appendChild(button)}` + cleaned.slice(end);

const marker = "NumeriaRetainedMobileNavigation.v2";
if (!cleaned.includes(marker)) {
  const style = `<style id="numeria-retained-navigation-style">/* ${marker} */
@media (width <= 760px) and (orientation:portrait){
  aside.sidebar{bottom:calc(12px + env(safe-area-inset-bottom))!important;height:72px!important;box-sizing:border-box;left:12px!important;right:12px!important;width:auto!important}
  aside.sidebar nav{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:0!important;width:100%}
  aside.sidebar nav button{width:100%!important;min-width:0;justify-content:center;box-sizing:border-box}
  aside.sidebar nav button:nth-of-type(3){width:64px!important;height:64px!important;justify-self:center;margin-top:-16px!important;flex:none!important}
  .numeria-settings-icon{display:block;margin:auto;color:inherit}
  .main-area,.page,.editor-layout,.report-panel,.settings-page{padding-bottom:var(--numeria-navigation-clearance,136px)!important}
  html{scroll-padding-bottom:var(--numeria-navigation-clearance,136px)}
  .save-draft-button,.report-actions button,.action-row button,input,textarea,select{scroll-margin-bottom:var(--numeria-navigation-clearance,136px)}
  html.numeria-input-keyboard aside.sidebar{display:none!important}
}
@media (width <= 760px) and (orientation:landscape){aside.sidebar{display:none!important}.main-area,.page,.editor-layout,.report-panel,.settings-page{padding-bottom:24px!important}}
@media (width > 760px){aside.sidebar nav button[data-mobile-support-nav]{display:none!important}}
@media print{aside.sidebar{display:none!important}}
</style>`;
  const runtime = `<script id="numeria-retained-navigation-runtime">(()=>{
const root=document.documentElement,portrait=window.matchMedia("(max-width:760px) and (orientation:portrait)");let observed=null,lastClearance="";
function update(){var input=document.activeElement;var editing=!!(input&&input.matches&&input.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable="true"]'));var view=window.visualViewport;var keyboard=portrait.matches&&editing&&view&&window.innerHeight-view.height>150;root.classList.toggle("numeria-input-keyboard",!!keyboard);var sidebar=document.querySelector("aside.sidebar");if(sidebar&&sidebar!==observed&&observer){if(observed)observer.unobserve(observed);observed=sidebar;observer.observe(sidebar)}var clearance="0px";if(portrait.matches&&!keyboard){var rect=sidebar&&sidebar.getBoundingClientRect();clearance=Math.ceil(rect&&rect.height?Math.max(136,window.innerHeight-rect.top+24):136)+"px"}if(clearance!==lastClearance){lastClearance=clearance;root.style.setProperty("--numeria-navigation-clearance",clearance)}}
var observer=typeof ResizeObserver==="function"?new ResizeObserver(update):null;
window.addEventListener("resize",update);if(portrait.addEventListener)portrait.addEventListener("change",update);if(window.visualViewport)window.visualViewport.addEventListener("resize",update);document.addEventListener("focusin",update);document.addEventListener("focusout",function(){setTimeout(update,0)});document.addEventListener("numeria-navigation-ready",update);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",update);else update();if(typeof MutationObserver==="function")new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
})();</script>`;
  cleaned = cleaned.replace("</head>",style+"</head>").replace("</body>",runtime+"</body>");
}

writeFileSync(htmlPath, cleaned);
console.log("Original navigation retained: divination icon, line-art settings entry, portrait-only layout and keyboard-safe clearance.");
