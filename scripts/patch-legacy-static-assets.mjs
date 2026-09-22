import { readFileSync, writeFileSync } from "node:fs";

const legacyAssetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(legacyAssetPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

let patched = source;

// Keep legacy same-origin API calls compatible with Clerk enforce mode.
// The wrapper resolves a fresh Clerk token per request and leaves external requests untouched.
const authenticatedFetchPrelude = 'window.NumeriaAuthenticatedFetch=window.NumeriaAuthenticatedFetch||async function(input,init={}){let options={...init,headers:new Headers(init.headers||{})};try{if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken===`function`){let token=await window.Clerk.session.getToken();if(token)options.headers.set(`Authorization`,`Bearer `+token)}}catch{}return fetch(input,options)};';
patched = authenticatedFetchPrelude + patched;

// Expected three legacy PDF navigation calls; replaceExactly enforces this count.
const legacyPdfNavigation = "window.location.assign(o)";
const safePdfNavigation = 'window.open(o,"_blank","noopener,noreferrer")||window.location.assign(o)';
patched = replaceExactly(
  patched,
  legacyPdfNavigation,
  safePdfNavigation,
  3,
  "legacy PDF navigation calls",
);

const manticDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r})";
const manticDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})";
const numerologyDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e})";
const numerologyDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e,clientName:j,question:P,notes:lt||dt||``,resultSummary:r.message||r.summary||``})";
patched = replaceExactly(
  patched,
  manticDraftPayload,
  manticDraftPayloadWithDetails,
  1,
  "mantic draft payload",
);
patched = replaceExactly(
  patched,
  numerologyDraftPayload,
  numerologyDraftPayloadWithDetails,
  1,
  "numerology draft payload",
);

// Both explicit draft save paths must carry Clerk auth in enforce mode.
// Admin developer preview intentionally bypasses the Free single-draft server limit.
const legacyDraftFetch = "let a=await fetch(`/api/appraisals/save-draft`,";
const guardedDraftFetch = "let a=tr===`admin`?{ok:!0,data:{status:`admin-preview`}}:await window.NumeriaAuthenticatedFetch(`/api/appraisals/save-draft`,";
patched = replaceExactly(
  patched,
  legacyDraftFetch,
  guardedDraftFetch,
  2,
  "legacy draft API fetches",
);

// Appraisal client creation must pass through the Worker plan gate instead of writing only to local/Supabase state.
// Existing seeded demo rows (c1/c2/c3) are not counted as real Free profiles by the UI compatibility guard.
const legacyClientCreateStart = "_i=()=>{if(!S.name.trim()){B(`お名前を入力してください`);return}let e=d.reduce((e,t)=>Math.max(e,Number(t.customerCode.match(/\\d+/)?.[0]??0)),0)+1,t=`customer-${Date.now()}`,n={id:t,";
const guardedClientCreateStart = "_i=async()=>{if(!S.name.trim()){B(`お名前を入力してください`);return}let i=d.filter(e=>!/^c[123]$/.test(String(e.id))).length;if(ar===`free`&&tr!==`admin`&&i>=3){B(`Freeでは鑑定対象者は3名までです。Proへ変更すると上限なく登録できます。`);return}let a=null;if(tr!==`admin`){let e=await window.NumeriaAuthenticatedFetch(`/api/appraisal-clients`,{method:`POST`,headers:{\"Content-Type\":`application/json`,\"X-Workspace-Id\":`ws_personal`},body:JSON.stringify({workspaceId:`ws_personal`,clientName:S.name.trim(),birthDate:S.birthday})}).then(async e=>({ok:e.ok,data:await e.json().catch(()=>({message:`鑑定対象者を登録できませんでした`}))})).catch(()=>({ok:!1,data:{message:`鑑定対象者を登録できませんでした。通信環境を確認してください。`}}));if(!e.ok){B(e.data.message||`鑑定対象者を登録できませんでした`);return}a=e.data.appraisalClient||null}let e=d.reduce((e,t)=>Math.max(e,Number(t.customerCode.match(/\\d+/)?.[0]??0)),0)+1,t=a?.id||`customer-${Date.now()}`,n={id:t,";
patched = replaceExactly(
  patched,
  legacyClientCreateStart,
  guardedClientCreateStart,
  1,
  "appraisal client create path",
);

