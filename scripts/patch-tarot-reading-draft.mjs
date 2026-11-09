import { readFileSync, writeFileSync } from "node:fs";
const path = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(path, "utf8");
function replaceOne(needle, replacement) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw Error(`Tarot draft anchor expected once, found ${count}: ${needle.slice(0, 90)}`);
  source = source.replace(needle, replacement);
}
replaceOne('numeriaNameInputsRef=(0,i.useRef)', '[numeriaTarotNewKey,setNumeriaTarotNewKey]=(0,i.useState)(0),numeriaTarotResumeRef=(0,i.useRef)(null),numeriaNameInputsRef=(0,i.useRef)');
replaceOne('di=()=>{', 'di=()=>{numeriaTarotResumeRef.current=null;setNumeriaTarotNewKey(value=>value+1);');
replaceOne('hi=e=>{', 'hi=e=>{numeriaTarotResumeRef.current=null;setNumeriaTarotNewKey(value=>value+1);');
replaceOne('}],Vo=[{name:`Midnight`', '},{id:`three-months`,name:`3か月の流れ`,caption:`対象月から3か月の流れ`,positions:[`対象月`,`翌月`,`翌々月`],layout:[{x:25,y:50},{x:50,y:50},{x:75,y:50}]},{id:`problem-solving-three`,name:`問題解決3枚`,caption:`問題・背景・行動を整理`,positions:[`問題`,`背景`,`行動`],layout:[{x:25,y:50},{x:50,y:50},{x:75,y:50}]}],Vo=[{name:`Midnight`');
replaceOne('let n=t.snapshot;', 'let n=t.snapshot;if(n.divination===`tarot`){numeriaTarotResumeRef.current=structuredClone(n);if(typeof t.draftVersion===`string`&&t.draftVersion)window.NumeriaDraftVersions?.set(n.id,t.draftVersion);Bt(e),V(n.id),u(`tarot`),k(`reading`);return}');
replaceOne('jsx)(Bs,{appraisalProfiles:d,selectedCustomerId:zt,onSelectCustomer:Bt,', 'jsx)(Bs,{resumeSnapshot:numeriaTarotResumeRef.current,appraisalProfiles:d,selectedCustomerId:zt,onSelectCustomer:clientId=>{numeriaTarotResumeRef.current=null;Bt(clientId)},');
replaceOne('onSaved:Si,onReportGenerated:e=>void Gi(`tarot`,e)}),', 'onSaved:Si,onReportGenerated:e=>void Gi(`tarot`,e)},numeriaTarotResumeRef.current?.id||`new-tarot-${zt}-${numeriaTarotNewKey}`),');
replaceOne('function Bs({appraisalProfiles:e,', 'function Bs({resumeSnapshot,appraisalProfiles:e,');
replaceOne('onReportGenerated:g}){let[_,v]', 'onReportGenerated:g}){let restored=restoreTarotEditor(resumeSnapshot),tarotId=(0,i.useRef)(restored?resumeSnapshot.id:`tarot-${crypto.randomUUID()}`),tarotSaving=(0,i.useRef)(false),tarotLatest=(0,i.useRef)(null),[tarotOptions,setTarotOptions]=(0,i.useState)({deckSize:restored?.deckSize??22,reversalsEnabled:restored?.reversalsEnabled??true,theme:restored?.theme??``,optionA:restored?.optionA??``,optionB:restored?.optionB??``,partnerRef:restored?.partnerRef??``,confirmationKey:restored?.confirmationKey??``});let[_,v]');
const bsStart = source.indexOf("function Bs("), bsEnd = source.indexOf("function Vs(", bsStart);
let component = source.slice(bsStart, bsEnd);
const localReplace = (needle, replacement) => {
  if (component.split(needle).length !== 2) throw Error(`Tarot component anchor: ${needle.slice(0, 90)}`);
  component = component.replace(needle, replacement);
};
localReplace('[y,ee]=(0,i.useState)(`three-time`)', '[y,ee]=(0,i.useState)(restored?.spreadId??`three-time`)');
localReplace('[b,x]=(0,i.useState)(s)', '[b,x]=(0,i.useState)(restored?.artDeck??s)');
for (const [name, setter, field] of [["S", "C", "question"], ["D", "ne", "situation"], ["O", "k", "advice"], ["A", "re", "action"], ["j", "ie", "overall"]]) {
  const pattern = new RegExp(`\\[${name},${setter}\\]=\\(0,i.useState\\)\\((\x60[^\x60]*\x60)\\)`);
  if (!pattern.test(component)) throw Error(`Tarot initial ${name}`);
  component = component.replace(pattern, `[${name},${setter}]=(0,i.useState)(restored?.${field}??$1)`);
}
localReplace('[te,w]=(0,i.useState)(new Date().toISOString().slice(0,10))', '[te,w]=(0,i.useState)(restored?.referenceDate??new Date().toISOString().slice(0,10))');
localReplace('[T,E]=(0,i.useState)(5500)', '[T,E]=(0,i.useState)(restored?.price??5500)');
localReplace('Fo.map((e,t)=>(0,Z.jsx)(`optgroup`', '(tarotOptions.deckSize===78?Fo:[]).map((e,t)=>(0,Z.jsx)(`optgroup`');
const selectionStart = component.indexOf('[ae,oe]=(0,i.useState)('), selectionEnd = component.indexOf(',[M,se]', selectionStart);
component = component.slice(0, selectionStart) + component.slice(selectionStart, selectionEnd).replace('(0,i.useState)(', '(0,i.useState)(restored?.selections??') + component.slice(selectionEnd);
localReplace('ge=()=>{h({customerId:N.id,date:te,theme:S,menuName:`タロット・${ue.name}`,price:T}),se(`共通の鑑定カルテへ保存しました。`)}', `getTarotEditor=()=>({...tarotOptions,spreadId:y,selections:ae,referenceDate:te,question:S,situation:D,advice:O,action:A,overall:j,artDeck:b,price:T}),ge=async()=>{
if(tarotSaving.current)return false;tarotSaving.current=true;se(\`下書きを保存しています…\`);
try{let snapshot=createTarotReadingSnapshot({id:tarotId.current,customer:N,editor:getTarotEditor()}),result=await saveTarotReadingDraft({snapshot,fetcher:(...args)=>window.NumeriaAuthenticatedFetch(...args),expectedDraftVersion:window.NumeriaDraftVersions?.get(snapshot.id)??null});
if(!result.ok){se(result.message);return false}if(result.draftVersion)window.NumeriaDraftVersions?.set(snapshot.id,result.draftVersion);
h({id:snapshot.id,customerId:N.id,date:te,theme:S,menuName:\`タロット・\${ue.name}\`,price:T,snapshot:result.snapshot,draftVersion:result.draftVersion});if(JSON.stringify(tarotLatest.current)!==JSON.stringify(snapshot)){se(\`保存中に入力が変更されました。現在の内容をもう一度保存してください。\`);return false}se(\`タロットの入力と計算結果を下書き保存しました。\`);return true
}finally{tarotSaving.current=false}}`);
localReplace(';return(0,Z.jsxs)(`div`,{className:`reading-workspace tarot-reading-workspace', ';tarotLatest.current=createTarotReadingSnapshot({id:tarotId.current,customer:N,editor:getTarotEditor()});return(0,Z.jsxs)(`div`,{className:`reading-workspace tarot-reading-workspace');
localReplace('ge(),g(`tarot-${Date.now()}`)', 'if(!await ge())throw Error(`draft save failed`);g(tarotId.current)');
// Explicit confirmation is bound to the exact customer, cards, dates and purpose.
const controls = `(0,Z.jsxs)(\`fieldset\`,{className:\`tarot-calculation-inputs\`,children:[(0,Z.jsx)(\`legend\`,{children:\`計算に使うカード\`}),(0,Z.jsxs)(\`label\`,{children:[\`使用枚数\`,(0,Z.jsxs)(\`select\`,{value:tarotOptions.deckSize,onChange:e=>setTarotOptions({...tarotOptions,deckSize:Number(e.target.value)}),children:[(0,Z.jsx)(\`option\`,{value:22,children:\`大アルカナ22枚\`}),(0,Z.jsx)(\`option\`,{value:78,children:\`全78枚\`})]})]}),(0,Z.jsxs)(\`label\`,{children:[(0,Z.jsx)(\`input\`,{type:\`checkbox\`,checked:tarotOptions.reversalsEnabled,onChange:e=>setTarotOptions({...tarotOptions,reversalsEnabled:e.target.checked})}),\`逆位置を使用する\`]}),(0,Z.jsxs)(\`label\`,{children:[(0,Z.jsx)(\`input\`,{type:\`checkbox\`,checked:tarotOptions.confirmationKey===tarotSelectionKey(N,getTarotEditor()),onChange:e=>setTarotOptions({...tarotOptions,confirmationKey:e.target.checked?tarotSelectionKey(N,getTarotEditor()):\`\`})}),\`この配置・カード・向きを確認した\`]}),(0,Z.jsx)(\`p\`,{role:\`status\`,children:tarotOptions.confirmationKey===tarotSelectionKey(N,getTarotEditor())?\`入力確認済み。計算結果は確認待ちの下書きとして保存します。\`:\`未確認。初期表示のカードは計算結果として保存しません。\`})]}),`;
localReplace('(0,Z.jsx)(`h2`,{children:`タロットの種類とスプレッド`}),', '(0,Z.jsx)(`h2`,{children:`タロットの種類とスプレッド`}),'+controls);
const purposeControls = `(0,Z.jsxs)(\`label\`,{children:[\`相談の用途\`,(0,Z.jsxs)(\`select\`,{value:tarotOptions.theme,onChange:e=>setTarotOptions({...tarotOptions,theme:e.target.value}),children:[[\`\`,\`未選択\`],[\`love\`,\`恋愛\`],[\`work\`,\`仕事\`],[\`other\`,\`その他\`]].map(([value,label])=>(0,Z.jsx)(\`option\`,{value,children:label},value))})]}),...[[\`partnerRef\`,\`相手の識別名（関係性の相談）\`],[\`optionA\`,\`選択肢A\`],[\`optionB\`,\`選択肢B\`]].map(([field,label])=>(0,Z.jsxs)(\`label\`,{children:[label,(0,Z.jsx)(\`input\`,{value:tarotOptions[field],maxLength:256,onChange:e=>setTarotOptions({...tarotOptions,[field]:e.target.value})})]},field)),`;
localReplace('(0,Z.jsx)(`h2`,{children:`タロットの種類とスプレッド`}),', '(0,Z.jsx)(`h2`,{children:`タロットの種類とスプレッド`}),'+purposeControls);
localReplace('children:`顧客履歴に保存`', 'children:`鑑定の下書きを保存`');
localReplace('className:`tarot-editor-actions`,children:[', 'className:`tarot-editor-actions`,children:[(0,Z.jsx)(`p`,{role:`status`,"data-tarot-calculation-status":true,children:tarotDraftCalculationMessage(createTarotReadingSnapshot({id:tarotId.current,customer:N,editor:getTarotEditor()}).tarotCalculation)}),');
source = source.slice(0, bsStart) + component + source.slice(bsEnd);
replaceOne('history:[{id:`tarot-${Date.now()}`,date:e.date.replaceAll(`-`,`.`),theme:e.theme,status:`納品済み`,menuName:e.menuName,price:e.price,divination:`tarot`},...t.history]', 'history:[{id:e.id,date:e.date.replaceAll(`-`,`.`),theme:e.theme,status:`下書き`,menuName:e.menuName,price:e.price,divination:`tarot`,snapshot:e.snapshot,draftVersion:e.draftVersion},...t.history.filter(item=>item.id!==e.id)]');
replaceOne('Si=e=>{f(t=>t.map(t=>t.id===e.customerId?{...t,status:`納品済み`', 'Si=e=>{f(t=>t.map(t=>t.id===e.customerId?{...t,status:`下書き`');
writeFileSync(path, source);
console.log("Tarot reading inputs, recomputed checkpoints and authenticated draft save/restore connected.");
