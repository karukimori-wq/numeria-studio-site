import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(assetPath, "utf8");

function replaceExactly(needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected 1 ${label}, found ${count}.`);
  source = source.replace(needle, replacement);
}

function replaceAllExactly(needle, replacement, expectedCount, label) {
  const count = source.split(needle).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  source = source.split(needle).join(replacement);
}

replaceExactly(
  "appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})",
  "appraisalId:r,clientName:G.name,birthDate:G.birthday||M,divination:l,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``,snapshot:Fi(r)})",
  "shared reading draft request payload",
);


replaceExactly(
  "appraisalId:e,clientName:j,question:P,notes:lt||dt||``,resultSummary:r.message||r.summary||``})",
  "appraisalId:e,clientName:j,birthDate:M,divination:l,question:P,notes:lt||dt||``,resultSummary:r.message||r.summary||``,snapshot:r})",
  "reading editor complete draft snapshot",
);


const saveEvent = (state) => `window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status",{detail:{state:"${state}"}}))`;
const savingAnchor = "let a=tr===`admin`?{ok:!0,data:{status:`admin-preview`}}:await window.NumeriaAuthenticatedFetch(`/api/appraisals/save-draft`";
const persistedSavingAnchor = "let a=await window.NumeriaAuthenticatedFetch(`/api/appraisals/save-draft`";
const profileFailureAnchor = "if(!a.ok){B(a.data.message||`途中保存できませんでした`);return}";
const readingFailureAnchor = "if(!a.ok){R(a.data.message||`途中保存できませんでした`),window.setTimeout(()=>R(``),3200);return}";
const profileSuccessAnchor = "B(`${W.name}の鑑定準備を履歴へ保存しました`),k(`appraisalProfiles`)";
const readingSuccessAnchor = "R(`鑑定を下書き保存しました`),window.setTimeout(()=>R(``),2600)";

// The production bundle currently has two draft-save entry points: one from the
// client profile and one from the reading editor. Both must announce every state.
// Exact counts intentionally fail the build when the generated bundle changes.
replaceAllExactly(savingAnchor, saveEvent("saving") + ";" + persistedSavingAnchor, 2, "draft saving entry points");
replaceExactly(profileFailureAnchor, "if(!a.ok){" + saveEvent("error") + ";B(a.data.message||`途中保存できませんでした`);return}", "profile draft failure");
replaceExactly(readingFailureAnchor, "if(!a.ok){" + saveEvent("error") + ";R(a.data.message||`途中保存できませんでした`),window.setTimeout(()=>R(``),3200);return}", "reading draft failure");
replaceExactly(profileSuccessAnchor, saveEvent("saved") + ";" + profileSuccessAnchor, "profile draft success");
replaceExactly(readingSuccessAnchor, 'window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status",{detail:{state:"saved",sessionId:e,snapshot:r}}))' + ";" + readingSuccessAnchor, "reading draft success");
// An HTTP 2xx with an unreadable/error body is not a draft persistence ACK.
replaceAllExactly(
  '.then(async e=>({ok:e.ok,data:await e.json().catch(()=>({message:`途中保存に失敗しました`}))}))',
  '.then(async response=>{let data=await response.json().catch(()=>({message:`途中保存に失敗しました`}));return{ok:response.ok&&data.status===`success`&&typeof data.draftId===`string`,data}})',
  2,
  "validated draft ACKs",
);

const saveStatusRuntime = `;(()=>{if(window.__NumeriaDraftSaveStatusV1)return;window.__NumeriaDraftSaveStatusV1=true;
let status="idle";const labels={dirty:"保存中に変更があります。もう一度保存してください",saving:"鑑定の下書きを保存中…",saved:"鑑定の下書きを保存しました",error:"保存できませんでした。内容を確認して再試行してください"};
function render(){if(!document.getElementById("numeria-draft-save-status-style")){let style=document.createElement("style");style.id="numeria-draft-save-status-style";style.textContent="#numeria-draft-save-status{position:fixed;top:calc(85px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:10000;max-width:min(420px,calc(100vw - 24px));padding:12px 16px;background:#fffdf7;border:1px solid #d9c58c;border-radius:12px;box-shadow:0 8px 28px #20192d26;color:#332944;font:600 13px/1.5 system-ui,sans-serif;text-align:center;pointer-events:none}#numeria-draft-save-status[hidden]{display:none!important}#numeria-draft-save-status[data-state=error]{border-color:#cd7d79;color:#923a39}";document.head.appendChild(style)}let box=document.getElementById("numeria-draft-save-status");if(!box){box=document.createElement("div");box.id="numeria-draft-save-status";box.setAttribute("role","status");box.setAttribute("aria-live","polite");document.body.appendChild(box)}box.hidden=status==="idle";box.textContent=labels[status]||"";box.dataset.state=status}
window.addEventListener("numeria-reading-draft-save-status",event=>{let next=event.detail?.state;if(!labels[next])return;if(next==="saved"&&event.detail?.snapshot&&typeof window.NumeriaNavigation?.getReadingSnapshot==="function"){let current=window.NumeriaNavigation.getReadingSnapshot(event.detail.sessionId);if(JSON.stringify(current)!==JSON.stringify(event.detail.snapshot))next="dirty"}status=next;render()});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();`;
source += saveStatusRuntime;

writeFileSync(assetPath, source);
console.log("Reading draft persistence patched with the complete editable snapshot.");