// Keep D1 client counts aligned when newly-created Worker-backed clients are deleted.
// Legacy local-only ids remain deletable locally until storage migration is completed.
const legacyClientDeleteStart = "xi=e=>{let t=d.find(t=>t.id===e);if(d.length<=1){B(`最後の1名は削除できません。先に別の鑑定カルテを作成してください`);return}if(!t||!window.confirm(`${t.name}様のカルテと鑑定履歴を削除しますか？この操作は元に戻せません。`))return;let n=d.filter(t=>t.id!==e);";
const guardedClientDeleteStart = "xi=async e=>{let t=d.find(t=>t.id===e);if(d.length<=1){B(`最後の1名は削除できません。先に別の鑑定カルテを作成してください`);return}if(!t||!window.confirm(`${t.name}様のカルテと鑑定履歴を削除しますか？この操作は元に戻せません。`))return;if(tr!==`admin`&&String(e).startsWith(`acl_`)){let n=await window.NumeriaAuthenticatedFetch(`/api/appraisal-clients/${encodeURIComponent(e)}?workspaceId=ws_personal`,{method:`DELETE`,headers:{\"X-Workspace-Id\":`ws_personal`}}).then(async e=>({ok:e.ok,data:await e.json().catch(()=>({message:`鑑定対象者を削除できませんでした`}))})).catch(()=>({ok:!1,data:{message:`鑑定対象者を削除できませんでした。通信環境を確認してください。`}}));if(!n.ok){B(n.data.message||`鑑定対象者を削除できませんでした`);return}}let n=d.filter(t=>t.id!==e);";
patched = replaceExactly(
  patched,
  legacyClientDeleteStart,
  guardedClientDeleteStart,
  1,
  "appraisal client delete path",
);

// Report/PDF completion is the release-facing completion point today.
// Render the PDF first, then reserve/complete the appraisal in D1 before exposing the file to the user.
// Admin preview bypasses usage limits without changing the real subscription plan.
const legacyCompletionBridge = "Gi=async(e,t,n=t)=>{try{await fetch(`/contracts/status`,{method:`POST`,headers:{\"content-type\":`application/json`},body:JSON.stringify({workspaceId:`ws_test_001`,userId:`user_test_owner_001`,inputRef:{sessionId:n,reportId:t,reportType:e}})})}catch{}}";
const guardedCompletionBridge = "Gi=async(e,t,n=t)=>{if(tr===`admin`)return!0;try{let r=await window.NumeriaAuthenticatedFetch(`/api/appraisals/status?workspaceId=ws_personal`,{headers:{\"X-Workspace-Id\":`ws_personal`}}).then(async e=>e.ok?e.json():null).catch(()=>null),i=r?.activeDraft?.id||t,a=await window.NumeriaAuthenticatedFetch(`/api/appraisals/complete`,{method:`POST`,headers:{\"Content-Type\":`application/json`,\"X-Workspace-Id\":`ws_personal`},body:JSON.stringify({workspaceId:`ws_personal`,appraisalId:i,clientName:G?.name||j,birthDate:G?.birthday||M,lifePathNumber:F?.lifePath||null,question:P,notes:lt||dt||Pe||``,resultSummary:Pe||pt?.overview||wr?.reading||``})}),o=await a.json().catch(()=>({message:`鑑定完了を登録できませんでした`}));if(!a.ok){Gt(o.message||`鑑定完了を登録できませんでした`);return!1}return!0}catch{Gt(`鑑定完了を登録できませんでした。通信環境を確認してください。`);return!1}}";
patched = replaceExactly(
  patched,
  legacyCompletionBridge,
  guardedCompletionBridge,
  1,
  "report completion bridge",
);

