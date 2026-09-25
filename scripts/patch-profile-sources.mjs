import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(assetPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

let patched = source;

const bridge = `window.NumeriaAdminPreviewRender=window.NumeriaAdminPreviewRender||function(admin,actualPlan,uiPlan){try{let id=\"numeria-admin-preview-diagnostic\",el=document.getElementById(id);if(!el){el=document.createElement(\"div\");el.id=id;el.style.cssText=\"position:fixed;right:12px;top:12px;z-index:2147483647;padding:8px 10px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.18);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none\";document.body.appendChild(el)}let ok=!!(admin&&admin.adminMode),preview=admin&&admin.developerPreview||null;el.textContent=ok?\"ADMIN PREVIEW · BUSINESS UI\":\"ADMIN未認識 · USER UI\";el.title=ok?\"管理者として認識されています。実契約は\"+actualPlan+\"のまま、UI確認のみ\"+uiPlan+\"として表示します。\":\"このログイン中ユーザーは管理者として認識されていません。NUMERIA_ADMIN_USER_IDSとClerkログインユーザーIDを確認してください。\";el.style.background=ok?\"#111827\":\"#7f1d1d\";el.style.color=\"#fff\";window.NumeriaAdminPreviewState={adminMode:ok,actualPlan,uiPlan,identitySource:admin&&admin.developerPreview&&admin.developerPreview.identitySource||admin&&admin.errorCode||\"unknown\",businessUiPreviewEnabled:!!(preview&&preview.businessUiPreviewEnabled)}}catch{}};window.NumeriaAccessContextLoad=window.NumeriaAccessContextLoad||async function(email){try{let headers={\"X-Workspace-Id\":\"ws_personal\"},adminHeaders={...headers,\"X-Admin-Email\":String(email||\"\").trim().toLowerCase()},responses=await Promise.all([window.NumeriaAuthenticatedFetch(\`/api/billing/subscription?workspaceId=ws_personal\`,{headers}),window.NumeriaAuthenticatedFetch(\`/api/admin/status\`,{headers:adminHeaders})]),subscription=await responses[0].json().catch(()=>({})),admin=await responses[1].json().catch(()=>({}));if(!responses[0].ok)return{data:null,error:{message:subscription.message||\"契約状態を確認できませんでした\"}};let actualPlan=subscription&&subscription.subscription&&subscription.subscription.planId||\"free\",preview=admin&&admin.developerPreview||null,uiPlan=admin&&admin.adminMode&&preview&&preview.businessUiPreviewEnabled?\"business\":actualPlan;window.NumeriaAdminPreviewRender(admin,actualPlan,uiPlan);return{data:{role:admin&&admin.adminMode?\"admin\":\"user\",plan:uiPlan,actualPlan,developerPreview:preview},error:null}}catch(error){try{window.NumeriaAdminPreviewRender({adminMode:false,errorCode:\"ADMIN_STATUS_UNAVAILABLE\"},\"unknown\",\"unknown\")}catch{}return{data:null,error:{message:error&&error.message||\"利用権限を確認できませんでした\"}}}};window.NumeriaUserPreferencesLoad=window.NumeriaUserPreferencesLoad||async function(){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/user-preferences?workspaceId=ws_personal\`,{headers:{\"X-Workspace-Id\":\"ws_personal\"}}),body=await response.json().catch(()=>({}));return response.ok?{data:body.preferences||null,error:null}:{data:null,error:{message:body.message||\"占術設定を読み込めませんでした\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"占術設定を読み込めませんでした\"}}}};window.NumeriaUserPreferencesSave=window.NumeriaUserPreferencesSave||async function(preferences){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/user-preferences\`,{method:\"PATCH\",headers:{\"Content-Type\":\"application/json\",\"X-Workspace-Id\":\"ws_personal\"},body:JSON.stringify({workspaceId:\"ws_personal\",preferences})}),body=await response.json().catch(()=>({}));return response.ok?{data:body.preferences||preferences,error:null}:{data:null,error:{message:body.message||\"占術設定を保存できませんでした\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"占術設定を保存できませんでした\"}}}};`;
patched = bridge + patched;

const residualBridge = `window.NumeriaFeedbackSubmit=window.NumeriaFeedbackSubmit||async function(input){let categoryMap={\"不具合\":\"bug_report\",\"使いにくい\":\"usability_feedback\",\"機能要望\":\"improvement_request\",\"良かった点\":\"positive_feedback\"};try{let payload={sourceApp:\"numeria-studio\",appId:\"numeria-studio\",appName:\"Numeria Studio\",appVersion:\"legacy-desktop-feedback.v1\",planId:\"unknown\",workspaceId:\"ws_personal\",currentScreen:String(input.screen||\"Numeria Studio\"),screenName:String(input.screen||\"desktop-feedback\"),category:categoryMap[input.category]||\"improvement_request\",rating:Number(input.rating||0),initialMessage:String(input.message||\"\"),message:String(input.message||\"\"),occurredAt:input.createdAt||new Date().toISOString(),correlationId:\"num_desktop_\"+Date.now()};let response=await window.NumeriaAuthenticatedFetch(\`/api/feedback/submit\`,{method:\"POST\",headers:{\"Content-Type\":\"application/json\",\"X-Workspace-Id\":\"ws_personal\"},body:JSON.stringify(payload)}),body=await response.json().catch(()=>({}));return response.ok?{data:body,error:null}:{data:null,error:{message:body.message||\"Feedback Hubへ送信できませんでした\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"Feedback Hubへ送信できませんでした\"}}}};window.NumeriaLegacyAdminDataUnavailable=window.NumeriaLegacyAdminDataUnavailable||async function(){return{data:[],error:{message:\"旧Supabase管理機能は廃止しました。管理者メニューの本番状態確認を利用してください。\"}}};window.NumeriaLegacyAdminMutationDisabled=window.NumeriaLegacyAdminMutationDisabled||async function(){return{data:null,error:{message:\"旧Supabaseのユーザー変更・停止・削除は廃止しました。契約・権限は正式なサーバー側管理から変更してください。\"}}};`;
patched = residualBridge + patched;

const legacyAccessRead = "X.from(`profiles`).select(`role,plan`).eq(`user_id`,t).maybeSingle()";
const workerAccessRead = "window.NumeriaAccessContextLoad(e.email)";
patched = replaceExactly(patched, legacyAccessRead, workerAccessRead, 1, "Supabase role/plan read");

const legacyPreferencesRead = "X.from(`profiles`).select(`primary_divination,enabled_divinations,plan`).eq(`user_id`,t).maybeSingle()";
const d1PreferencesRead = "window.NumeriaUserPreferencesLoad()";
patched = replaceExactly(patched, legacyPreferencesRead, d1PreferencesRead, 1, "Supabase divination preferences read");

// The admin preview patch has already amended this condition in the restored bundle.
// Plan is loaded from /api/billing/subscription, so preferences must not carry a plan copy.
patched = replaceExactly(
  patched,
  "r?.plan===`free`&&tr!==`admin`",
  "ar===`free`&&tr!==`admin`",
  1,
  "divination reload plan source",
);

const legacyInitialPreferenceWrite = "d!==s&&X.from(`profiles`).update({primary_divination:d,enabled_divinations:[d],updated_at:new Date().toISOString()}).eq(`user_id`,t)";
const d1InitialPreferenceWrite = "d!==s&&window.NumeriaUserPreferencesSave({primary_divination:d,enabled_divinations:[d]})";
patched = replaceExactly(
  patched,
  legacyInitialPreferenceWrite,
  d1InitialPreferenceWrite,
  1,
  "Supabase initial divination preference write",
);

const legacyPreferenceWrite = "let{error:l}=await X.from(`profiles`).update({primary_divination:e,enabled_divinations:i,updated_at:new Date().toISOString()}).eq(`user_id`,t);";
const d1PreferenceWrite = "let{error:l}=await window.NumeriaUserPreferencesSave({primary_divination:e,enabled_divinations:i});";
patched = replaceExactly(
  patched,
  legacyPreferenceWrite,
  d1PreferenceWrite,
  1,
  "Supabase divination switch write",
);

// Clerk is the identity/profile source for the display name; do not duplicate it into Supabase profiles.
const legacyDisplayNameDuplicateWrite = "n||await X.from(`profiles`).update({display_name:e,updated_at:new Date().toISOString()}).eq(`user_id`,t),";
patched = replaceExactly(
  patched,
  legacyDisplayNameDuplicateWrite,
  "",
  1,
  "Supabase display-name duplicate write",
);

// Plan and admin role are external/server-controlled sources. Keep the legacy admin screen from mutating stale Supabase copies.
const legacyAdminUserUpdateStart = "ii=async(e,n)=>{if(e===t&&n.account_status===`suspended`)";
const guardedAdminUserUpdateStart = "ii=async(e,n)=>{if(n&&(Object.prototype.hasOwnProperty.call(n,`plan`)||Object.prototype.hasOwnProperty.call(n,`role`))){dr(`プランと管理者権限は外部契約・サーバー設定で管理します。Numeriaの旧管理データからは変更できません。`);return}if(e===t&&n.account_status===`suspended`)";
patched = replaceExactly(
  patched,
  legacyAdminUserUpdateStart,
  guardedAdminUserUpdateStart,
  1,
  "legacy admin plan/role mutation guard",
);

// Supabase is no longer the runtime account-status authority. Clerk/Worker auth remains authoritative.
const legacyAccountStatusRead = "X.from(`profiles`).select(`account_status`).eq(`user_id`,t).maybeSingle()";
patched = replaceExactly(
  patched,
  legacyAccountStatusRead,
  "Promise.resolve({data:null,error:null})",
  1,
  "Supabase account-status read",
);

// The old Supabase aggregate/admin mutation surface is intentionally retired rather than copied into D1.
patched = replaceExactly(
  patched,
  "X.rpc(`numeria_admin_user_summary`)",
  "window.NumeriaLegacyAdminDataUnavailable()",
  1,
  "Supabase admin summary RPC",
);
patched = replaceExactly(
  patched,
  "X.from(`beta_feedback`).select(`id,user_id,user_email,category,screen,rating,message,status,created_at`).order(`created_at`,{ascending:!1})",
  "window.NumeriaLegacyAdminDataUnavailable()",
  1,
  "Supabase beta feedback admin read",
);
patched = replaceExactly(
  patched,
  "X.from(`profiles`).update({...n,updated_at:new Date().toISOString()}).eq(`user_id`,e)",
  "window.NumeriaLegacyAdminMutationDisabled(n)",
  1,
  "Supabase admin user mutation",
);
patched = replaceExactly(
  patched,
  "X.rpc(`numeria_admin_delete_user`,{p_target_user_id:e.user_id})",
  "window.NumeriaLegacyAdminMutationDisabled({deleteUserId:e.user_id})",
  1,
  "Supabase admin delete RPC",
);
patched = replaceExactly(
  patched,
  "X.from(`beta_feedback`).update({status:t}).eq(`id`,e)",
  "window.NumeriaLegacyAdminMutationDisabled({feedbackId:e,status:t})",
  1,
  "Supabase beta feedback admin mutation",
);

const legacyDesktopFeedbackWrite = "X.from(`beta_feedback`).insert({id:n.id,user_id:t,user_email:e.email,category:n.category,screen:n.screen,rating:n.rating,message:n.message,status:n.status,created_at:n.createdAt})";
const feedbackHubWrite = "void window.NumeriaFeedbackSubmit({category:n.category,screen:n.screen,rating:n.rating,message:n.message,createdAt:n.createdAt})";
patched = replaceExactly(
  patched,
  legacyDesktopFeedbackWrite,
  feedbackHubWrite,
  1,
  "Supabase desktop feedback insert",
);

patched = patched.replace(
  "管理データを取得できませんでした。Supabaseの管理用設定を確認してください。",
  "旧Supabaseのユーザー一覧・停止・削除・フィードバック集計は廃止しました。管理者メニューの本番状態確認を利用してください。",
);

const forbiddenRuntimePatterns = [
  "X.from(`profiles`)",
  "X.from(`beta_feedback`)",
  "X.rpc(`numeria_admin_user_summary`)",
  "X.rpc(`numeria_admin_delete_user`)",
];
for (const forbidden of forbiddenRuntimePatterns) {
  if (patched.includes(forbidden)) {
    throw new Error(`Supabase runtime dependency remains in Production legacy bundle: ${forbidden}`);
  }
}

writeFileSync(assetPath, patched);
console.log("Legacy Supabase runtime sources removed from normal UI; admin preview projects Business UI without changing actual billing/usage, displays admin recognition diagnostics, plan/admin/prefs use Worker+D1+Clerk, feedback uses Feedback Hub, and old Supabase admin mutations are disabled.");