import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaDedicatedSupportPlanPages.v1";

if (html.includes(marker)) {
  throw new Error("Dedicated support/plan pages patch was applied more than once.");
}

const oldPageAction = 'if(item.action==="page"){navigatePage(item);return}';
const newPageAction = 'if(item.id==="plan"){closeMenu();if(window.NumeriaDedicatedPages)window.NumeriaDedicatedPages.openPlan();return}if(item.action==="page"){navigatePage(item);return}';
if (!html.includes(oldPageAction)) {
  throw new Error("Expected side-menu page action was not found.");
}
html = html.replace(oldPageAction, newPageAction);

const oldFeedbackAction = 'if(item.action==="feedback"){waitForNavigationAction(function(ready){return typeof ready.openFeedback==="function"},function(ready){ready.openFeedback()},"問い合わせ画面を準備しています…","問い合わせ画面の読み込みに時間がかかっています。");return}';
const newFeedbackAction = 'if(item.action==="feedback"){closeMenu();if(window.NumeriaDedicatedPages)window.NumeriaDedicatedPages.openSupport();return}';
if (!html.includes(oldFeedbackAction)) {
  throw new Error("Expected queued feedback action was not found.");
}
html = html.replace(oldFeedbackAction, newFeedbackAction);

if (!html.includes("</head>") || !html.includes("</body>")) {
  throw new Error("Expected closing head/body tags were not found.");
}

const style = `<style id="numeria-dedicated-pages-style">/* ${marker} */
@media (width <= 760px){
  html.numeria-dedicated-page-open,html.numeria-dedicated-page-open body{overflow:hidden!important}
  #numeria-dedicated-pages{position:fixed;inset:0;z-index:245;background:#f7f5f0;color:#171326;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}
  #numeria-dedicated-pages[hidden]{display:none!important}
  #numeria-dedicated-pages .numeria-dedicated-page{display:none;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:linear-gradient(180deg,#fbfaf6 0,#f7f5f0 100%)}
  #numeria-dedicated-pages .numeria-dedicated-page.is-active{display:block}
  #numeria-dedicated-pages .numeria-page-header{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 18px 12px;background:rgba(251,250,246,.94);backdrop-filter:blur(18px);border-bottom:1px solid #e8e1d4}
  #numeria-dedicated-pages .numeria-page-back{width:42px;height:42px;flex:0 0 42px;border:1px solid #e2dacd;border-radius:14px;background:#fffdf8;color:#211a31;font-size:25px;line-height:1}
  #numeria-dedicated-pages .numeria-page-header small{display:block;color:#a1844c;font-size:10px;font-weight:900;letter-spacing:.16em;margin-bottom:3px}
  #numeria-dedicated-pages .numeria-page-header h1{font-family:Georgia,'Yu Mincho',serif;font-size:24px;font-weight:500;line-height:1.2;margin:0}
  #numeria-dedicated-pages .numeria-page-body{padding:22px 18px calc(42px + env(safe-area-inset-bottom))}
  #numeria-dedicated-pages .numeria-page-lead{border:1px solid #e6dfd1;border-radius:22px;background:#fffdf8;padding:20px;margin-bottom:18px;box-shadow:0 12px 28px rgba(35,28,52,.06)}
  #numeria-dedicated-pages .numeria-page-lead strong{display:block;font-size:19px;margin-bottom:7px}
  #numeria-dedicated-pages .numeria-page-lead p{margin:0;color:#6f6876;font-size:14px;line-height:1.8}
  #numeria-dedicated-pages .numeria-section-card{border:1px solid #e6dfd1;border-radius:22px;background:#fffdf8;padding:18px;margin-bottom:16px}
  #numeria-dedicated-pages .numeria-section-card h2{font-family:Georgia,'Yu Mincho',serif;font-size:20px;font-weight:500;margin:0 0 13px}
  #numeria-dedicated-pages .numeria-support-categories{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
  #numeria-dedicated-pages .numeria-support-category{min-height:48px;border:1px solid #dfd7c9;border-radius:14px;background:#fff;color:#2a2338;font-weight:800}
  #numeria-dedicated-pages .numeria-support-category.is-active{background:#211a31;border-color:#211a31;color:#efd279}
  #numeria-dedicated-pages label{display:grid;gap:7px;margin:0 0 14px;color:#655e69;font-size:12px;font-weight:800}
  #numeria-dedicated-pages select,#numeria-dedicated-pages textarea{width:100%;box-sizing:border-box;border:1px solid #dcd5df;border-radius:14px;background:#fff;color:#26202f;font:500 16px/1.55 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:13px 14px}
  #numeria-dedicated-pages textarea{min-height:150px;resize:vertical}
  #numeria-dedicated-pages .numeria-primary-action{width:100%;min-height:52px;border:0;border-radius:15px;background:linear-gradient(135deg,#b99042,#dfc472);color:#171326;font-weight:900;font-size:16px}
  #numeria-dedicated-pages .numeria-primary-action:disabled{opacity:.55}
  #numeria-dedicated-pages .numeria-page-status{min-height:24px;margin:12px 2px 0;color:#8e6e34;font-size:13px;line-height:1.6}
  #numeria-dedicated-pages .numeria-support-note{margin:14px 0 0;padding:13px 14px;border-radius:14px;background:#f7f1e5;color:#6f6555;font-size:12px;line-height:1.7}
  #numeria-dedicated-pages .numeria-current-plan{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #d9c995;border-radius:18px;background:#fffaf0;padding:16px;margin-bottom:18px}
  #numeria-dedicated-pages .numeria-current-plan small{display:block;color:#8e6e34;font-weight:900;font-size:10px;letter-spacing:.12em;margin-bottom:4px}
  #numeria-dedicated-pages .numeria-current-plan strong{font-size:20px}
  #numeria-dedicated-pages .numeria-current-plan span{border-radius:999px;background:#211a31;color:#efd279;padding:7px 10px;font-size:11px;font-weight:900}
  #numeria-dedicated-pages .numeria-plan-grid{display:grid;gap:14px}
  #numeria-dedicated-pages .numeria-plan-card{position:relative;border:1px solid #e4ddd0;border-radius:20px;background:#fff;padding:18px}
  #numeria-dedicated-pages .numeria-plan-card.is-current{border-color:#c6a554;box-shadow:0 0 0 2px rgba(198,165,84,.12)}
  #numeria-dedicated-pages .numeria-plan-card .numeria-plan-kicker{color:#a1844c;font-size:10px;font-weight:900;letter-spacing:.14em}
  #numeria-dedicated-pages .numeria-plan-card h3{font-family:Georgia,'Yu Mincho',serif;font-size:24px;font-weight:500;margin:5px 0 2px}
  #numeria-dedicated-pages .numeria-plan-price{font-size:18px;font-weight:900;margin:0 0 12px}
  #numeria-dedicated-pages .numeria-plan-price small{font-size:11px;color:#7a727e;font-weight:600}
  #numeria-dedicated-pages .numeria-plan-card ul{margin:0;padding-left:19px;color:#5f5867;font-size:13px;line-height:1.9}
  #numeria-dedicated-pages .numeria-plan-badge{position:absolute;right:14px;top:14px;border:1px solid #d5c27e;border-radius:999px;padding:4px 8px;color:#92702e;background:#fffaf0;font-size:9px;font-weight:900}
  #numeria-dedicated-pages .numeria-plan-footnote{margin:14px 2px 0;color:#7d7580;font-size:12px;line-height:1.7}
}
@media (width > 760px){#numeria-dedicated-pages{display:none!important}}
</style>`;
html = html.replace("</head>", `${style}</head>`);

