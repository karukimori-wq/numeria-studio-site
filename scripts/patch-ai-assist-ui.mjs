import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(assetPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  return input.split(legacyValue).join(replacementValue);
}

const bridge = `window.NumeriaAiAssistRun=window.NumeriaAiAssistRun||async function(input){try{let response=await window.NumeriaAuthenticatedFetch(\`/api/ai/assist\`,{method:\"POST\",headers:{\"Content-Type\":\"application/json\",\"X-Workspace-Id\":\"ws_personal\",\"X-Correlation-Id\":\"num_ai_ui_\"+Date.now()},body:JSON.stringify(input)}),body=await response.json().catch(()=>({}));return response.ok?{ok:true,output:String(body.output||\"\"),activityId:body.activityId||null}:{ok:false,message:body.message||\"AI補助を実行できませんでした\"}}catch(error){return{ok:false,message:error&&error.message||\"AI補助を実行できませんでした\"}}};`;

let patched = bridge + source;

const legacyButtons = "(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`button`,{type:`button`,onClick:Li,children:`プロンプトを作成`}),(0,Z.jsx)(`button`,{type:`button`,className:`primary`,onClick:Ri,children:`コピー`})]})";
const aiButtons = "(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`button`,{type:`button`,className:`primary`,onClick:async()=>{Tn(`AIで下書きを作成しています…`);let e=await window.NumeriaAiAssistRun({consultationTheme:P,divinationType:l,coreNumbers:{lifePath:F.lifePath,birthdayNumber:F.birthdayNumber,attitude:F.attitude,destiny:F.destiny,soul:F.soul,personality:F.personality,maturity:F.maturity,personalYear:F.personalYear}});if(!e.ok){Tn(e.message||`AI補助を実行できませんでした`);return}if(!e.output){Tn(`AIから下書きを受け取れませんでした`);return}wn(e.output),Tn(`AI下書きを受け取りました。内容を確認してから一括反映してください`)},children:`AIで下書きを作成`}),(0,Z.jsx)(`button`,{type:`button`,onClick:Li,children:`手動プロンプト`}),(0,Z.jsx)(`button`,{type:`button`,onClick:Ri,children:`コピー`})]})";
patched = replaceExactly(patched, legacyButtons, aiButtons, 1, "AI assist controls");

patched = replaceExactly(
  patched,
  "AIで鑑定内容を補助",
  "AIで鑑定内容を補助（Free / Pro）",
  1,
  "AI assist heading",
);

patched = replaceExactly(
  patched,
  "計算済みナンバーと相談内容からプロンプトを作り、JSON回答を一括反映します。",
  "計算済みナンバーと相談テーマだけをAPCへ送り、AI下書きを作成します。氏名・出生名・生年月日は送信しません。手動プロンプトも利用できます。",
  1,
  "AI assist privacy description",
);

if (!patched.includes("window.NumeriaAiAssistRun")) throw new Error("AI assist bridge missing from Production legacy bundle.");
if (!patched.includes("AIで下書きを作成")) throw new Error("AI assist button missing from Production legacy bundle.");
if (!patched.includes("氏名・出生名・生年月日は送信しません")) throw new Error("AI assist data-policy copy missing.");

writeFileSync(assetPath, patched);
console.log("Legacy AI writing assist connected to authenticated Numeria Worker → APC Gateway, with manual prompt fallback retained.");
