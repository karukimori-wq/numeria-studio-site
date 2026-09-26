import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaMobileSideMenu.v4";
if (html.includes(marker)) {
  throw new Error("Rebuilt mobile side menu was applied more than once.");
}

// This is the single source of truth for the mobile side menu.
// Keep the menu small: the top chrome only shows the menu trigger, while the panel holds the actual navigation.
const MENU_SECTIONS = [
  [
    { id: "reading", label: "鑑定", action: "newReading" },
    { id: "appraisalProfiles", label: "カルテ", action: "page", page: "appraisalProfiles" },
    { id: "notice", label: "お知らせ", action: "notice" },
    { id: "feedback", label: "問い合わせ", action: "feedback" },
  ],
  [
    { id: "divination", label: "占術変更", action: "page", page: "account", focus: ".account-divination-manager" },
    { id: "account", label: "アカウント", action: "page", page: "account", focus: ".account-header" },
    { id: "template", label: "鑑定書テンプレート", action: "page", page: "settings" },
  ],
  [
    { id: "admin", label: "管理者メニュー", action: "page", page: "admin", adminOnly: true },
    { id: "logout", label: "ログアウト", action: "logout" },
  ],
];

const style = `<style id="numeria-rebuilt-side-menu-style">
@media (width <= 760px){
  html.numeria-side-menu-open,html.numeria-side-menu-open body{overflow:hidden!important}
  #numeria-mobile-menu-button{position:fixed;left:10px;top:calc(8px + env(safe-area-inset-top));z-index:237;display:inline-flex;align-items:center;gap:6px;min-height:34px;border:0;background:transparent;color:#231c34;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.01em;padding:7px 8px;touch-action:manipulation;-webkit-tap-highlight-color:rgba(142,110,52,.16);cursor:pointer}
  #numeria-mobile-menu-button b{font-size:22px;line-height:1;font-weight:700;transform:translateY(-1px)}
  #numeria-rebuilt-menu-backdrop{position:fixed;inset:0;background:rgba(25,21,39,.28);z-index:238;opacity:0;pointer-events:none;transition:opacity .18s ease}
  #numeria-rebuilt-menu-backdrop.open{opacity:1;pointer-events:auto}
  #numeria-rebuilt-side-menu{position:fixed;left:0;top:0;bottom:0;width:min(84vw,370px);z-index:239;background:#fffdf8;border-right:1px solid #e8e1d3;box-shadow:18px 0 50px rgba(25,21,39,.16);transform:translateX(-105%);transition:transform .2s ease;overflow:auto;padding:calc(40px + env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom));font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171326;pointer-events:auto!important;-webkit-overflow-scrolling:touch}
  #numeria-rebuilt-side-menu.open{transform:translateX(0)}
  #numeria-rebuilt-side-menu header{padding:0 0 22px;border-bottom:1px solid #e7dfd0;margin-bottom:18px;pointer-events:none}
  #numeria-rebuilt-side-menu header h2{font-family:Georgia,'Yu Mincho',serif;font-size:25px;font-weight:500;letter-spacing:.01em;margin:0 0 8px}
  #numeria-rebuilt-side-menu header p{font-size:14px;color:#77707d;margin:0}
  #numeria-rebuilt-side-menu .numeria-menu-close{position:absolute;right:16px;top:calc(16px + env(safe-area-inset-top));width:38px;height:38px;border:1px solid #e3dccf;border-radius:999px;background:#fff;color:#5f5867;font-size:21px;line-height:1;pointer-events:auto!important;touch-action:manipulation}
  #numeria-rebuilt-side-menu nav{display:block;pointer-events:auto!important}
  #numeria-rebuilt-side-menu .numeria-menu-section{padding:0 0 14px;margin:0 0 14px;border-bottom:1px solid #e7dfd0;pointer-events:auto!important}
  #numeria-rebuilt-side-menu .numeria-menu-section:last-child{border-bottom:0;margin-bottom:0}
  #numeria-rebuilt-side-menu .numeria-menu-item{display:flex;align-items:center;width:100%;min-height:52px;border:0;background:transparent;border-radius:12px;padding:8px 12px;text-align:left;color:#201b2e;font:800 17px/1.35 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;touch-action:manipulation;pointer-events:auto!important;-webkit-tap-highlight-color:rgba(142,110,52,.18);cursor:pointer}
  #numeria-rebuilt-side-menu .numeria-menu-item:active,#numeria-rebuilt-side-menu .numeria-menu-item.active{background:#f5efe2;color:#8e6e34}
  #numeria-rebuilt-side-menu .numeria-menu-item[data-menu-id="logout"]{color:#746c78}
  #numeria-rebuilt-side-menu .numeria-menu-item[hidden]{display:none!important}
  #numeria-rebuilt-side-menu .numeria-menu-status{min-height:20px;padding:8px 12px 0;color:#8e6e34;font-size:12px;line-height:1.5}
  #numeria-menu-notice-panel{position:fixed;left:16px;right:16px;top:calc(76px + env(safe-area-inset-top));z-index:240;background:#fffdf8;border:1px solid #e8e1d3;border-radius:18px;box-shadow:0 18px 54px rgba(25,21,39,.18);padding:18px;color:#201b2e;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  #numeria-menu-notice-panel h2{margin:0 0 8px;font-size:18px}
  #numeria-menu-notice-panel p{margin:0 0 14px;color:#706777;font-size:14px;line-height:1.7}
  #numeria-menu-notice-panel button{border:1px solid #e3dccf;border-radius:999px;background:#fff;padding:8px 14px;font-weight:800;color:#201b2e}
}
@media (width > 760px){#numeria-mobile-menu-button,#numeria-rebuilt-side-menu,#numeria-rebuilt-menu-backdrop,#numeria-menu-notice-panel{display:none!important}}
</style>`;

