import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/index.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaSideMenuTapBridge.v1";
if (html.includes(marker)) {
  throw new Error("Side menu tap bridge was applied more than once.");
}

const source = String.raw`(()=>{
const MARK="NumeriaSideMenuTapBridge.v1";
const LAYER_ID="numeria-side-menu-tap-bridge";
const PANEL_ID="numeria-side-menu-fallback-panel";
const ITEMS=[
  {key:"divination",labels:["占術の設定・変更","占術の設定","占術設定","占術の変更","占術変更"],title:"占術設定・変更",kind:"divination"},
  {key:"template",labels:["鑑定書テンプレート","テンプレート"],title:"鑑定書テンプレート",kind:"notice"},
  {key:"usage",labels:["使い方"],title:"使い方",kind:"notice"},
  {key:"billing",labels:["プラン・契約","プラン契約"],title:"プラン・契約",kind:"notice"},
  {key:"status",labels:["利用状況"],title:"利用状況",kind:"notice"},
  {key:"account",labels:["アカウント設定"],title:"アカウント設定",kind:"notice"},
  {key:"growth",labels:["Growth Engine"],title:"Growth Engine",kind:"notice"},
  {key:"feedback",labels:["Feedback / サポート履歴","Feedback/サポート履歴","サポート履歴"],title:"Feedback / サポート履歴",kind:"notice"},
  {key:"admin",labels:["管理者メニュー"],title:"管理者メニュー",kind:"notice"},
  {key:"logout",labels:["ログアウト"],title:"ログアウト",kind:"logout"}
];
function compact(value){return String(value||"").replace(/\s+/g,"").trim()}
function visible(el){if(!el||!(el instanceof Element))return false;const rect=el.getBoundingClientRect();const style=getComputedStyle(el);return rect.width>20&&rect.height>14&&rect.left<window.innerWidth&&rect.right>0&&rect.top<window.innerHeight&&rect.bottom>0&&style.visibility!=="hidden"&&style.display!=="none"&&Number(style.opacity||1)>0.05}
function matchItem(el){const text=compact(el.textContent);if(!text)return null;return ITEMS.find(item=>item.labels.some(label=>text.includes(compact(label))))||null}
function likelyMenuNode(el){const rect=el.getBoundingClientRect();return rect.left<window.innerWidth*.9&&rect.width<window.innerWidth*.95&&rect.height<120&&rect.top>40&&rect.bottom<window.innerHeight-30}
function ensureStyle(){if(document.getElementById("numeria-side-menu-tap-bridge-style"))return;const style=document.createElement("style");style.id="numeria-side-menu-tap-bridge-style";style.textContent="#"+LAYER_ID+"{position:fixed;inset:0;z-index:2147483645;pointer-events:none}#"+LAYER_ID+" button{position:fixed;z-index:2147483645;pointer-events:auto;background:rgba(196,166,93,.001);border:0;border-radius:12px;padding:0;margin:0;-webkit-tap-highlight-color:rgba(196,166,93,.18);touch-action:manipulation}#"+LAYER_ID+" button:active{background:rgba(196,166,93,.12)}#"+PANEL_ID+"{position:fixed;inset:0;z-index:2147483647;background:rgba(22,18,37,.32);display:grid;align-items:end;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#"+PANEL_ID+" .ns-panel{background:#fffdf8;border-radius:26px 26px 0 0;border:1px solid #e6dfd1;box-shadow:0 -22px 60px rgba(22,18,37,.22);padding:22px 18px calc(28px + env(safe-area-inset-bottom));max-height:74vh;overflow:auto;color:#171326}#"+PANEL_ID+" h2{margin:0 0 8px;font-family:Georgia,'Yu Mincho',serif;font-size:24px;font-weight:500}#"+PANEL_ID+" p{color:#746d78;font-size:14px;line-height:1.8}#"+PANEL_ID+" button{font:inherit;border:1px solid #ded7ca;border-radius:16px;background:#fff;min-height:46px;padding:0 16px;font-weight:800;color:#5d5668}";document.head.appendChild(style)}
function closeDrawer(){const closeCandidates=Array.from(document.querySelectorAll('button,[role=button],a,div,span')).filter(el=>{const text=compact(el.textContent);return text==="×"||text==="閉じる"||text==="メニュー"});const leftButtons=closeCandidates.filter(visible).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);if(leftButtons[0]){try{leftButtons[0].click()}catch(e){}}}
function noticePanel(title){ensureStyle();document.getElementById(PANEL_ID)?.remove();const panel=document.createElement("div");panel.id=PANEL_ID;panel.innerHTML='<section class="ns-panel"><h2>'+escapeHtml(title)+'</h2><p>このメニュー項目は検出できました。既存の画面遷移が反応しないため、次の修正でこの項目を専用画面へ直接つなぎます。</p><button type="button">閉じる</button></section>';document.body.appendChild(panel);panel.querySelector("button").addEventListener("click",()=>panel.remove());panel.addEventListener("click",event=>{if(event.target===panel)panel.remove()});}
function escapeHtml(value){return String(value).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]))}
function activate(item){if(!item)return;if(item.kind==="divination"){if(typeof window.NumeriaOpenDivinationSettingsFallback==="function"){window.NumeriaOpenDivinationSettingsFallback();return}noticePanel("占術設定・変更");return}if(item.kind==="logout"){if(window.Clerk&&typeof window.Clerk.signOut==="function"){window.Clerk.signOut();return}noticePanel("ログアウト");return}noticePanel(item.title)}
function renderButtons(){ensureStyle();let layer=document.getElementById(LAYER_ID);if(!layer){layer=document.createElement("div");layer.id=LAYER_ID;document.body.appendChild(layer)}layer.innerHTML="";const candidates=Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,div,button,a,li,[role=button]')).filter(el=>visible(el)&&likelyMenuNode(el));const seen=new Set();for(const el of candidates){const item=matchItem(el);if(!item)continue;const rect=el.getBoundingClientRect();const key=item.key+":"+Math.round(rect.top)+":"+Math.round(rect.left);if(seen.has(key))continue;seen.add(key);const button=document.createElement("button");button.type="button";button.setAttribute("aria-label",item.title);button.dataset.key=item.key;button.style.left=Math.max(0,rect.left-14)+"px";button.style.top=Math.max(0,rect.top-12)+"px";button.style.width=Math.min(window.innerWidth,rect.width+42)+"px";button.style.height=Math.min(96,Math.max(44,rect.height+24))+"px";const handler=event=>{event.preventDefault();event.stopPropagation();activate(item)};button.addEventListener("pointerdown",handler,{capture:true});button.addEventListener("touchend",handler,{capture:true});button.addEventListener("click",handler,{capture:true});layer.appendChild(button)}
}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(renderButtons,80)}
["click","pointerdown","touchstart","scroll","resize"].forEach(type=>window.addEventListener(type,schedule,true));
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","aria-hidden"]});
schedule();
window.NumeriaRefreshSideMenuTapBridge=renderButtons;
})();`;

const script = `<script id="numeria-side-menu-tap-bridge">${source}</script>`;
const injection = `<!-- ${marker} -->${script}`;
if (html.includes("</body>")) {
  html = html.replace("</body>", `${injection}</body>`);
} else {
  html += injection;
}
writeFileSync(htmlPath, html);
console.log("Side menu tap bridge injected into production HTML.");
