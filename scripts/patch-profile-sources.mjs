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

const bridge = `window.NumeriaAccessContextLoad=window.NumeriaAccessContextLoad||async function(email){try{let headers={\"X-Workspace-Id\":\"ws_personal\"},adminHeaders={...headers,\"X-Admin-Email\":String(email||\"\").trim().toLowerCase()},responses=await Promise.all([window.NumeriaAuthenticatedFetch(\`/api/billing/subscription?workspaceId=ws_personal\`,{headers}),window.NumeriaAuthenticatedFetch(\`/api/admin/status\`,{headers:adminHeaders})]),subscription=await responses[0].json().catch(()=>({})),admin=await responses[1].json().catch(()=>({}));if(!responses[0].ok)return{data:null,error:{message:subscription.message||\"契約状態を確認できませんでした\"}};return{data:{role:admin&&admin.adminMode?\"admin\":\"user\",plan:subscription&&subscription.subscription&&subscription.subscription.planId||\"free\"},error:null}}catch(error){return{data:null,error:{message:error&&error.message||\"利用権限を確認できませんでした\"}}}};window.NumeriaUserPreferencesLoad=window.NumeriaUserPreferencesLoad||async function(){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/user-preferences?workspaceId=ws_personal\`,{headers:{\"X-Workspace-Id\":\"ws_personal\"}}),body=await response.json().catch(()=>({}));return response.ok?{data:body.preferences||null,error:null}:{data:null,error:{message:body.message||\"占術設定を読み込めませんでした\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"占術設定を読み込めませんでした\"}}}};window.NumeriaUserPreferencesSave=window.NumeriaUserPreferencesSave||async function(preferences){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/user-preferences\`,{method:\"PATCH\",headers:{\"Content-Type\":\"application/json\",\"X-Workspace-Id\":\"ws_personal\"},body:JSON.stringify({workspaceId:\"ws_personal\",preferences})}),body=await response.json().catch(()=>({}));return response.ok?{data:body.preferences||preferences,error:null}:{data:null,error:{message:body.message||\"占術設定を保存できませんでした\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"占術設定を保存できませんでした\"}}}};`;
patched = bridge + patched;

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

writeFileSync(assetPath, patched);
console.log("Legacy profile sources patched: plan from Worker subscription, admin role from Worker admin status, divination preferences from D1, display name from Clerk.");