const runtime = `<script id="numeria-dedicated-pages-runtime">/* ${marker} */(()=>{
const ROOT_ID="numeria-dedicated-pages";
const SUPPORT_HASH="#/support";
const PLAN_HASH="#/plan";
let supportCategory="contact";
function user(){return window.Clerk&&window.Clerk.user||null}
function workspaceId(){var u=user();return String(u&&u.organizationMemberships&&u.organizationMemberships[0]&&u.organizationMemberships[0].organization&&u.organizationMemberships[0].organization.id||"ws_personal")}
function userId(){var u=user();return String(u&&u.id||"browser-user")}
function userEmail(){var u=user();return String(u&&((u.primaryEmailAddress&&u.primaryEmailAddress.emailAddress)||(u.emailAddresses&&u.emailAddresses[0]&&u.emailAddresses[0].emailAddress))||"")}
function currentPlanFallback(){var preview=window.NumeriaAdminPreviewState||{};if(preview.actualPlan)return String(preview.actualPlan).toLowerCase();var api=window.NumeriaNavigation;try{if(api&&typeof api.getPlan==="function")return String(api.getPlan()||"free").toLowerCase()}catch(e){}return"free"}
function planLabel(plan){return plan==="pro"?"Pro":plan==="business"?"Business":"Free"}
function ensureRoot(){var root=document.getElementById(ROOT_ID);if(root)return root;root=document.createElement("div");root.id=ROOT_ID;root.hidden=true;root.innerHTML='<section class="numeria-dedicated-page" data-page="support"><header class="numeria-page-header"><button type="button" class="numeria-page-back" data-dedicated-close aria-label="戻る">‹</button><div><small>SUPPORT</small><h1>問い合わせ</h1></div></header><main class="numeria-page-body"><section class="numeria-page-lead"><strong>困ったこと・気づいたことを送れます</strong><p>質問、不具合、改善してほしい点をここから送信できます。Free / Proどちらでも利用できます。</p></section><section class="numeria-section-card"><h2>内容を送る</h2><div class="numeria-support-categories"><button type="button" class="numeria-support-category" data-support-category="question">質問</button><button type="button" class="numeria-support-category" data-support-category="bug_report">不具合</button><button type="button" class="numeria-support-category" data-support-category="improvement_request">改善要望</button><button type="button" class="numeria-support-category is-active" data-support-category="contact">その他</button></div><label>画面<select data-support-screen><option>ダッシュボード</option><option>鑑定</option><option>カルテ</option><option>鑑定書</option><option>テンプレート</option><option>プラン・契約</option><option>アカウント</option><option>その他</option></select></label><label>内容<textarea data-support-message placeholder="どこで迷ったか、期待した動き、起きたことなどを入力してください。"></textarea></label><button type="button" class="numeria-primary-action" data-support-submit>送信する</button><div class="numeria-page-status" data-support-status role="status"></div><p class="numeria-support-note">不具合報告はプランに関係なく送信できます。送信内容はNumeria Studioの改善確認に利用します。</p></section></main></section><section class="numeria-dedicated-page" data-page="plan"><header class="numeria-page-header"><button type="button" class="numeria-page-back" data-dedicated-close aria-label="戻る">‹</button><div><small>PLAN & BILLING</small><h1>プラン・契約</h1></div></header><main class="numeria-page-body"><section class="numeria-current-plan"><div><small>CURRENT PLAN</small><strong data-current-plan>確認中…</strong></div><span>契約状態</span></section><section class="numeria-section-card"><h2>プランを比較</h2><div class="numeria-plan-grid"><article class="numeria-plan-card" data-plan-card="free"><span class="numeria-plan-kicker">FREE</span><h3>Free</h3><p class="numeria-plan-price">¥0</p><ul><li>鑑定 月20件まで</li><li>依頼者プロフィール 3名まで</li><li>途中保存 1件</li><li>直近3件の鑑定履歴を閲覧</li><li>基本鑑定・基本レポート・PDF保存</li><li>メイン占術は固定</li></ul></article><article class="numeria-plan-card" data-plan-card="pro"><span class="numeria-plan-kicker">PRO</span><h3>Pro</h3><p class="numeria-plan-price">¥2,980 / 月 <small>税抜</small></p><ul><li>鑑定件数 上限なし</li><li>依頼者プロフィール 上限なし</li><li>途中保存・鑑定履歴 上限なし</li><li>占術の追加・切り替え</li><li>詳細鑑定・詳細レポート</li><li>ブランド入りレポート・文章調整</li></ul></article><article class="numeria-plan-card" data-plan-card="business"><span class="numeria-plan-badge">準備中</span><span class="numeria-plan-kicker">BUSINESS</span><h3>Business</h3><p class="numeria-plan-price">準備中</p><ul><li>Proの全機能</li><li>複数鑑定者・権限管理</li><li>Growth Engine連携</li></ul></article></div><p class="numeria-plan-footnote">契約変更・支払い操作はStripe連携の公開準備に合わせて、このページへ追加します。現在の契約状態は上部に表示します。</p></section></main></section>';
document.body.appendChild(root);
root.addEventListener("click",function(event){var close=event.target.closest("[data-dedicated-close]");if(close){closePage();return}var category=event.target.closest("[data-support-category]");if(category){supportCategory=category.dataset.supportCategory;root.querySelectorAll("[data-support-category]").forEach(function(button){button.classList.toggle("is-active",button===category)});return}var submit=event.target.closest("[data-support-submit]");if(submit)submitSupport(submit)});
return root}
function hideRoot(){var root=document.getElementById(ROOT_ID);if(root){root.hidden=true;root.querySelectorAll(".numeria-dedicated-page").forEach(function(page){page.classList.remove("is-active")})}document.documentElement.classList.remove("numeria-dedicated-page-open")}
function showPage(name){var root=ensureRoot();root.hidden=false;root.querySelectorAll(".numeria-dedicated-page").forEach(function(page){page.classList.toggle("is-active",page.dataset.page===name)});document.documentElement.classList.add("numeria-dedicated-page-open");var active=root.querySelector('.numeria-dedicated-page[data-page="'+name+'"]');if(active)active.scrollTop=0;if(name==="plan")loadPlan()}
function pushPage(name){var hash=name==="support"?SUPPORT_HASH:PLAN_HASH;if(location.hash!==hash)history.pushState({numeriaDedicatedPage:name},"",hash);showPage(name)}
function closePage(){if(history.state&&history.state.numeriaDedicatedPage){history.back();return}history.replaceState(null,"",location.pathname+location.search);hideRoot()}
function syncRoute(){if(location.hash===SUPPORT_HASH){showPage("support");return}if(location.hash===PLAN_HASH){showPage("plan");return}hideRoot()}
async function authHeaders(){var headers={"Content-Type":"application/json","X-Workspace-Id":workspaceId(),"X-User-Id":userId()};try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){var token=await window.Clerk.session.getToken();if(token)headers.Authorization="Bearer "+token}}catch(e){}return headers}
async function submitSupport(button){var root=ensureRoot();var message=String(root.querySelector("[data-support-message]").value||"").trim();var status=root.querySelector("[data-support-status]");if(!message){status.textContent="内容を入力してください。";return}button.disabled=true;status.textContent="送信しています…";var payload={sourceApp:"numeria-studio",appId:"numeria-studio",appName:"Numeria Studio",appVersion:"dedicated-support.v1",planId:currentPlanFallback(),workspaceId:workspaceId(),userId:userId(),userEmail:userEmail(),currentScreen:root.querySelector("[data-support-screen]").value,route:location.pathname,screenName:"support-page",category:supportCategory,device:"mobile",browser:navigator.userAgent,occurredAt:new Date().toISOString(),correlationId:"num_support_"+Date.now(),initialMessage:message};try{var res=await fetch("/api/feedback/submit",{method:"POST",headers:await authHeaders(),body:JSON.stringify(payload)});if(!res.ok)throw new Error("submit failed");root.querySelector("[data-support-message]").value="";status.textContent="送信しました。ありがとうございます。"}catch(error){try{localStorage.setItem("numeria.feedback.support.last",JSON.stringify(payload));status.textContent="通信できないため、この端末に一時保存しました。"}catch(e){status.textContent="送信できませんでした。時間をおいて再度お試しください。"}}finally{button.disabled=false}}
async function loadPlan(){var root=ensureRoot();var plan=currentPlanFallback();var label=root.querySelector("[data-current-plan]");function render(next){plan=next==="pro"||next==="business"?next:"free";label.textContent=planLabel(plan);root.querySelectorAll("[data-plan-card]").forEach(function(card){card.classList.toggle("is-current",card.dataset.planCard===plan)});var current=root.querySelector('[data-plan-card="'+plan+'"]');if(current&&!current.querySelector(".numeria-plan-badge")&&plan!=="business"){var badge=document.createElement("span");badge.className="numeria-plan-badge";badge.textContent="現在のプラン";current.appendChild(badge)}}render(plan);try{var response=await fetch("/api/billing/subscription?workspaceId="+encodeURIComponent(workspaceId()),{headers:await authHeaders()});var data=await response.json();var actual=data&&data.subscription&&data.subscription.planId||data&&data.planId;if(response.ok&&actual)render(String(actual).toLowerCase())}catch(e){}}
document.addEventListener("click",function(event){var trigger=event.target&&event.target.closest&&event.target.closest("[data-mobile-support-nav],.mobile-support");if(!trigger)return;event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();pushPage("support")},true);
window.addEventListener("popstate",syncRoute);
window.addEventListener("hashchange",syncRoute);
window.NumeriaDedicatedPages={openSupport:function(){pushPage("support")},openPlan:function(){pushPage("plan")},close:closePage};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",syncRoute);else syncRoute();
})();</script>`;
html = html.replace("</body>", `${runtime}</body>`);

for (const token of [
  marker,
  'item.id==="plan"',
  "window.NumeriaDedicatedPages.openPlan()",
  "window.NumeriaDedicatedPages.openSupport()",
  'data-page="support"',
  'data-page="plan"',
  'data-mobile-support-nav],.mobile-support',
  "/api/feedback/submit",
  "/api/billing/subscription?workspaceId=",
  "¥2,980 / 月",
  "契約変更・支払い操作はStripe連携の公開準備に合わせて",
]) {
  if (!html.includes(token)) {
    throw new Error(`Dedicated support/plan page output is missing ${token}`);
  }
}

writeFileSync(htmlPath, html);
console.log("Dedicated mobile support and plan pages patched with shared Support navigation and contract status loading.");
