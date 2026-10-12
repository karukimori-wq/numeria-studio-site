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
const savingAnchor = "let a=await fetch(`/api/appraisals/save-draft`";
const failureAnchor = "if(!a.ok){B(a.data.message||`途中保存できませんでした`);return}";
const successAnchor = "B(`${W.name}の鑑定準備を履歴へ保存しました`),k(`appraisalProfiles`)";
const allAnchorsPresent = [savingAnchor,failureAnchor,successAnchor].every(needle => source.split(needle).length === 2);
if (allAnchorsPresent) {
  replaceExactly(savingAnchor, saveEvent("saving") + ";" + savingAnchor, "draft saving");
  replaceExactly(failureAnchor, "if(!a.ok){" + saveEvent("error") + ";B(a.data.message||`途中保存できませんでした`);return}", "draft failed");
  replaceExactly(successAnchor, saveEvent("saved") + ";" + successAnchor, "draft saved");
} else {
  // The restored legacy production bundle can differ from the tracked source.
  // Never fail the entire site build or claim a saved state for an unknown route.
  console.warn("Draft save status not attached: generated bundle does not match the verified save flow.");
}
const saveStatusRuntime = `;(()=>{if(window.__NumeriaDraftSaveStatusV1)return;window.__NumeriaDraftSaveStatusV1=true;
let status="idle";const labels={saving:"鑑定の下書きを保存中…",saved:"鑑定の下書きを保存しました",error:"保存できませんでした。内容を確認して再試行してください"};
function render(){if(!document.getElementById("numeria-draft-save-status-style")){let style=document.createElement("style");style.id="numeria-draft-save-status-style";style.textContent="#numeria-draft-save-status{position:fixed;top:calc(85px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:10000;max-width:min(420px,calc(100vw - 24px));padding:12px 16px;background:#fffdf7;border:1px solid #d9c58c;border-radius:12px;box-shadow:0 8px 28px #20192d26;color:#332944;font:600 13px/1.5 system-ui,sans-serif;text-align:center;pointer-events:none}#numeria-draft-save-status[hidden]{display:none!important}#numeria-draft-save-status[data-state=error]{border-color:#cd7d79;color:#923a39}";document.head.appendChild(style)}let box=document.getElementById("numeria-draft-save-status");if(!box){box=document.createElement("div");box.id="numeria-draft-save-status";box.setAttribute("role","status");box.setAttribute("aria-live","polite");document.body.appendChild(box)}box.hidden=status==="idle";box.textContent=labels[status]||"";box.dataset.state=status}
window.addEventListener("numeria-reading-draft-save-status",event=>{let next=event.detail?.state;if(!labels[next])return;status=next;render()});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();`;
source += saveStatusRuntime;

writeFileSync(assetPath, source);
console.log("Reading draft persistence patched with the complete editable snapshot.");
