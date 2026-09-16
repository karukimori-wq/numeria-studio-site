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

const adminReadinessPanel = `<style id="numeria-readiness-admin-style">
#numeria-admin-mode{position:fixed;right:16px;bottom:16px;z-index:9999;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#241b3a}
#numeria-admin-button{border:0;border-radius:999px;background:#241b3a;color:#f0cf6a;padding:12px 18px;font-weight:800;box-shadow:0 16px 40px rgba(36,27,58,.24)}
#numeria-admin-panel{display:none;position:absolute;right:0;bottom:56px;width:min(420px,calc(100vw - 32px));max-height:min(78vh,720px);overflow:auto;background:#fffdf8;border:1px solid #e5dfd2;border-radius:14px;box-shadow:0 24px 70px rgba(36,27,58,.26);padding:16px}
#numeria-admin-panel.is-open{display:block}
#numeria-admin-panel button,#numeria-admin-panel input{font:inherit}
.admin-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
.admin-header h2{font-size:18px;line-height:1.3;margin:0 0 5px}
.admin-header p,#numeria-admin-panel p{font-size:13px;line-height:1.7;margin:0 0 12px;color:#6b655f}
#numeria-admin-close{border:1px solid #ded7ca;background:#fff;border-radius:999px;color:#6b655f;width:36px;height:36px;font-size:18px;line-height:1}
.admin-help{background:#f7f1e5;border:1px solid #e8dcc7;border-radius:10px;padding:10px 12px;margin-bottom:12px}
.admin-help strong{display:block;font-size:13px;margin-bottom:3px}
.admin-target{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.admin-target label{display:grid;gap:4px;font-size:11px;font-weight:800;color:#6b655f}
.admin-target input{width:100%;box-sizing:border-box;border:1px solid #ded8cf;border-radius:8px;padding:8px;font-size:13px;color:#241b3a;background:#fff}
.admin-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px}
.admin-actions button{border:1px solid #d8c78a;background:#fff8e8;border-radius:10px;min-height:46px;padding:8px 9px;font-weight:800;color:#241b3a}
.admin-actions button.is-active{background:#241b3a;color:#f0cf6a;border-color:#241b3a}
.admin-summary{background:#fff;border:1px solid #e8e0d2;border-radius:12px;padding:12px;margin-bottom:10px}
.admin-summary b{display:block;font-size:14px;margin-bottom:4px}
.admin-summary span{color:#6b655f;font-size:12px;line-height:1.6}
.admin-output-toggle{border:0;background:transparent;color:#8e6e34;font-size:12px;font-weight:800;padding:4px 0;margin-bottom:6px}
#numeria-admin-output{display:none;white-space:pre-wrap;background:#f7f3ea;border-left:4px solid #c3a14a;padding:10px;min-height:48px;max-height:230px;overflow:auto;font-size:12px;line-height:1.6;color:#5f594f}
#numeria-admin-output.is-open{display:block}
@media(max-width:760px){#numeria-admin-button{display:none!important}#numeria-admin-panel{position:fixed!important;left:14px!important;right:14px!important;top:84px!important;bottom:auto!important;width:auto!important;max-height:calc(100vh - 210px);padding:18px}.admin-actions,.admin-target{grid-template-columns:1fr}}
</style><script>window.NumeriaInstallReadinessAdmin=function(){if(window.__numeriaReadinessAdminInstalled)return;window.__numeriaReadinessAdminInstalled=!0;var adminEmails=["illusionddt@gmail.com"];var labels={admin:"管理モード",contracts:"契約",usage:"対象ユーザー",release:"リリース",persistence:"保存",integrations:"連携",appraisals:"納品履歴",delivery:"納品状態"};var desc={admin:"管理者として状態確認できます。通常の鑑定操作には使いません。",contracts:"Free / Pro / Business の契約ルールや課金連携の状態を確認します。",usage:"workspaceId / userId に紐づく利用量を確認します。",release:"本番リリースに入っている機能と未対応項目を確認します。",persistence:"D1など保存先が使えているか確認します。",integrations:"Growth Engine、Feedback Hub、AI Platform Core など外部連携を確認します。",appraisals:"鑑定・納品履歴の保存状態を確認します。",delivery:"前払い・後払い・一部プレビューなど納品可否を確認します。"};function getEmail(){var u=window.Clerk&&window.Clerk.user;return String(u&&((u.primaryEmailAddress&&u.primaryEmailAddress.emailAddress)||(u.emailAddresses&&u.emailAddresses[0]&&u.emailAddresses[0].emailAddress))||"").trim().toLowerCase()}function isAdmin(){return adminEmails.indexOf(getEmail())>=0}function read(root,id,fallback){var el=root.querySelector(id);return String(el&&el.value||fallback).trim()}function pretty(data){try{return JSON.stringify(data,null,2)}catch(e){return String(data)}}async function fetchJson(url,headers){var res=await fetch(url,{headers:headers});var data=await res.json();if(!res.ok)throw new Error(data&&data.message||"状態を取得できませんでした。");return data}function summary(kind,data){var status=data&&data.status||data&&data.mode||"確認済み";var extra=desc[kind]||"確認しました。";if(kind==="admin")extra=data&&data.adminMode?"管理者として状態確認できます。編集・課金操作はここでは行いません。":"管理者として認識されていません。";if(kind==="persistence")extra="保存先: "+(data&&data.storageDriver||"確認中")+" / 永続保存: "+(data&&data.durable?"OK":"確認中");return "<b>"+labels[kind]+"："+status+"</b><span>"+extra+"</span>"}function ensurePanel(){if(document.getElementById("numeria-admin-mode"))return true;if(!isAdmin()||!document.body)return false;window.__numeriaAdminModeInstalled=true;var root=document.createElement("div");root.id="numeria-admin-mode";root.innerHTML='<button id="numeria-admin-button" type="button">管理者</button><section id="numeria-admin-panel" aria-label="管理者モード"><div class="admin-header"><div><h2>管理者メニュー</h2><p>本番公開前後の状態確認だけを行います。鑑定作業では基本的に使いません。</p></div><button id="numeria-admin-close" type="button" aria-label="閉じる">×</button></div><div class="admin-help"><strong>これは必要？</strong><p>通常利用には不要です。契約、保存、納品、外部連携が正しく動いているかを管理者だけが確認するための画面です。</p></div><div class="admin-target"><label>workspaceId<input id="numeria-admin-workspace" value="ws_personal" autocomplete="off"></label><label>userId<input id="numeria-admin-user" value="browser-user" autocomplete="off"></label></div><div class="admin-actions"></div><div class="admin-summary" id="numeria-admin-summary"><b>確認項目を選んでください</b><span>ボタンを押すと、本番の状態を読み取って要約します。</span></div><button class="admin-output-toggle" id="numeria-admin-output-toggle" type="button">詳細JSONを表示</button><div id="numeria-admin-output" role="status">まだ確認していません。</div></section>';document.body.appendChild(root);var panel=root.querySelector("#numeria-admin-panel");root.querySelector("#numeria-admin-button").addEventListener("click",function(){panel.classList.toggle("is-open")});root.querySelector("#numeria-admin-close").addEventListener("click",function(){panel.classList.remove("is-open")});root.querySelector("#numeria-admin-output-toggle").addEventListener("click",function(){var out=root.querySelector("#numeria-admin-output");out.classList.toggle("is-open");this.textContent=out.classList.contains("is-open")?"詳細JSONを隠す":"詳細JSONを表示"});document.addEventListener("keydown",function(e){if(e.key==="Escape")panel.classList.remove("is-open")});return true}function addButton(actions,key){if(actions.querySelector('[data-readiness-check="'+key+'"]'))return;var b=document.createElement("button");b.type="button";b.dataset.readinessCheck=key;b.textContent=labels[key];b.setAttribute("aria-label",desc[key]);actions.appendChild(b)}function enhance(){ensurePanel();var root=document.getElementById("numeria-admin-mode");var panel=document.getElementById("numeria-admin-panel");var actions=panel&&panel.querySelector(".admin-actions");var out=document.getElementById("numeria-admin-output");var box=document.getElementById("numeria-admin-summary");if(!root||!panel||!actions||!out||!box)return false;["admin","contracts","usage","release","persistence","integrations","appraisals","delivery"].forEach(function(key){addButton(actions,key)});if(actions.__listener)return true;actions.__listener=true;actions.addEventListener("click",async function(e){var btn=e.target.closest("[data-readiness-check]");if(!btn)return;var kind=btn.dataset.readinessCheck;Array.from(actions.querySelectorAll("button")).forEach(function(item){item.classList.toggle("is-active",item===btn)});var workspaceId=read(root,"#numeria-admin-workspace","ws_personal");var userId=read(root,"#numeria-admin-user","browser-user");var headers={"X-Admin-Email":getEmail(),"X-Workspace-Id":workspaceId,"X-User-Id":userId};var query="?workspaceId="+encodeURIComponent(workspaceId)+"&userId="+encodeURIComponent(userId);var url=kind==="admin"?"/api/admin/status":kind==="contracts"?"/contracts/status":kind==="usage"?"/api/admin/account"+query:kind==="release"?"/release/status":kind==="persistence"?"/persistence/status":kind==="integrations"?"/integrations/status":kind==="delivery"?"/api/reports/delivery-status"+query:"/api/appraisals/status"+query;box.innerHTML="<b>"+labels[kind]+"を確認中</b><span>"+desc[kind]+"</span>";out.textContent="確認しています...";try{var data=await fetchJson(url,headers);box.innerHTML=summary(kind,data);out.textContent=pretty(data)}catch(error){box.innerHTML="<b>取得できませんでした</b><span>"+(error&&error.message||"状態を取得できませんでした。")+"</span>";out.textContent=error&&error.message||"状態を取得できませんでした。"}});return true}function start(){enhance();if("MutationObserver"in window&&document.body)new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});setInterval(enhance,1000)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()};window.NumeriaInstallReadinessAdmin();</script>`;

