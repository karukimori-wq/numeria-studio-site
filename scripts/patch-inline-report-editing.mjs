import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(assetPath, "utf8");

function replaceExactly(needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected 1 ${label}, found ${count}.`);
  source = source.split(needle).join(replacement);
}

replaceExactly(
  "function Hs({name:e,birthName:t,birthday:n,theme:r,numbers:i,drafts:a,intro:o,advice:s,template:c,accent:l,backgroundColor:u,fontStyle:d,numberStyle:f,reportTitle:p,practitionerName:m,showIntro:h,showNumberSummary:g,showDetailedReading:_=!0,showTheme:v,showMessage:y,customItems:ee=[],logoImage:b,compatibility:x,typography:S=ea,large:C=!1}){",
  "function Hs({name:e,birthName:t,birthday:n,theme:r,numbers:i,drafts:a,intro:o,advice:s,template:c,accent:l,backgroundColor:u,fontStyle:d,numberStyle:f,reportTitle:p,practitionerName:m,showIntro:h,showNumberSummary:g,showDetailedReading:_=!0,showTheme:v,showMessage:y,customItems:ee=[],logoImage:b,compatibility:x,typography:S=ea,large:C=!1,editBindings:ue=null}){",
  "report preview editBindings parameter",
);

replaceExactly(
  "h&&(0,Z.jsx)(`p`,{className:`paper-intro`,children:o})",
  "h&&(0,Z.jsx)(`p`,{className:`paper-intro inline-report-editable`,contentEditable:!!ue?.intro,suppressContentEditableWarning:!0,\"data-report-edit-key\":`intro`,\"data-report-edit-label\":`鑑定書のはじめに`,\"data-report-template\":`数秘が映し出す本質には、静かな強さとやさしい光があります。この鑑定書が、これからの選択を信じるための小さな灯りになりますように。`,\"data-report-ai\":`あなたの数字は、今の迷いを責めるためではなく、進む方向をやさしく照らすためにあります。ここから先の選択を、自分の感覚で確かめながら歩いていきましょう。`,onBlur:e=>ue?.intro?.(e.currentTarget.textContent||``),children:o})",
  "intro inline editable",
);

replaceExactly(
  "v&&(0,Z.jsxs)(`section`,{className:`paper-theme`,children:[(0,Z.jsx)(`small`,{children:`THEME`}),(0,Z.jsx)(`p`,{children:r||`今回のご相談テーマ`})]})",
  "v&&(0,Z.jsxs)(`section`,{className:`paper-theme`,children:[(0,Z.jsx)(`small`,{children:`THEME`}),(0,Z.jsx)(`p`,{className:`inline-report-editable`,contentEditable:!!ue?.theme,suppressContentEditableWarning:!0,\"data-report-edit-key\":`theme`,\"data-report-edit-label\":`テーマ文`,\"data-report-template\":`今回のテーマを、数字が示す本質と現在の流れから読み解きます。`,\"data-report-ai\":`今の相談テーマを、あなたの本質・役割・今年の流れの3つから整理し、無理なく選べる方向へ言葉にしていきます。`,onBlur:e=>ue?.theme?.(e.currentTarget.textContent||``),children:r||`今回のご相談テーマ`})]})",
  "cover theme inline editable",
);

replaceExactly(
  "(0,Z.jsxs)(`section`,{className:`reading-chapter`,children:[(0,Z.jsx)(`small`,{children:`01 · OVERVIEW`}),(0,Z.jsx)(`h2`,{children:`数字が描く全体像`}),(0,Z.jsx)(`p`,{children:a.overview})]})",
  "(0,Z.jsxs)(`section`,{className:`reading-chapter`,children:[(0,Z.jsx)(`small`,{children:`01 · OVERVIEW`}),(0,Z.jsx)(`h2`,{children:`数字が描く全体像`}),(0,Z.jsx)(`p`,{className:`inline-report-editable`,contentEditable:!!ue?.drafts,suppressContentEditableWarning:!0,\"data-report-edit-key\":`overview`,\"data-report-edit-label\":`まとめ文`,\"data-report-template\":`8つの数字は、それぞれが別々に働くのではなく、あなたらしい選択を支える一つの流れとして重なっています。`,\"data-report-ai\":`全体を見ると、あなたの数字は「自分で決める力」と「周囲へ価値を届ける力」を同時に育てる配置です。焦らず、今できる一歩へ落とし込むことが鍵になります。`,onBlur:e=>ue?.drafts?.(t=>({...t,overview:e.currentTarget.textContent||``})),children:a.overview})]})",
  "overview inline editable",
);

replaceExactly(
  "v&&(0,Z.jsxs)(`section`,{className:`paper-theme detailed-theme`,children:[(0,Z.jsx)(`small`,{children:`YOUR QUESTION`}),(0,Z.jsx)(`p`,{children:r||`今回のご相談テーマ`})]})",
  "v&&(0,Z.jsxs)(`section`,{className:`paper-theme detailed-theme`,children:[(0,Z.jsx)(`small`,{children:`YOUR QUESTION`}),(0,Z.jsx)(`p`,{className:`inline-report-editable`,contentEditable:!!ue?.theme,suppressContentEditableWarning:!0,\"data-report-edit-key\":`theme-detail`,\"data-report-edit-label\":`テーマ文`,\"data-report-template\":`今回のテーマを、数字が示す本質と現在の流れから読み解きます。`,\"data-report-ai\":`今の相談テーマを、あなたの本質・役割・今年の流れの3つから整理し、無理なく選べる方向へ言葉にしていきます。`,onBlur:e=>ue?.theme?.(e.currentTarget.textContent||``),children:r||`今回のご相談テーマ`})]})",
  "detailed theme inline editable",
);

replaceExactly(
  "y&&(0,Z.jsxs)(`section`,{className:`paper-message detailed-message`,children:[(0,Z.jsx)(`small`,{children:`MESSAGE FOR YOU`}),(0,Z.jsx)(`p`,{children:s})]})",
  "y&&(0,Z.jsxs)(`section`,{className:`paper-message detailed-message`,children:[(0,Z.jsx)(`small`,{children:`MESSAGE FOR YOU`}),(0,Z.jsx)(`p`,{className:`inline-report-editable`,contentEditable:!!ue?.advice,suppressContentEditableWarning:!0,\"data-report-edit-key\":`advice`,\"data-report-edit-label\":`今後へのメッセージ`,\"data-report-template\":`今は、周囲の期待よりも自分の内側から聞こえる声を大切にする時期です。急いで答えを出さず、心が自然にひらく方向へ一歩ずつ進んでみてください。`,\"data-report-ai\":`これからは、正解を外側に探すよりも、自分の中にある小さな違和感と納得感を丁寧に見分けることが大切です。できることから一つずつ選び、未来の土台を整えていきましょう。`,onBlur:e=>ue?.advice?.(e.currentTarget.textContent||``),children:s})]})",
  "advice inline editable",
);

const editBindings = "editBindings:{intro:ut,advice:ft,theme:ye,drafts:mt}";
source = source.replace(
  "compatibility:ot})]})]}):(0,Z.jsxs)(`div`,{className:`full-preview`",
  `compatibility:ot,${editBindings}})]})]}):(0,Z.jsxs)(\`div\`,{className:\`full-preview\``,
);
source = source.replace(
  "typography:Xt,large:!0})})]})]})",
  `typography:Xt,large:!0,${editBindings}})})]})]})`,
);