// PDF navigation has already been made popup-safe above, so these completion gates target that patched form.
const legacyNumerologyPdfFinalize = "let o=URL.createObjectURL(a.output(`blob`)),s=Ki();s&&Gi(`numerology`,s),Gt(`PDFを作成しました。開いた画面から保存できます。`),window.open(o,\"_blank\",\"noopener,noreferrer\")||window.location.assign(o)}catch";
const guardedNumerologyPdfFinalize = "let o=URL.createObjectURL(a.output(`blob`)),s=Dn??`reading-${Date.now()}`;if(!await Gi(`numerology`,s)){URL.revokeObjectURL(o);return}Ki(),Gt(`PDFを作成しました。開いた画面から保存できます。`),window.open(o,\"_blank\",\"noopener,noreferrer\")||window.location.assign(o)}catch";
patched = replaceExactly(
  patched,
  legacyNumerologyPdfFinalize,
  guardedNumerologyPdfFinalize,
  1,
  "numerology PDF completion gate",
);

const legacyManticPdfFinalize = "let o=URL.createObjectURL(a.output(`blob`));Ci(),Gi(l,`${l}-${Date.now()}`),Gt(`PDFを作成しました。開いた画面から保存できます。`),window.open(o,\"_blank\",\"noopener,noreferrer\")||window.location.assign(o)}catch";
const guardedManticPdfFinalize = "let o=URL.createObjectURL(a.output(`blob`)),s=Dn??`${l}-${Date.now()}`;if(!await Gi(l,s)){URL.revokeObjectURL(o);return}Ki(),Gt(`PDFを作成しました。開いた画面から保存できます。`),window.open(o,\"_blank\",\"noopener,noreferrer\")||window.location.assign(o)}catch";
patched = replaceExactly(
  patched,
  legacyManticPdfFinalize,
  guardedManticPdfFinalize,
  1,
  "mantic PDF completion gate",
);

// Free history keeps the latest three completed/detail rows. Older local legacy rows remain counted but their content/actions are locked.
// The direct open/edit functions repeat the guard so DOM manipulation cannot bypass it.
const legacyHistoryMapStart = "G.history.map((e,t)=>{let n=na.find(t=>t.id===(e.divination??`numerology`))??na[0],r=Jo(e);return";
const guardedHistoryMapStart = "G.history.map((e,t)=>{if(ar===`free`&&tr!==`admin`&&t>=3)return(0,Z.jsxs)(`div`,{className:`history-row history-row-locked`,children:[(0,Z.jsx)(`span`,{className:`history-request`,children:(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:`🔒 過去の鑑定`}),(0,Z.jsx)(`small`,{children:`Freeでは最新3件まで詳細を表示できます。Proで過去履歴をすべて確認できます。`})]})}),(0,Z.jsx)(`em`,{children:e.status})]},e.id??e.date+e.theme);let n=na.find(t=>t.id===(e.divination??`numerology`))??na[0],r=Jo(e);return";
patched = replaceExactly(
  patched,
  legacyHistoryMapStart,
  guardedHistoryMapStart,
  1,
  "Free history detail rendering",
);

const legacyHistoryEditorStart = "vi=e=>{if(typeof e==`number`){let t=G.history[e];";
const guardedHistoryEditorStart = "vi=e=>{if(typeof e==`number`&&ar===`free`&&tr!==`admin`&&e>=3){B(`Freeでは最新3件まで履歴の詳細を編集できます。Proで過去履歴をすべて確認できます。`);return}if(typeof e==`number`){let t=G.history[e];";
patched = replaceExactly(
  patched,
  legacyHistoryEditorStart,
  guardedHistoryEditorStart,
  1,
  "Free history edit guard",
);

