import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("dist")) {
  throw new Error("dist directory does not exist. Run vite build first.");
}

mkdirSync("dist/assets", { recursive: true });

const originalHtml = readFileSync("original.html", "utf8");
const unsupportedStrategyGuard = 'var strategies=supportedStrategies(signUp);if(!strategies.includes("email_code")){return{signUp:signUp,error:{message:"メール確認方式が現在のログイン設定で許可されていません。本番用のログイン設定を確認してください。"}}}';

if (!originalHtml.includes(unsupportedStrategyGuard)) {
  throw new Error("Expected Clerk email verification guard was not found in original.html.");
}

// Clerk's production instance can require email verification even when the legacy
// SignUp resource does not expose supportedStrategies at the location used by the
// compatibility bridge. The Clerk legacy API supports calling
// prepareEmailAddressVerification({ strategy: 'email_code' }) directly; Clerk then
// validates the configured strategy and returns the authoritative error if needed.
const adminReadinessPanel = `<script>window.NumeriaInstallReadinessAdmin=function(){if(window.__numeriaReadinessAdminInstalled)return;window.__numeriaReadinessAdminInstalled=!0;var adminEmails=["illusionddt@gmail.com"];function pretty(data){try{return JSON.stringify(data,null,2)}catch(error){return String(data)}}function readValue(root,id,fallback){var input=root&&root.querySelector(id);var value=input&&input.value;return(value||fallback||"").trim()||fallback||""}function getEmail(){var user=window.Clerk&&window.Clerk.user;return String(user&&((user.primaryEmailAddress&&user.primaryEmailAddress.emailAddress)||(user.emailAddresses&&user.emailAddresses[0]&&user.emailAddresses[0].emailAddress))||"").trim().toLowerCase()}function isAdminEmail(email){return email&&adminEmails.indexOf(email)>=0}function style(){if(document.getElementById("numeria-readiness-admin-style"))return;var tag=document.createElement("style");tag.id="numeria-readiness-admin-style";tag.textContent="#numeria-admin-mode{position:fixed;right:16px;bottom:16px;z-index:9999;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#241b3a}#numeria-admin-mode button{font:inherit}#numeria-admin-button{border:0;border-radius:999px;background:#241b3a;color:#f0cf6a;padding:12px 18px;font-weight:800;box-shadow:0 16px 40px rgba(36,27,58,.24);cursor:pointer}#numeria-admin-panel{display:none;position:absolute;right:0;bottom:56px;width:min(380px,calc(100vw - 32px));background:#fffdf8;border:1px solid #e5dfd2;border-radius:12px;box-shadow:0 24px 70px rgba(36,27,58,.26);padding:16px}#numeria-admin-panel.is-open{display:block}#numeria-admin-panel h2{font-size:18px;line-height:1.3;margin:0 0 8px}#numeria-admin-panel p{font-size:13px;line-height:1.7;margin:0 0 12px;color:#6b655f}#numeria-admin-panel .admin-target{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}#numeria-admin-panel .admin-target label{display:grid;gap:4px;font-size:11px;font-weight:700;color:#6b655f}#numeria-admin-panel .admin-target input{width:100%;box-sizing:border-box;border:1px solid #ded8cf;border-radius:8px;padding:8px;font-size:13px;color:#241b3a;background:#fff}#numeria-admin-panel .admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}#numeria-admin-panel .admin-actions button{border:1px solid #d8c78a;background:#f7efd9;border-radius:8px;padding:8px 10px;font-weight:700;color:#241b3a;cursor:pointer}#numeria-admin-output{white-space:pre-wrap;background:#f7f3ea;border-left:4px solid #c3a14a;padding:10px;min-height:48px;max-height:280px;overflow:auto;font-size:12px;line-height:1.6;color:#5f594f}@media(max-width:760px){#numeria-admin-mode{right:12px;bottom:12px}#numeria-admin-button{padding:11px 15px}#numeria-admin-panel{bottom:52px}}";document.head.appendChild(tag)}async function fetchJson(url,headers){var response=await fetch(url,{headers:headers||{}});var data=await response.json();if(!response.ok){throw new Error(data&&data.message||"状態を取得できませんでした。")}return data}function ensurePanel(){if(document.getElementById("numeria-admin-mode"))return!0;var email=getEmail();if(!isAdminEmail(email)||!document.body)return!1;window.__numeriaAdminModeInstalled=!0;style();var root=document.createElement("div");root.id="numeria-admin-mode";root.innerHTML='<button id="numeria-admin-button" type="button">管理者</button><section id="numeria-admin-panel" aria-label="管理者モード"><h2>管理者モード</h2><p>Productionの状態、契約ルール、ユーザー別の利用量、納品状態を確認します。編集や課金操作はまだ行いません。</p><div class="admin-target"><label>workspaceId<input id="numeria-admin-workspace" value="ws_personal" autocomplete="off"></label><label>userId<input id="numeria-admin-user" value="browser-user" autocomplete="off"></label></div><div class="admin-actions"></div><div id="numeria-admin-output" role="status">確認したい項目を選択してください。</div></section>';document.body.appendChild(root);var panel=root.querySelector("#numeria-admin-panel");root.querySelector("#numeria-admin-button").addEventListener("click",function(){panel.classList.toggle("is-open")});return!0}function addButton(actions,label,key){if(actions.querySelector('[data-readiness-check="'+key+'"]'))return;var button=document.createElement("button");button.type="button";button.setAttribute("data-readiness-check",key);button.textContent=label;actions.appendChild(button)}function enhance(){ensurePanel();var root=document.getElementById("numeria-admin-mode");var panel=document.getElementById("numeria-admin-panel");var actions=panel&&panel.querySelector(".admin-actions");var output=document.getElementById("numeria-admin-output");if(!root||!panel||!actions||!output)return!1;addButton(actions,"管理状態","admin");addButton(actions,"契約状態","contracts");addButton(actions,"対象を確認","usage");addButton(actions,"リリース状態","release");addButton(actions,"永続化","persistence");addButton(actions,"連携状態","integrations");addButton(actions,"納品履歴","appraisals");addButton(actions,"納品状態","delivery");if(actions.__numeriaReadinessListener)return!0;actions.__numeriaReadinessListener=!0;actions.addEventListener("click",async function(event){var button=event.target&&event.target.closest&&event.target.closest("[data-readiness-check]");if(!button)return;var kind=button.getAttribute("data-readiness-check");var workspaceId=readValue(root,"#numeria-admin-workspace","ws_personal");var userId=readValue(root,"#numeria-admin-user","browser-user");var email=getEmail();var headers={"X-Admin-Email":email,"X-Workspace-Id":workspaceId,"X-User-Id":userId};var targetQuery="?workspaceId="+encodeURIComponent(workspaceId)+"&userId="+encodeURIComponent(userId);var url=kind==="admin"?"/api/admin/status":kind==="contracts"?"/contracts/status":kind==="usage"?"/api/admin/account"+targetQuery:kind==="release"?"/release/status":kind==="persistence"?"/persistence/status":kind==="integrations"?"/integrations/status":kind==="delivery"?"/api/reports/delivery-status"+targetQuery:"/api/appraisals/status"+targetQuery;output.textContent="確認しています...";try{var data=await fetchJson(url,headers);output.textContent=pretty(data)}catch(error){output.textContent=error&&error.message||"状態を取得できませんでした。"}});return!0}function start(){enhance();var observer=null;if("MutationObserver"in window&&document.body){observer=new MutationObserver(function(){enhance()});observer.observe(document.body,{childList:!0,subtree:!0})}var tries=0;var timer=setInterval(function(){tries+=1;if(enhance()&&tries>20){clearInterval(timer)}else if(tries>240){clearInterval(timer);if(observer)observer.disconnect()}},250)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()};window.NumeriaInstallReadinessAdmin();</script>`;

