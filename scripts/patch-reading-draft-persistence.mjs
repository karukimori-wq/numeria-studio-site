import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(assetPath, "utf8");

function replaceExactly(needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected 1 ${label}, found ${count}.`);
  source = source.replace(needle, replacement);
}

replaceExactly(
  "appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})",
  "appraisalId:r,clientName:G.name,birthDate:G.birthday||M,divination:l,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``,snapshot:Fi(r)})",
  "shared reading draft request payload",
);


const saveEvent = (state) => `window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status",{detail:{state:"${state}"}}))`;
replaceExactly(
  "let a=await fetch(`/api/appraisals/save-draft`",
  saveEvent("saving") + ";let a=await fetch(`/api/appraisals/save-draft`",
  "show saving state before server request",
);
replaceExactly(
  "if(!a.ok){B(a.data.message||`途中保存できませんでした`);return}",
  "if(!a.ok){" + saveEvent("error") + ";B(a.data.message||`途中保存できませんでした`);return}",
  "only mark network save as failed after response",
);
replaceExactly(
  "B(`${W.name}の鑑定準備を履歴へ保存しました`),k(`appraisalProfiles`)",
  saveEvent("saved") + ";B(`${W.name}の鑑定準備を履歴へ保存しました`),k(`appraisalProfiles`)",
  "only mark saved after success",
);
const saveStatusRuntime = `;(()=>{if(window.__NumeriaDraftSaveStatusV1)return;window.__NumeriaDraftSaveStatusV1=true;
let status="idle";const labels={saving:"鑑定の下書きを保存中…",saved:"鑑定の下書きを保存しました",error:"保存できませんでした。内容を確認して再試行してください"};
function render(){let box=document.getElementById("numeria-draft-save-status");if(!box){box=document.createElement("div");box.id="numeria-draft-save-status";box.setAttribute("role","status");box.setAttribute("aria-live","polite");document.body.appendChild(box)}box.hidden=status==="idle";box.textContent=labels[status]||"";box.dataset.state=status}
window.addEventListener("numeria-reading-draft-save-status",event=>{let next=event.detail?.state;if(!labels[next])return;status=next;render()});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();`;
source += saveStatusRuntime;

writeFileSync(assetPath, source);
console.log("Reading draft persistence patched with the complete editable snapshot.");
