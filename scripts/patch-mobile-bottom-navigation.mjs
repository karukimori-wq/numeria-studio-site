import { readFileSync, writeFileSync } from "node:fs";
const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaMobileBottomNavigation.v1";
if (html.includes(marker)) throw new Error("Mobile bottom navigation was applied more than once.");
const style = `<style id="numeria-mobile-bottom-navigation-style">/* ${marker} */
#numeria-mobile-bottom-navigation{display:none}
@media (width <= 760px) and (orientation:portrait){
#numeria-mobile-bottom-navigation{position:fixed;left:0;right:0;bottom:0;z-index:235;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;min-height:70px;padding:7px max(8px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));border-top:1px solid #e5ded2;background:rgba(255,253,248,.96);box-shadow:0 -10px 28px rgba(31,24,57,.11);backdrop-filter:blur(16px);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#numeria-mobile-bottom-navigation button{min-width:0;min-height:51px;border:0;border-radius:13px;background:transparent;color:#6e6874;display:grid;place-items:center;align-content:center;gap:4px;padding:4px 2px;font:800 10px/1.15 inherit;touch-action:manipulation}
#numeria-mobile-bottom-navigation button[aria-current="page"]{background:#f4ecdc;color:#6f5424}
#numeria-mobile-bottom-navigation .numeria-bottom-symbol{font-size:18px;line-height:1}
#numeria-mobile-bottom-navigation .numeria-bottom-reading{position:relative;min-height:74px;margin-top:-24px;border-radius:999px 999px 16px 16px;background:#211936;color:#e0c16b;box-shadow:0 10px 24px rgba(31,24,57,.25)}
#numeria-mobile-bottom-navigation .numeria-bottom-reading .numeria-bottom-symbol{font-family:Georgia,'Yu Mincho',serif;font-size:38px;line-height:.9}
.page,.main-area,.reading-workspace,.settings-page{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
}</style>`;
const runtime = `<script id="numeria-mobile-bottom-navigation-runtime">/* ${marker} */(()=>{
const ID="numeria-mobile-bottom-navigation",items=[{id:"home",label:"ホーム",symbol:"⌂",page:"dashboard"},{id:"clients",label:"カルテ",symbol:"♙",page:"appraisalProfiles"},{id:"reading",label:"鑑定",symbol:"7",reading:true},{id:"reports",label:"鑑定書",symbol:"▤",page:"appraisalProfiles",focus:".history-heading"},{id:"settings",label:"設定",symbol:"⚙",page:"settings"}];
function nav(){return window.NumeriaNavigation}function refresh(forced){var api=nav(),page=api&&api.getPage?api.getPage():"",active=forced||(page==="dashboard"?"home":page==="appraisalProfiles"?"clients":page==="reading"?"reading":page==="settings"?"settings":"");document.querySelectorAll("#"+ID+" button").forEach(function(b){b.dataset.bottomNav===active?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current")})}
function activate(item){var api=nav();if(!api)return;item.reading?api.newReading():api.go(item.page);if(item.focus)setTimeout(function(){var t=document.querySelector(item.focus);if(t)t.scrollIntoView({behavior:"smooth",block:"start"})},120);refresh(item.id)}
function run(){if(!document.getElementById(ID)){var root=document.createElement("nav");root.id=ID;root.className="no-print";root.setAttribute("aria-label","主要メニュー");items.forEach(function(item){var b=document.createElement("button");b.type="button";b.dataset.bottomNav=item.id;if(item.reading)b.className="numeria-bottom-reading";b.innerHTML='<span class="numeria-bottom-symbol" aria-hidden="true">'+item.symbol+'</span><span>'+item.label+'</span>';b.addEventListener("click",function(){activate(item)});root.appendChild(b)});document.body.appendChild(root)}refresh()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();window.addEventListener("numeria-navigation-ready",run);new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});setInterval(run,800)})();</script>`;
html=html.replace("</head>",style+"</head>").replace("</body>",runtime+"</body>");
writeFileSync(htmlPath,html);
console.log("Portrait-phone five-item bottom navigation patched with the central 7 retained.");
