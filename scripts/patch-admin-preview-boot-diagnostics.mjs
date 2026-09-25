import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(assetPath, "utf8");

const marker = "NumeriaAdminPreviewBootDiagnostics.v1";
if (source.includes(marker)) {
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

const boot = `;(()=>{const MARK=\"${marker}\",ID=\"numeria-admin-preview-diagnostic\";function authHeaders(){let headers=new Headers({\"X-Workspace-Id\":\"ws_personal\"});try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken===\"function\"){return window.Clerk.session.getToken().then(token=>{if(token)headers.set(\"Authorization\",\"Bearer \"+token);return headers})}}catch{}return Promise.resolve(headers)}function paint(label,ok,title){try{let el=document.getElementById(ID);if(!el){el=document.createElement(\"div\");el.id=ID;el.setAttribute(\"data-admin-preview-diagnostics\",MARK);document.body.appendChild(el)}el.textContent=label;el.title=title||label;el.style.cssText=\"position:fixed;right:10px;bottom:92px;z-index:2147483647;padding:8px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.02em;box-shadow:0 8px 24px rgba(0,0,0,.22);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;background:\"+(ok?\"#111827\":\"#7f1d1d\")+\";color:#fff\"}catch{}}async function check(){try{paint(\"ADMIN確認中…\",false,\"管理者状態を確認しています\");let headers=await authHeaders();let adminResponse=await fetch(\"/api/admin/status\",{headers});let admin=await adminResponse.json().catch(()=>({}));let billingResponse=await fetch(\"/api/billing/subscription?workspaceId=ws_personal\",{headers});let billing=await billingResponse.json().catch(()=>({}));let actualPlan=billing&&billing.subscription&&billing.subscription.planId||\"free\";let preview=admin&&admin.developerPreview||null;let ok=!!(admin&&admin.adminMode&&preview&&preview.businessUiPreviewEnabled);let uiPlan=ok?\"business\":actualPlan;window.NumeriaAdminPreviewState={adminMode:ok,actualPlan,uiPlan,identitySource:admin&&admin.identitySource||admin&&admin.errorCode||\"unknown\",businessUiPreviewEnabled:!!(preview&&preview.businessUiPreviewEnabled),checkedAt:new Date().toISOString()};paint(ok?\"ADMIN PREVIEW · BUSINESS UI\":\"ADMIN未認識 · USER UI\",ok,ok?\"管理者として認識されています。実契約は\"+actualPlan+\"のまま、UI確認のみBusinessとして扱います。\":\"ログイン中ユーザーは管理者として認識されていません。Clerk User IDとNUMERIA_ADMIN_USER_IDSを確認してください。\")}catch(error){window.NumeriaAdminPreviewState={adminMode:false,error:String(error&&error.message||error),checkedAt:new Date().toISOString()};paint(\"ADMIN確認不可\",false,\"管理者状態を確認できませんでした\")}}function start(){check();setTimeout(check,1500);setTimeout(check,4000);setInterval(check,15000)}if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",start,{once:true});else start()})();`;

source = boot + source;

writeFileSync(assetPath, source);
console.log("Admin preview boot diagnostics patched into the production legacy bundle.");