if (!source.includes("editBindings:{intro:ut,advice:ft,theme:ye,drafts:mt}")) {
  throw new Error("Inline report edit bindings were not installed.");
}

const toolbarRuntime = `;(()=>{if(window.__NumeriaInlineReportEditor)return;window.__NumeriaInlineReportEditor=!0;let active=null,bar=null;let ensure=()=>{if(bar)return bar;bar=document.createElement("div");bar.className="report-inline-editor-toolbar no-print";bar.innerHTML='<strong>文章ブロックを編集中</strong><button type="button" data-action="template">定型文</button><button type="button" data-action="ai">AI再生成</button><button type="button" data-action="save">下書き保存</button>';document.body.appendChild(bar);bar.addEventListener("mousedown",e=>e.preventDefault());bar.addEventListener("click",e=>{let button=e.target.closest("button");if(!button||!active)return;let action=button.dataset.action;if(action==="template"||action==="ai"){active.textContent=active.dataset[action==="template"?"reportTemplate":"reportAi"]||active.textContent;active.dispatchEvent(new Event("input",{bubbles:true}));active.focus();return}if(action==="save"){active.blur();let buttons=[...document.querySelectorAll("button")];let draft=buttons.find(b=>/下書き保存/.test(b.textContent||""));draft?.click()}});return bar};document.addEventListener("focusin",e=>{let target=e.target.closest?.("[data-report-edit-key]");if(!target)return;active=target;let label=target.dataset.reportEditLabel||"文章ブロック";let node=ensure();node.querySelector("strong").textContent=label+"を編集中";node.classList.add("is-visible")});document.addEventListener("focusout",e=>{if(!e.target.closest?.("[data-report-edit-key]"))return;window.setTimeout(()=>{if(document.activeElement?.closest?.("[data-report-edit-key]"))return;bar?.classList.remove("is-visible");active=null},140)})})();`;

if (!source.includes("__NumeriaInlineReportEditor")) {
  source += toolbarRuntime;
}

writeFileSync(assetPath, source);
console.log("Numeria inline report editing patched for intro, advice, theme, and overview blocks.");
