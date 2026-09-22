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

const legacyWorkspaceLoad = "let{data:n,error:r}=await X.from(`numeria_workspaces`).select(`appraisal_profiles,saved_presets,feedback_items,app_settings`).eq(`user_id`,t).maybeSingle();";
const d1WorkspaceLoad = "let{data:n,error:r}=await window.NumeriaD1WorkspaceLoad(t);";
patched = replaceExactly(
  patched,
  legacyWorkspaceLoad,
  d1WorkspaceLoad,
  1,
  "legacy Supabase workspace load",
);

const legacyWorkspaceSave = "{error:n}=await X.from(`numeria_workspaces`).upsert({user_id:t,appraisal_profiles:d,saved_presets:An,feedback_items:Wn,app_settings:e,updated_at:new Date().toISOString()},{onConflict:`user_id`});";
const d1WorkspaceSave = "{error:n}=await window.NumeriaD1WorkspaceSave({appraisal_profiles:d,saved_presets:An,feedback_items:Wn,app_settings:e,updated_at:new Date().toISOString()});";
patched = replaceExactly(
  patched,
  legacyWorkspaceSave,
  d1WorkspaceSave,
  1,
  "legacy Supabase workspace save",
);

const bridge = `window.NumeriaD1WorkspaceLoad=window.NumeriaD1WorkspaceLoad||async function(){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/workspace-state?workspaceId=ws_personal\`,{headers:{\"X-Workspace-Id\":\"ws_personal\"}}),body=await response.json().catch(()=>({}));if(!response.ok)return{data:null,error:{message:body.message||\"D1クラウド保存を読み込めませんでした\"}};if(body.workspaceState)return{data:body.workspaceState,error:null,source:\"d1\"};return{data:null,error:null,source:\"d1-empty\"}}catch(error){return{data:null,error:{message:error&&error.message||\"D1クラウド保存を読み込めませんでした\"}}}};window.NumeriaD1WorkspaceSave=window.NumeriaD1WorkspaceSave||async function(workspaceState){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/workspace-state\`,{method:\"PUT\",headers:{\"Content-Type\":\"application/json\",\"X-Workspace-Id\":\"ws_personal\"},body:JSON.stringify({workspaceId:\"ws_personal\",workspaceState})}),body=await response.json().catch(()=>({}));return response.ok?{data:body.workspaceState||workspaceState,error:null}:{data:null,error:{message:body.message||\"D1クラウド保存に失敗しました\"}}}catch(error){return{data:null,error:{message:error&&error.message||\"D1クラウド保存に失敗しました\"}}}};`;

writeFileSync(assetPath, bridge + patched);
console.log("Legacy Numeria workspace cloud state patched from Supabase primary storage to D1. Empty D1 starts as a new workspace; no Supabase data migration is performed.");