const mobileInformationArchitecturePatch = `<style id="numeria-mobile-ia-style">
@media (width <= 760px){
  body{background:#f7f5f0}
  .main-area{padding-bottom:calc(132px + env(safe-area-inset-bottom))}
  .page{padding:86px 20px calc(132px + env(safe-area-inset-bottom))}
  .mobile-appbar{align-items:center;background:linear-gradient(180deg,#fbfaf7f7,#fbfaf7e8);backdrop-filter:blur(18px);display:grid;gap:10px;grid-template-columns:42px 1fr 42px 42px;left:0;padding:12px 18px 10px;position:fixed;right:0;top:0;z-index:130}
  .mobile-appbar button{align-items:center;background:#fffdf8;border:1px solid #e6dfd1;border-radius:14px;color:#171326;display:grid;font-size:22px;height:42px;justify-content:center;min-width:42px}
  .mobile-appbar .mobile-brand{color:#171326;font-family:Georgia,Yu Mincho,serif;font-size:18px;text-align:center}
  .mobile-appbar .mobile-notice{position:relative}
  .mobile-appbar .mobile-notice:after{background:#c4a65d;border-radius:50%;content:"";height:6px;position:absolute;right:9px;top:8px;width:6px}
  .sidebar{background:#fffcf7f2;border:1px solid #e5dfd2;border-radius:24px;box-shadow:0 14px 38px rgba(22,18,37,.16);height:66px;left:18px;right:18px;bottom:calc(38px + env(safe-area-inset-bottom));padding:5px 10px;z-index:120}
  .sidebar nav{align-items:center;gap:0;justify-content:space-between}
  .sidebar nav button{border-radius:18px;color:#706878;flex:1;font-size:9.5px;font-weight:700;min-height:50px;padding:4px 1px}
  .sidebar nav button .nav-icon{font-size:19px;height:21px;line-height:1;width:auto}
  .sidebar nav button.active{background:#f5eddf;color:#9d7737}
  .sidebar nav button:nth-of-type(3){background:linear-gradient(135deg,#bd9654,#dec580);border-radius:50%;box-shadow:0 9px 22px rgba(149,112,49,.27);color:#fff;flex:0 0 58px;height:58px;margin:-14px 2px 0;min-height:58px}
  .sidebar nav button:nth-of-type(3).active{color:#fff}
  .sidebar nav button:nth-of-type(3) .nav-icon{font-size:24px}
  .sidebar nav button:nth-of-type(4){display:flex}
  .sidebar nav button[data-mobile-support-nav]{display:flex!important}
  .sidebar nav button:nth-of-type(n+5):not([data-mobile-support-nav]),.brand,.nav-label,.sidebar-footer{display:none!important}
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
  .feedback{display:none!important}
  .mobile-support-backdrop{background:rgba(22,18,37,.42);display:none;inset:0;position:fixed;z-index:210}
  .mobile-support-backdrop.open{display:block}
  .mobile-support-panel{background:#fffdf8;border:1px solid #e3dacb;border-radius:20px 20px 0 0;bottom:0;box-shadow:0 -18px 60px rgba(25,19,42,.2);display:grid;gap:14px;left:0;max-height:82vh;overflow:auto;padding:18px 18px calc(34px + env(safe-area-inset-bottom));position:fixed;right:0;transform:translateY(105%);transition:transform .2s ease;z-index:220}
  .mobile-support-panel.open{transform:translateY(0)}
  .mobile-support-panel header{align-items:flex-start;display:flex;gap:12px;justify-content:space-between}
  .mobile-support-panel h2{font-family:Georgia,Yu Mincho,serif;font-size:24px;font-weight:500;line-height:1.25;margin:0}
  .mobile-support-panel p{color:#746b62;font-size:13px;line-height:1.7;margin:0}
  .mobile-support-close{background:#fff;border:1px solid #ded7ca;border-radius:50%;color:#2a2338;font-size:18px;height:36px;width:36px}
  .mobile-support-choices{display:grid;gap:8px;grid-template-columns:1fr 1fr}
  .mobile-support-choices button{background:#fff;border:1px solid #e4dac9;border-radius:12px;color:#2a2338;font-size:14px;font-weight:800;min-height:52px;padding:10px;text-align:left}
  .mobile-support-choices button.active{background:#f7eedb;border-color:#c9a75a;color:#8e6e34}
  .mobile-support-panel textarea{border:1px solid #ded7ca;border-radius:12px;color:#2a2338;font:inherit;min-height:108px;padding:12px;resize:vertical;width:100%}
  .mobile-support-submit{background:#9d7737;border:0;border-radius:999px;color:#fff;font-size:15px;font-weight:900;min-height:48px;padding:12px 16px}
  .mobile-support-status{color:#2f5f39;font-size:13px;font-weight:800;min-height:18px}
  #numeria-admin-mode{bottom:calc(116px + env(safe-area-inset-bottom))!important;right:18px!important}
  #numeria-admin-button{display:none!important}
  #numeria-admin-panel{position:fixed!important}
}
@media (width > 760px){
  .mobile-appbar,.mobile-menu-backdrop,.mobile-menu-panel{display:none!important}
}
</style><script>window.NumeriaInstallMobileInformationArchitecture=function(){if(window.__numeriaMobileIaInstalled)return;window.__numeriaMobileIaInstalled=true;function textOf(node){return (node&&node.textContent||"").replace(/\\s+/g,"").trim()}function findButton(label){return Array.from(document.querySelectorAll("button")).find(function(button){return textOf(button).includes(label)})}function clickLabel(label){var button=findButton(label);if(button)button.click()}function renameNav(){var buttons=Array.from(document.querySelectorAll(".sidebar nav button"));buttons.forEach(function(button){var text=textOf(button);if(text.includes("ダッシュボード"))button.childNodes[button.childNodes.length-1].textContent="ホーム";if(text.includes("鑑定カルテ"))button.childNodes[button.childNodes.length-1].textContent="カルテ";if(text.includes("新しい鑑定"))button.childNodes[button.childNodes.length-1].textContent="鑑定";if(text.includes("鑑定書テンプレート"))button.childNodes[button.childNodes.length-1].textContent="鑑定書";});}function supportUserId(){var u=window.Clerk&&window.Clerk.user;return String(u&&u.id||"browser-user")}function supportEmail(){var u=window.Clerk&&window.Clerk.user;return String(u&&((u.primaryEmailAddress&&u.primaryEmailAddress.emailAddress)||(u.emailAddresses&&u.emailAddresses[0]&&u.emailAddresses[0].emailAddress))||"")}function ensureSupportPanel(){var existing=document.querySelector(".mobile-support-panel");if(existing)return existing;var backdrop=document.createElement("div");backdrop.className="mobile-support-backdrop no-print";document.body.appendChild(backdrop);var panel=document.createElement("section");panel.className="mobile-support-panel no-print";panel.setAttribute("aria-label","サポート");panel.innerHTML='<header><div><h2>サポート</h2><p>質問、不具合、改善してほしい点を送れます。Free / Proどちらでも利用できます。</p></div><button class="mobile-support-close" type="button" aria-label="閉じる">×</button></header><div class="mobile-support-choices"><button type="button" data-support-category="faq">よくある質問</button><button type="button" data-support-category="bug_report">不具合を報告</button><button type="button" data-support-category="improvement_request">改善要望</button><button type="button" data-support-category="contact">問い合わせ</button></div><textarea placeholder="例: カルテ画面でボタンが押しにくいです。"></textarea><button class="mobile-support-submit" type="button">送信する</button><div class="mobile-support-status" role="status"></div>';document.body.appendChild(panel);var category="contact";var textarea=panel.querySelector("textarea");var status=panel.querySelector(".mobile-support-status");function close(){panel.classList.remove("open");backdrop.classList.remove("open")}function choose(next){category=next;Array.from(panel.querySelectorAll("[data-support-category]")).forEach(function(button){button.classList.toggle("active",button.dataset.supportCategory===category)});var guide={faq:"質問：\\n知りたいこと：",bug_report:"不具合：\\n発生した画面：\\n内容：",improvement_request:"改善要望：\\nこうなると嬉しい：",contact:"問い合わせ：\\n内容："}[category];if(!textarea.value.trim())textarea.value=guide;textarea.focus()}backdrop.addEventListener("click",close);panel.querySelector(".mobile-support-close").addEventListener("click",close);panel.querySelector(".mobile-support-choices").addEventListener("click",function(event){var button=event.target.closest("[data-support-category]");if(button)choose(button.dataset.supportCategory)});panel.querySelector(".mobile-support-submit").addEventListener("click",async function(){var message=textarea.value.trim();if(!message){status.textContent="内容を入力してください。";return}status.textContent="送信しています...";var payload={sourceApp:"numeria-studio",appId:"numeria-studio",appName:"Numeria Studio",appVersion:"mobile-support-sheet.v1",planId:"unknown",workspaceId:"ws_personal",userId:supportUserId(),userEmail:supportEmail(),currentScreen:document.title||"Numeria Studio",route:location.pathname,screenName:"mobile-support",category:category==="faq"?"question":category,device:"mobile",browser:navigator.userAgent,occurredAt:new Date().toISOString(),correlationId:"num_mobile_"+Date.now(),initialMessage:message};try{var res=await fetch("/api/feedback/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});status.textContent=res.ok?"送信しました。ありがとうございます。":"送信を受け付けました。必要に応じて再確認します。";if(res.ok)textarea.value=""}catch(error){try{localStorage.setItem("numeria.feedback.mobile.last",JSON.stringify(payload));status.textContent="通信できないため、この端末に一時保存しました。"}catch(e){status.textContent="通信できませんでした。時間をおいて再送してください。"}}});choose("contact");return panel}function openSupportPanel(){var panel=ensureSupportPanel();var backdrop=document.querySelector(".mobile-support-backdrop");panel.classList.add("open");if(backdrop)backdrop.classList.add("open")}function ensureSupportNav(){var nav=document.querySelector(".sidebar nav");if(!nav||nav.querySelector("[data-mobile-support-nav]"))return;var button=document.createElement("button");button.type="button";button.setAttribute("data-mobile-support-nav","true");button.innerHTML='<span class="nav-icon">?</span>サポート';button.addEventListener("click",openSupportPanel);nav.appendChild(button)}function ensureChrome(){if(!document.body||document.getElementById("numeria-mobile-appbar"))return;var appbar=document.createElement("div");appbar.id="numeria-mobile-appbar";appbar.className="mobile-appbar no-print";appbar.innerHTML='<button type="button" class="mobile-menu-toggle" aria-label="メニュー">☰</button><div class="mobile-brand">Numeria Studio</div><button type="button" class="mobile-notice" aria-label="お知らせ">♧</button><button type="button" class="mobile-support" aria-label="サポート">?</button>';document.body.appendChild(appbar);var backdrop=document.createElement("div");backdrop.className="mobile-menu-backdrop no-print";document.body.appendChild(backdrop);var panel=document.createElement("aside");panel.className="mobile-menu-panel no-print";panel.setAttribute("aria-label","メニュー");panel.innerHTML='<header><h2>Numeria Studio</h2><p>Free / Pro</p></header><section><button data-action="divination">占術の設定・変更</button><button data-action="template">鑑定書テンプレート</button><button data-action="guide">使い方</button></section><section><button data-action="plan">プラン・契約</button><button data-action="usage">利用状況</button><button data-action="account">アカウント設定</button></section><section><button data-action="growth">Growth Engine</button><button data-action="feedback">Feedback / サポート履歴</button></section><section class="admin-section"><button class="admin-only" data-action="admin">管理者メニュー</button><button data-action="logout">ログアウト</button></section>';document.body.appendChild(panel);function close(){panel.classList.remove("open");backdrop.classList.remove("open")}function open(){panel.classList.add("open");backdrop.classList.add("open")}appbar.querySelector(".mobile-menu-toggle").addEventListener("click",open);backdrop.addEventListener("click",close);appbar.querySelector(".mobile-support").addEventListener("click",openSupportPanel);appbar.querySelector(".mobile-notice").addEventListener("click",function(){alert("お知らせ\\n\\n新機能・メンテナンス・Pro機能追加・障害情報をここにまとめます。");});panel.addEventListener("click",function(event){var button=event.target.closest("button[data-action]");if(!button)return;var action=button.getAttribute("data-action");if(action==="divination")clickLabel("占術の変更");if(action==="template")clickLabel("鑑定書テンプレート");if(action==="guide")clickLabel("使い方");if(action==="plan"||action==="account")clickLabel("アカウント管理");if(action==="usage")clickLabel("ダッシュボード");if(action==="feedback")openSupportPanel();if(action==="admin"){var adminPanel=document.getElementById("numeria-admin-panel");if(adminPanel)adminPanel.classList.add("is-open");}if(action==="logout")clickLabel("退出");close();});}function refineDashboard(){var page=document.querySelector(".dashboard-page");if(!page)return;var hero=page.querySelector(".hero-card");var recent=page.querySelector(".recent-section");if(hero&&recent&&recent.nextSibling!==hero){recent.after(hero)}var divination=page.querySelector(".divination-switcher strong");if(divination&&!divination.dataset.mobileLabel){divination.dataset.mobileLabel="1";divination.textContent=divination.textContent.replace("現在の占術：","現在の占術　");}}function tick(){renameNav();ensureSupportNav();ensureChrome();refineDashboard()}function start(){tick();var observer=new MutationObserver(tick);observer.observe(document.body,{childList:true,subtree:true});setInterval(tick,1000)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()};window.NumeriaInstallMobileInformationArchitecture();</script>`;

const productionHtml = originalHtml
  .replace(unsupportedStrategyGuard, "")
  .replace("</head>", `${adminReadinessPanel}${mobileInformationArchitecturePatch}</head>`);

writeFileSync("dist/original.html", productionHtml);
writeFileSync("dist/original", productionHtml);
cpSync("assets", "dist/assets", { recursive: true });

await import("./patch-legacy-static-assets.mjs");

console.log("Original Numeria Studio HTML and assets restored into dist with Clerk production verification compatibility.");