const legacyHistoryOpenStart = "Y=(e,t)=>{if(!t.snapshot){";
const guardedHistoryOpenStart = "Y=(e,t)=>{let freeProfile=d.find(n=>n.id===e),freeHistoryIndex=freeProfile?.history?.findIndex(e=>e.id===t.id)??-1;if(ar===`free`&&tr!==`admin`&&freeHistoryIndex>=3){R(`Freeでは最新3件まで履歴の詳細を表示できます。Proで過去履歴をすべて確認できます。`),window.setTimeout(()=>R(``),3e3);return}if(!t.snapshot){";
patched = replaceExactly(
  patched,
  legacyHistoryOpenStart,
  guardedHistoryOpenStart,
  1,
  "Free history open guard",
);

// Admin/developer preview is an entitlement, not a subscription plan change.
// Keep ar (the actual subscription plan) untouched and bypass only UI preview gates for admins.
const legacyFreeDivinationGate = "let r=ar!==`free`;";
const adminPreviewDivinationGate = "let r=ar!==`free`||tr===`admin`;";
patched = replaceExactly(
  patched,
  legacyFreeDivinationGate,
  adminPreviewDivinationGate,
  1,
  "Free divination switch gate",
);

const legacyFreeReloadGate = "p=d!==s||r?.plan===`free`?[d]:f.includes(d)?f:[d,...f]";
const adminPreviewReloadGate = "p=d!==s||r?.plan===`free`&&tr!==`admin`?[d]:f.includes(d)?f:[d,...f]";
patched = replaceExactly(
  patched,
  legacyFreeReloadGate,
  adminPreviewReloadGate,
  1,
  "Free divination reload gate",
);

const legacyPlanHeader = "children:[`NUMERIA ACCOUNT · `,ar===`business`?`BUSINESS`:ar===`pro`?`PRO`:`FREE`]";
const adminPreviewPlanHeader = "children:[`NUMERIA ACCOUNT · `,ar===`business`?`BUSINESS`:ar===`pro`?`PRO`:`FREE`,tr===`admin`?` · ADMIN PREVIEW`:``]";
patched = replaceExactly(
  patched,
  legacyPlanHeader,
  adminPreviewPlanHeader,
  1,
  "account plan header",
);

const legacyDivinationHelp = "children:`無料版では初回に選んだメイン占術を固定します。変更はProで利用できます。`";
const adminPreviewDivinationHelp = "children:tr===`admin`?`管理者プレビュー：実契約プランは変更せず、開発中を含む全占術を確認できます。`:`無料版では初回に選んだメイン占術を固定します。変更はProで利用できます。`";
patched = replaceExactly(
  patched,
  legacyDivinationHelp,
  adminPreviewDivinationHelp,
  1,
  "divination plan help text",
);

const legacyDivinationCount = "children:[s.length,` / `,ar===`free`?`1`:`制限なし`,` 占術`]";
const adminPreviewDivinationCount = "children:[s.length,` / `,ar===`free`&&tr!==`admin`?`1`:`制限なし`,` 占術`]";
patched = replaceExactly(
  patched,
  legacyDivinationCount,
  adminPreviewDivinationCount,
  1,
  "divination count label",
);

const legacyTarotFreeCopy = "タロットを選んだFreeユーザーはタロットを利用できます。";
const currentTarotReleaseCopy = "タロットは現在リリース準備中です。管理者プレビューでのみ確認できます。";
patched = replaceExactly(
  patched,
  legacyTarotFreeCopy,
  currentTarotReleaseCopy,
  1,
  "stale Free tarot copy",
);

const legacyOnboardingTarotCopy = "無料版では最初に使う占術を1つ選びます。タロットを選ぶとタロットを利用できます。";
const currentOnboardingTarotCopy = "無料版では最初に使う命術を1つ選びます。選択後は固定され、変更はProで利用できます。";
patched = replaceExactly(
  patched,
  legacyOnboardingTarotCopy,
  currentOnboardingTarotCopy,
  1,
  "stale onboarding tarot copy",
);

writeFileSync(legacyAssetPath, patched);

console.log(
  "Legacy PDF exports, draft payloads, Free plan UI guards, and admin developer preview gates patched for the production workspace.",
);
