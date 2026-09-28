import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
const htmlPath = "dist/index.html";
let source = readFileSync(assetPath, "utf8");
let html = readFileSync(htmlPath, "utf8");

const marker = "NumeriaAdminPreviewBootDiagnostics.v3";
if (source.includes(marker) || html.includes(marker)) {
  throw new Error("Admin preview boot diagnostics patch was applied more than once.");
}

function replaceAllRequired(input, legacyValue, replacementValue, label) {
  const count = input.split(legacyValue).length - 1;
  if (count < 1) {
    throw new Error(`Expected at least one ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

const adminPreviewGate = "window.NumeriaAdminPreviewState&&window.NumeriaAdminPreviewState.adminMode";

source = replaceAllRequired(
  source,
  "ar!==`free`||tr===`admin`",
  `ar!==\`free\`||tr===\`admin\`||${adminPreviewGate}`,
  "admin preview divination gate fallback",
);

source = replaceAllRequired(
  source,
  "ar===`free`&&tr!==`admin`",
  `ar===\`free\`&&!(tr===\`admin\`||${adminPreviewGate})`,
  "Free guard admin preview fallback",
);

const boot = `;(()=>{const MARK="${marker}",ID="numeria-admin-preview-diagnostic";function debug(){try{return new URLSearchParams(location.search).has("numeriaAdminDebug")}catch{return false}}function remove(){try{let el=document.getElementById(ID);el&&el.remove()}catch{}}async function token(){for(let i=0;i<20;i++){try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){let t=await window.Clerk.session.getToken().catch(()=>null);if(t)return t}}catch{}await new Promise(r=>setTimeout(r,500))}return""}async function authHeaders(){let headers=new Headers({"X-Workspace-Id":"ws_personal"}),t=await token();if(t)headers.set("Authorization","Bearer "+t);return headers}function paint(label,ok,title){try{if(!ok&&!debug()){remove();return}let el=document.getElementById(ID);if(!el){el=document.createElement("div");el.id=ID;el.setAttribute("data-admin-preview-diagnostics",MARK);(document.body||document.documentElement).appendChild(el)}el.textContent=label;el.title=title||label;el.style.cssText="position:fixed;left:12px;right:12px;bottom:86px;z-index:2147483647;padding:10px 12px;border-radius:14px;font-size:12px;font-weight:800;letter-spacing:.02em;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;background:"+(ok?"#111827":"#7f1d1d")+";color:#fff"}catch{}}async function check(){try{let headers=await authHeaders();if(!headers.has("Authorization")){window.NumeriaAdminPreviewState={adminMode:false,pending:true,identitySource:"clerk-token-pending",checkedAt:new Date().toISOString(),marker:MARK};paint("ADMIN確認中…",false,"Clerkセッションを待っています");return}let adminResponse=await fetch("/api/admin/status",{headers,cache:"no-store"});let admin=await adminResponse.json().catch(()=>({}));let billingResponse=await fetch("/api/billing/subscription?workspaceId=ws_personal",{headers,cache:"no-store"});let billing=await billingResponse.json().catch(()=>({}));let actualPlan=billing&&billing.subscription&&billing.subscription.planId||"free";let preview=admin&&admin.developerPreview||null;let ok=!!(admin&&admin.adminMode&&preview&&preview.businessUiPreviewEnabled);let uiPlan=ok?"business":actualPlan;window.NumeriaAdminPreviewState={adminMode:ok,actualPlan,uiPlan,identitySource:admin&&admin.developerPreview&&admin.developerPreview.identitySource||admin&&admin.errorCode||"unknown",businessUiPreviewEnabled:!!(preview&&preview.businessUiPreviewEnabled),checkedAt:new Date().toISOString(),marker:MARK};paint(ok?"ADMIN PREVIEW · BUSINESS UI":"ADMIN未認識 · USER UI",ok,ok?"管理者として認識されています。実契約は"+actualPlan+"のまま、UI確認のみBusinessとして扱います。":"ログイン中ユーザーは管理者として認識されていません。Clerk User IDとNUMERIA_ADMIN_USER_IDSを確認してください。")}catch(error){window.NumeriaAdminPreviewState={adminMode:false,error:String(error&&error.message||error),checkedAt:new Date().toISOString(),marker:MARK};paint("ADMIN確認不可",false,"管理者状態を確認できませんでした")}}function start(){check();setTimeout(check,2500);setTimeout(check,6000);setInterval(check,15000)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start()})();`;

source = boot + source;

const htmlBoot = `<script data-admin-preview-diagnostics="${marker}">${boot}</script>`;
if (html.includes("</body>")) {
  html = html.replace("</body>", `${htmlBoot}</body>`);
} else {
  html += htmlBoot;
}

writeFileSync(assetPath, source);
writeFileSync(htmlPath, html);
console.log("Admin preview boot diagnostics patched into both production HTML and legacy bundle.");
