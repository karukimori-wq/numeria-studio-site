import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
const htmlPath = "dist/index.html";
let source = readFileSync(assetPath, "utf8");
let html = readFileSync(htmlPath, "utf8");

const marker = "NumeriaAdminPreviewBootDiagnostics.v2";
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

const boot = `;(()=>{const MARK="${marker}",ID="numeria-admin-preview-diagnostic";function authHeaders(){let headers=new Headers({"X-Workspace-Id":"ws_personal"});try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){return window.Clerk.session.getToken().then(token=>{if(token)headers.set("Authorization","Bearer "+token);return headers})}}catch{}return Promise.resolve(headers)}function paint(label,ok,title){try{let el=document.getElementById(ID);if(!el){el=document.createElement("div");el.id=ID;el.setAttribute("data-admin-preview-diagnostics",MARK);(document.body||document.documentElement).appendChild(el)}el.textContent=label;el.title=title||label;el.style.cssText="position:fixed;left:12px;right:12px;bottom:86px;z-index:2147483647;padding:10px 12px;border-radius:14px;font-size:12px;font-weight:800;letter-spacing:.02em;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;background:"+(ok?"#111827":"#7f1d1d")+";color:#fff"}catch{}}async function check(){try{paint("ADMIN確認中…",false,"管理者状態を確認しています");let headers=await authHeaders();let adminResponse=await fetch("/api/admin/status",{headers,cache:"no-store"});let admin=await adminResponse.json().catch(()=>({}));let billingResponse=await fetch("/api/billing/subscription?workspaceId=ws_personal",{headers,cache:"no-store"});let billing=await billingResponse.json().catch(()=>({}));let actualPlan=billing&&billing.subscription&&billing.subscription.planId||"free";let preview=admin&&admin.developerPreview||null;let ok=!!(admin&&admin.adminMode&&preview&&preview.businessUiPreviewEnabled);let uiPlan=ok?"business":actualPlan;window.NumeriaAdminPreviewState={adminMode:ok,actualPlan,uiPlan,identitySource:admin&&admin.identitySource||admin&&admin.errorCode||"unknown",businessUiPreviewEnabled:!!(preview&&preview.businessUiPreviewEnabled),checkedAt:new Date().toISOString(),marker:MARK};paint(ok?"ADMIN PREVIEW · BUSINESS UI":"ADMIN未認識 · USER UI",ok,ok?"管理者として認識されています。実契約は"+actualPlan+"のまま、UI確認のみBusinessとして扱います。":"ログイン中ユーザーは管理者として認識されていません。Clerk User IDとNUMERIA_ADMIN_USER_IDSを確認してください。")}catch(error){window.NumeriaAdminPreviewState={adminMode:false,error:String(error&&error.message||error),checkedAt:new Date().toISOString(),marker:MARK};paint("ADMIN確認不可",false,"管理者状態を確認できませんでした")}}function start(){paint("ADMIN診断起動",false,"診断スクリプトはHTML/assetに読み込まれています");check();setTimeout(check,1500);setTimeout(check,4000);setInterval(check,15000)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start()})();`;

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