const runtime = String.raw`(()=>{
const MARK="NumeriaMobileSideMenu.v4";
const MENU_SECTIONS=__MENU_CONFIG__;
const MENU_ID="numeria-rebuilt-side-menu";
const BACKDROP_ID="numeria-rebuilt-menu-backdrop";
const TOGGLE_ID="numeria-mobile-menu-button";
const NOTICE_ID="numeria-menu-notice-panel";
let lastActivation=0;
function nav(){return window.NumeriaNavigation||null}
function escapeHtml(value){return String(value).replace(/[&<>\"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]})}
function removeNotice(){var panel=document.getElementById(NOTICE_ID);if(panel)panel.remove()}
function closeMenu(){var menu=document.getElementById(MENU_ID);var backdrop=document.getElementById(BACKDROP_ID);if(menu)menu.classList.remove("open");if(backdrop)backdrop.classList.remove("open");document.documentElement.classList.remove("numeria-side-menu-open")}
function openMenu(){removeNotice();removeLegacyMenu();renderMenu();refreshState();var menu=document.getElementById(MENU_ID);var backdrop=document.getElementById(BACKDROP_ID);if(menu)menu.classList.add("open");if(backdrop)backdrop.classList.add("open");document.documentElement.classList.add("numeria-side-menu-open")}
function waitForElement(selector,attempt){if(!selector)return;var el=document.querySelector(selector);if(el){el.scrollIntoView({behavior:"smooth",block:"start"});return}if((attempt||0)<24)setTimeout(function(){waitForElement(selector,(attempt||0)+1)},80)}
function setStatus(message){var el=document.querySelector("#"+MENU_ID+" .numeria-menu-status");if(el)el.textContent=message||""}
function allItems(){return MENU_SECTIONS.flat ? MENU_SECTIONS.flat() : [].concat.apply([],MENU_SECTIONS)}
function findItem(id){return allItems().find(function(item){return item.id===id})||null}
function navigatePage(item){var api=nav();if(!api||typeof api.go!=="function"){setStatus("画面遷移の準備中です。少し待ってからもう一度押してください。");return}closeMenu();api.go(item.page);if(item.focus)setTimeout(function(){waitForElement(item.focus,0)},30)}
function showNotice(){closeMenu();removeNotice();var panel=document.createElement("section");panel.id=NOTICE_ID;panel.className="no-print";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","お知らせ");panel.innerHTML='<h2>お知らせ</h2><p>現在表示できる新しいお知らせはありません。リリース情報や重要な案内をここに表示します。</p><button type="button">閉じる</button>';document.body.appendChild(panel);panel.querySelector("button").addEventListener("click",removeNotice)}
function perform(item){if(!item)return;var api=nav();setStatus("");if(item.action==="page"){navigatePage(item);return}if(item.action==="newReading"){closeMenu();if(api&&typeof api.newReading==="function")api.newReading();else if(api&&typeof api.go==="function")api.go("reading");else setStatus("鑑定画面の準備中です。");return}if(item.action==="notice"){showNotice();return}if(item.action==="feedback"){closeMenu();if(api&&typeof api.openFeedback==="function")api.openFeedback();else setStatus("問い合わせ画面の準備中です。");return}if(item.action==="logout"){closeMenu();if(api&&typeof api.signOut==="function")Promise.resolve(api.signOut()).catch(function(){});else if(window.Clerk&&typeof window.Clerk.signOut==="function")window.Clerk.signOut();return}}
function activateButton(button,event){if(!button||button.hidden)return;if(event){event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation()}var now=Date.now();if(now-lastActivation<260)return;lastActivation=now;button.classList.add("active");setTimeout(function(){button.classList.remove("active")},180);perform(findItem(button.dataset.menuId))}
function itemHtml(item){return '<button type="button" class="numeria-menu-item" data-menu-id="'+escapeHtml(item.id)+'"'+(item.adminOnly?' data-admin-only="true" hidden':'')+'>'+escapeHtml(item.label)+'</button>'}
function renderMenu(){var existing=document.getElementById(MENU_ID);if(existing)return existing;var backdrop=document.createElement("div");backdrop.id=BACKDROP_ID;backdrop.className="no-print";document.body.appendChild(backdrop);var menu=document.createElement("aside");menu.id=MENU_ID;menu.className="no-print";menu.setAttribute("aria-label","メニュー");menu.innerHTML='<button type="button" class="numeria-menu-close" aria-label="メニューを閉じる">×</button><header><h2>Numeria Studio</h2><p>メニュー</p></header><nav>'+MENU_SECTIONS.map(function(section){return '<section class="numeria-menu-section">'+section.map(itemHtml).join('')+'</section>'}).join('')+'</nav><div class="numeria-menu-status" role="status"></div>';document.body.appendChild(menu);menu.querySelector(".numeria-menu-close").addEventListener("click",closeMenu);backdrop.addEventListener("click",closeMenu);return menu}
function removeLegacyMenu(){Array.from(document.querySelectorAll(".mobile-menu-panel,.mobile-menu-backdrop,#numeria-side-menu-tap-bridge,#numeria-side-menu-fallback-panel,#numeria-divination-settings-fallback")).forEach(function(node){node.remove()})}
function installToggle(){var existing=document.getElementById(TOGGLE_ID);if(existing)return existing;var button=document.createElement("button");button.id=TOGGLE_ID;button.className="no-print";button.type="button";button.setAttribute("aria-label","メニューを開く");button.innerHTML='<b>☰</b><span>メニュー</span>';document.body.appendChild(button);button.addEventListener("click",function(event){event.preventDefault();event.stopPropagation();openMenu()},{capture:true});button.addEventListener("touchend",function(event){event.preventDefault();event.stopPropagation();openMenu()},{capture:true,passive:false});return button}
function installGlobalItemEvents(){if(window.__numeriaMenuItemEventsInstalled)return;window.__numeriaMenuItemEventsInstalled=true;["click","pointerup","touchend"].forEach(function(type){document.addEventListener(type,function(event){var button=event.target&&event.target.closest&&event.target.closest("#"+MENU_ID+" .numeria-menu-item");if(!button)return;activateButton(button,event)}, {capture:true,passive:false})})}
function refreshState(){var api=nav();var role=api&&typeof api.getRole==="function"?api.getRole():"";var page=api&&typeof api.getPage==="function"?api.getPage():"";var menu=document.getElementById(MENU_ID);if(!menu)return;Array.from(menu.querySelectorAll("[data-admin-only]")).forEach(function(button){button.hidden=role!=="admin"});Array.from(menu.querySelectorAll(".numeria-menu-item")).forEach(function(button){var item=findItem(button.dataset.menuId);button.classList.toggle("active",!!(item&&item.page&&item.page===page))})}
function install(){if(!window.matchMedia("(max-width: 760px)").matches)return;removeLegacyMenu();renderMenu();installToggle();installGlobalItemEvents();refreshState()}
function start(){install();var observer=new MutationObserver(function(){install()});observer.observe(document.body,{childList:true,subtree:true});setInterval(function(){install();refreshState()},700)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.NumeriaMobileSideMenu={open:openMenu,close:closeMenu,refresh:refreshState,config:MENU_SECTIONS};
})();`.replace("__MENU_CONFIG__", JSON.stringify(MENU_SECTIONS));

const injection = `<!-- ${marker} -->${style}<script id="numeria-rebuilt-side-menu-script">${runtime}</script>`;
if (!html.includes("</body>")) {
  throw new Error("Expected </body> in restored Production HTML.");
}
html = html.replace("</body>", `${injection}</body>`);
writeFileSync(htmlPath, html);
console.log("Mobile side menu rebuilt with core Numeria items and a standalone menu-only top trigger.");
