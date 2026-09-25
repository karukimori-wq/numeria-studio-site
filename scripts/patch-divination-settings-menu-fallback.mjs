import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/index.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaDivinationSettingsMenuFallback.v1";
if (html.includes(marker)) {
  throw new Error("Divination settings menu fallback was applied more than once.");
}

const fallbackSource = String.raw`(()=>{
const MARK="NumeriaDivinationSettingsMenuFallback.v1";
const OVERLAY_ID="numeria-divination-settings-fallback";
const OPTIONS=[
  {id:"numerology",label:"数秘術",desc:"生年月日や名前から基本傾向を読む"},
  {id:"tarot",label:"タロット",desc:"カードから現在の流れを読む"},
  {id:"four-pillars",label:"四柱推命",desc:"生年月日時から命式を読む"},
  {id:"western-astrology",label:"西洋占星術",desc:"星の配置から傾向を読む"}
];
function textOf(node){return String(node&&node.textContent||"").replace(/\s+/g,"").trim()}
function isTarget(node){var text=textOf(node);return text.indexOf("占術設定")>=0||text.indexOf("占術の変更")>=0||text.indexOf("占術変更")>=0||text.indexOf("DIVINATIONSETTINGS")>=0}
async function authHeaders(){var headers=new Headers({"Content-Type":"application/json","X-Workspace-Id":"ws_personal"});try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){var token=await window.Clerk.session.getToken();if(token)headers.set("Authorization","Bearer "+token)}}catch(error){}return headers}
async function fetchJson(url,options){var response=await fetch(url,Object.assign({cache:"no-store"},options||{}));var body=await response.json().catch(function(){return {}});if(!response.ok)throw new Error(body.message||"通信に失敗しました");return body}
async function loadState(){var headers=await authHeaders();var values=await Promise.all([
  fetchJson("/api/admin/status",{headers:headers}).catch(function(error){return {error:String(error.message||error)}}),
  fetchJson("/api/billing/subscription?workspaceId=ws_personal",{headers:headers}).catch(function(){return {subscription:{planId:"free"}}}),
  fetchJson("/api/user-preferences?workspaceId=ws_personal",{headers:headers}).catch(function(){return {preferences:{primary_divination:"numerology",enabled_divinations:["numerology"]}}})
]);
var admin=values[0],billing=values[1],prefs=values[2];
var preview=admin&&admin.developerPreview||null;
var adminMode=!!(admin&&admin.adminMode&&preview&&preview.businessUiPreviewEnabled);
return {headers:headers,adminMode:adminMode,actualPlan:billing&&billing.subscription&&billing.subscription.planId||"free",preferences:prefs&&prefs.preferences||{primary_divination:"numerology",enabled_divinations:["numerology"]}};
}
function esc(value){return String(value).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]})}
function styles(){if(document.getElementById("numeria-divination-settings-fallback-style"))return;var style=document.createElement("style");style.id="numeria-divination-settings-fallback-style";style.textContent="#"+OVERLAY_ID+"{position:fixed;inset:0;z-index:2147483646;background:rgba(22,18,37,.32);display:grid;align-items:end;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#"+OVERLAY_ID+" .nd-panel{background:#fffdf8;border-radius:26px 26px 0 0;border:1px solid #e6dfd1;box-shadow:0 -22px 60px rgba(22,18,37,.22);padding:22px 18px calc(28px + env(safe-area-inset-bottom));max-height:82vh;overflow:auto;color:#171326}#"+OVERLAY_ID+" .nd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}#"+OVERLAY_ID+" h2{margin:0;font-family:Georgia,'Yu Mincho',serif;font-size:25px;font-weight:500}#"+OVERLAY_ID+" p{margin:5px 0 0;color:#7c7582;font-size:13px;line-height:1.7}#"+OVERLAY_ID+" .nd-close{border:1px solid #ded7ca;background:#fff;border-radius:999px;width:40px;height:40px;font-size:22px;color:#5d5668}#"+OVERLAY_ID+" .nd-status{background:#f7f1e5;border-left:4px solid #c4a65d;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.7;margin:12px 0;color:#5f5132}#"+OVERLAY_ID+" .nd-options{display:grid;gap:10px;margin:14px 0}#"+OVERLAY_ID+" .nd-option{display:flex;gap:10px;align-items:flex-start;border:1px solid #e6dfd1;border-radius:16px;background:#fff;padding:13px 12px;text-align:left}#"+OVERLAY_ID+" .nd-option input{margin-top:4px;transform:scale(1.2)}#"+OVERLAY_ID+" .nd-option strong{display:block;font-size:16px;color:#171326}#"+OVERLAY_ID+" .nd-option span{display:block;font-size:12px;color:#847b87;margin-top:3px}#"+OVERLAY_ID+" .nd-primary{margin:12px 0;display:grid;gap:6px;font-size:13px;color:#6d6471}#"+OVERLAY_ID+" select{width:100%;font:inherit;border:1px solid #ded7ca;border-radius:12px;padding:11px;background:#fff;color:#171326}#"+OVERLAY_ID+" .nd-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}#"+OVERLAY_ID+" button{font:inherit}#"+OVERLAY_ID+" .nd-save{border:0;border-radius:16px;background:#c4a65d;color:#171326;font-weight:800;min-height:48px}#"+OVERLAY_ID+" .nd-save:disabled{opacity:.45}#"+OVERLAY_ID+" .nd-cancel{border:1px solid #ded7ca;border-radius:16px;background:#fff;color:#5d5668;font-weight:800;min-height:48px}#"+OVERLAY_ID+" .nd-message{margin-top:10px;font-size:13px;min-height:20px;color:#6d6471}";document.head.appendChild(style)}
function optionHtml(option,enabled,locked){return '<label class="nd-option"><input type="checkbox" value="'+esc(option.id)+'" '+(enabled.has(option.id)?'checked ':'')+(locked?'disabled ':'')+'><div><strong>'+esc(option.label)+'</strong><span>'+esc(option.desc)+'</span></div></label>'}
function selectHtml(primary,locked){return '<label class="nd-primary">メイン占術<select '+(locked?'disabled':'')+'>'+OPTIONS.map(function(option){return '<option value="'+esc(option.id)+'" '+(option.id===primary?'selected':'')+'>'+esc(option.label)+'</option>'}).join('')+'</select></label>'}
function renderOverlay(data){styles();var old=document.getElementById(OVERLAY_ID);if(old)old.remove();var overlay=document.createElement("div");overlay.id=OVERLAY_ID;var enabled=new Set(data.preferences.enabled_divinations||[data.preferences.primary_divination||"numerology"]);var primary=data.preferences.primary_divination||Array.from(enabled)[0]||"numerology";var locked=data.actualPlan==="free"&&!data.adminMode;var status=data.adminMode?"ADMIN PREVIEWとして占術変更を許可しています。実契約は"+data.actualPlan+"のままです。":locked?"Freeでは初回に選んだメイン占術を固定します。Proで変更できます。":"現在のプランでは占術変更できます。";overlay.innerHTML='<section class="nd-panel" role="dialog" aria-modal="true"><div class="nd-head"><div><h2>占術設定・変更</h2><p>どの画面からでも占術設定を変更できる補助パネルです。</p></div><button class="nd-close" type="button" aria-label="閉じる">×</button></div><div class="nd-status">'+esc(status)+'</div><div class="nd-options">'+OPTIONS.map(function(option){return optionHtml(option,enabled,locked)}).join('')+'</div>'+selectHtml(primary,locked)+'<div class="nd-actions"><button class="nd-cancel" type="button">閉じる</button><button class="nd-save" type="button" '+(locked?'disabled':'')+'>保存</button></div><div class="nd-message"></div></section>';document.body.appendChild(overlay);var close=function(){overlay.remove()};overlay.querySelector(".nd-close").addEventListener("click",close);overlay.querySelector(".nd-cancel").addEventListener("click",close);overlay.addEventListener("click",function(event){if(event.target===overlay)close()});var message=overlay.querySelector(".nd-message");overlay.querySelector(".nd-save").addEventListener("click",async function(){try{var selected=Array.from(overlay.querySelectorAll("input[type=checkbox]:checked")).map(function(input){return input.value});var chosenPrimary=overlay.querySelector("select").value;if(selected.indexOf(chosenPrimary)<0)selected.unshift(chosenPrimary);selected=Array.from(new Set(selected));if(selected.length===0)selected=[chosenPrimary||"numerology"];message.textContent="保存しています…";var headers=await authHeaders();await fetchJson("/api/user-preferences",{method:"PUT",headers:headers,body:JSON.stringify({workspaceId:"ws_personal",primary_divination:chosenPrimary,enabled_divinations:selected})});message.textContent="保存しました。画面を再読み込みすると反映されます。";window.setTimeout(function(){window.location.reload()},800)}catch(error){message.textContent=String(error&&error.message||"保存できませんでした")}})}
async function openPanel(){try{renderOverlay(await loadState())}catch(error){styles();var overlay=document.createElement("div");overlay.id=OVERLAY_ID;overlay.innerHTML='<section class="nd-panel"><div class="nd-head"><div><h2>占術設定・変更</h2><p>設定画面を開けませんでした。</p></div><button class="nd-close" type="button">×</button></div><div class="nd-status">'+esc(String(error&&error.message||error))+'</div></section>';document.body.appendChild(overlay);overlay.querySelector(".nd-close").addEventListener("click",function(){overlay.remove()})}}
document.addEventListener("click",function(event){var target=event.target;var node=target&&target.closest?target.closest("button,a,[role=button],li,div,span"):target;if(!node||!isTarget(node))return;event.preventDefault();event.stopPropagation();openPanel()},true);
window.NumeriaOpenDivinationSettingsFallback=openPanel;
})();`;

const script = `<script id="numeria-divination-settings-menu-fallback">${fallbackSource}</script>`;
const injection = `<!-- ${marker} -->${script}`;
if (html.includes("</body>")) {
  html = html.replace("</body>", `${injection}</body>`);
} else {
  html += injection;
}
writeFileSync(htmlPath, html);
console.log("Divination settings menu fallback injected into production HTML.");