const mobileInformationArchitecturePatch = `<style id="numeria-mobile-ia-style">
@media (width <= 760px){
  body{background:#f7f5f0}
  .main-area{padding-bottom:calc(190px + env(safe-area-inset-bottom))}
  .page{padding:86px 20px calc(190px + env(safe-area-inset-bottom))}
  .mobile-appbar{align-items:center;background:linear-gradient(180deg,#fbfaf7f7,#fbfaf7e8);backdrop-filter:blur(18px);display:grid;gap:10px;grid-template-columns:42px 1fr 42px 42px;left:0;padding:12px 18px 10px;position:fixed;right:0;top:0;z-index:130}
  .mobile-appbar button{align-items:center;background:#fffdf8;border:1px solid #e6dfd1;border-radius:14px;color:#171326;display:grid;font-size:22px;height:42px;justify-content:center;min-width:42px}
  .mobile-appbar .mobile-brand{color:#171326;font-family:Georgia,Yu Mincho,serif;font-size:18px;text-align:center}
  .mobile-appbar .mobile-notice{position:relative}
  .mobile-appbar .mobile-notice:after{background:#c4a65d;border-radius:50%;content:"";height:6px;position:absolute;right:9px;top:8px;width:6px}
  .sidebar{background:#fffcf7f2;border:1px solid #e5dfd2;border-radius:28px;box-shadow:0 18px 50px rgba(22,18,37,.18);height:82px;left:18px;right:18px;bottom:calc(86px + env(safe-area-inset-bottom));padding:7px 12px;z-index:120}
  .sidebar nav{align-items:center;gap:0;justify-content:space-between}
  .sidebar nav button{border-radius:20px;color:#706878;flex:1;font-size:11px;font-weight:700;min-height:64px;padding:7px 2px}
  .sidebar nav button .nav-icon{font-size:24px;height:25px;line-height:1;width:auto}
  .sidebar nav button.active{background:#f5eddf;color:#9d7737}
  .sidebar nav button:nth-of-type(3){background:linear-gradient(135deg,#bd9654,#dec580);border-radius:50%;box-shadow:0 10px 26px rgba(149,112,49,.3);color:#fff;flex:0 0 68px;height:68px;margin:-26px 4px 0;min-height:68px}
  .sidebar nav button:nth-of-type(3).active{color:#fff}
  .sidebar nav button:nth-of-type(3) .nav-icon{font-size:31px}
  .sidebar nav button:nth-of-type(4){display:flex}
  .sidebar nav button:nth-of-type(n+5),.brand,.nav-label,.sidebar-footer{display:none!important}
  .topbar{align-items:flex-start;margin-bottom:20px}
  .topbar-actions{display:none!important}
  .topbar p{font-size:14px;letter-spacing:.1em}
  .topbar h1{font-size:40px;line-height:1.15}
  .dashboard-page .divination-switcher{align-items:center;background:#fffdf8;border:1px solid #e7dfcf;border-radius:14px;display:flex;margin:0 0 16px;padding:13px 15px}
  .dashboard-page .divination-switcher .eyebrow{display:none}
  .dashboard-page .divination-switcher strong{font-family:Yu Mincho,Georgia,serif;font-size:17px;font-weight:500}
  .dashboard-page .divination-switcher strong:after{content:" 〉";color:#a08142}
  .dashboard-page .divination-switcher small{display:none}
  .dashboard-page .divination-switcher>div:nth-child(2){display:none}
  .next-work-card{background:radial-gradient(circle at 78% 44%,#2f294e 0,#191633 35%,#121027 72%);border:0;border-radius:18px;color:#fff;margin:0 0 16px;padding:23px 25px;position:relative;overflow:hidden}
  .next-work-card:after{border:1px solid rgba(211,184,125,.35);border-radius:50%;content:"7";color:#e4c98e;display:grid;font:46px Georgia,serif;height:106px;place-items:center;position:absolute;right:22px;top:28px;width:106px}
  .next-work-card h2{font-size:30px;line-height:1.3;margin:9px 0}
  .next-work-card p{color:#c7c2d2;font-size:14px;max-width:72%}
  .next-work-actions{display:grid;grid-template-columns:1fr 1fr;margin-top:18px;position:relative;z-index:1}
  .next-work-actions button{min-height:54px;width:100%}
  .next-work-actions button:nth-child(3){display:none}
  .stats-grid{grid-template-columns:1fr 1fr;margin:0 0 18px}
  .stats-grid article{border-radius:15px;min-height:118px;padding:18px}
  .stats-grid article:nth-child(n+3){display:none}
  .recent-section{background:#fff;border:1px solid #ebe5df;border-radius:17px;margin:0 0 18px;padding:18px}
  .reading-table{border:0;border-radius:0}
  .reading-table>button{grid-template-columns:42px 1fr 46px 14px;border-bottom:1px solid #eee8e0;padding:12px 0}
  .reading-table .status{background:transparent;color:#928b96;padding:0}
  .hero-card{min-height:232px;margin-top:8px;padding:30px 26px}
  .hero-copy h2{font-size:28px;line-height:1.45}
  .hero-copy p{font-size:14px}
  .hero-card .orbit{opacity:.55;right:-56px;top:70px}
  .dashboard-disclaimer{display:none}
  .mobile-menu-backdrop{background:rgba(22,18,37,.42);display:none;inset:0;position:fixed;z-index:190}
  .mobile-menu-backdrop.open{display:block}
  .mobile-menu-panel{background:#fffdf8;border-right:1px solid #e3dacb;bottom:0;box-shadow:18px 0 60px rgba(25,19,42,.18);display:flex;flex-direction:column;left:0;max-width:86vw;padding:22px 18px 34px;position:fixed;top:0;transform:translateX(-105%);transition:transform .2s ease;width:330px;z-index:200}
  .mobile-menu-panel.open{transform:translateX(0)}
  .mobile-menu-panel header{border-bottom:1px solid #eee6da;margin-bottom:14px;padding-bottom:16px}
  .mobile-menu-panel h2{font-family:Georgia,Yu Mincho,serif;font-size:22px;font-weight:500;margin:0 0 5px}
  .mobile-menu-panel p{color:#8b8177;font-size:12px;margin:0}
  .mobile-menu-panel section{border-bottom:1px solid #eee6da;display:grid;gap:5px;padding:12px 0}
  .mobile-menu-panel button{background:transparent;border:0;border-radius:10px;color:#2a2338;font-size:15px;font-weight:700;min-height:42px;padding:9px 10px;text-align:left}
  .mobile-menu-panel button:active{background:#f4ecdd}
  .mobile-menu-panel .admin-only{color:#8e6e34}
  #numeria-admin-mode{bottom:calc(184px + env(safe-area-inset-bottom))!important;right:18px!important}
  #numeria-admin-button{display:none!important}
  #numeria-admin-panel{bottom:0!important;position:fixed!important;right:12px!important;width:calc(100vw - 24px)!important}
}
@media (width > 760px){
  .mobile-appbar,.mobile-menu-backdrop,.mobile-menu-panel{display:none!important}
}
</style><script>window.NumeriaInstallMobileInformationArchitecture=function(){if(window.__numeriaMobileIaInstalled)return;window.__numeriaMobileIaInstalled=true;function textOf(node){return (node&&node.textContent||"").replace(/\\s+/g,"").trim()}function findButton(label){return Array.from(document.querySelectorAll("button")).find(function(button){return textOf(button).includes(label)})}function clickLabel(label){var button=findButton(label);if(button)button.click()}function renameNav(){var buttons=Array.from(document.querySelectorAll(".sidebar nav button"));buttons.forEach(function(button){var text=textOf(button);if(text.includes("ダッシュボード"))button.childNodes[button.childNodes.length-1].textContent="ホーム";if(text.includes("鑑定カルテ"))button.childNodes[button.childNodes.length-1].textContent="カルテ";if(text.includes("鑑定書テンプレート"))button.childNodes[button.childNodes.length-1].textContent="鑑定書";});}function ensureChrome(){if(!document.body||document.getElementById("numeria-mobile-appbar"))return;var appbar=document.createElement("div");appbar.id="numeria-mobile-appbar";appbar.className="mobile-appbar no-print";appbar.innerHTML='<button type="button" class="mobile-menu-toggle" aria-label="メニュー">☰</button><div class="mobile-brand">Numeria Studio</div><button type="button" class="mobile-notice" aria-label="お知らせ">♧</button><button type="button" class="mobile-support" aria-label="サポート">?</button>';document.body.appendChild(appbar);var backdrop=document.createElement("div");backdrop.className="mobile-menu-backdrop no-print";document.body.appendChild(backdrop);var panel=document.createElement("aside");panel.className="mobile-menu-panel no-print";panel.setAttribute("aria-label","メニュー");panel.innerHTML='<header><h2>Numeria Studio</h2><p>Free / Pro</p></header><section><button data-action="divination">占術の設定・変更</button><button data-action="template">鑑定書テンプレート</button><button data-action="guide">使い方</button></section><section><button data-action="plan">プラン・契約</button><button data-action="usage">利用状況</button><button data-action="account">アカウント設定</button></section><section><button data-action="growth">Growth Engine</button><button data-action="feedback">Feedback / サポート履歴</button></section><section class="admin-section"><button class="admin-only" data-action="admin">管理者メニュー</button><button data-action="logout">ログアウト</button></section>';document.body.appendChild(panel);function close(){panel.classList.remove("open");backdrop.classList.remove("open")}function open(){panel.classList.add("open");backdrop.classList.add("open")}appbar.querySelector(".mobile-menu-toggle").addEventListener("click",open);backdrop.addEventListener("click",close);appbar.querySelector(".mobile-support").addEventListener("click",function(){clickLabel("βフィードバック");clickLabel("困った");});appbar.querySelector(".mobile-notice").addEventListener("click",function(){alert("お知らせ\\n\\n新機能・メンテナンス・Pro機能追加・障害情報をここにまとめます。");});panel.addEventListener("click",function(event){var button=event.target.closest("button[data-action]");if(!button)return;var action=button.getAttribute("data-action");if(action==="divination")clickLabel("占術の変更");if(action==="template")clickLabel("鑑定書テンプレート");if(action==="guide")clickLabel("使い方");if(action==="plan"||action==="account")clickLabel("アカウント管理");if(action==="usage")clickLabel("ダッシュボード");if(action==="feedback")clickLabel("βフィードバック");if(action==="admin"){var panel=document.getElementById("numeria-admin-panel");if(panel)panel.classList.toggle("is-open");}if(action==="logout")clickLabel("退出");close();});}function refineDashboard(){var page=document.querySelector(".dashboard-page");if(!page)return;var hero=page.querySelector(".hero-card");var recent=page.querySelector(".recent-section");if(hero&&recent&&recent.nextSibling!==hero){recent.after(hero)}var divination=page.querySelector(".divination-switcher strong");if(divination&&!divination.dataset.mobileLabel){divination.dataset.mobileLabel="1";divination.textContent=divination.textContent.replace("現在の占術：","現在の占術　");}}function tick(){renameNav();ensureChrome();refineDashboard()}function start(){tick();var observer=new MutationObserver(tick);observer.observe(document.body,{childList:true,subtree:true});setInterval(tick,1000)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()};window.NumeriaInstallMobileInformationArchitecture();</script>`;

const productionHtml = originalHtml
  .replace(unsupportedStrategyGuard, "")
  .replace("</head>", `${adminReadinessPanel}${mobileInformationArchitecturePatch}</head>`);

writeFileSync("dist/original.html", productionHtml);
writeFileSync("dist/original", productionHtml);
cpSync("assets", "dist/assets", { recursive: true });

await import("./patch-legacy-static-assets.mjs");

console.log("Original Numeria Studio HTML and assets restored into dist with Clerk production verification compatibility.");