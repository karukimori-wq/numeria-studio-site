import { readFileSync, writeFileSync } from "node:fs";

const path = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(path, "utf8");
function replaceOne(needle, replacement) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Numerology name input anchor expected once, found ${count}: ${needle}`);
  source = source.replace(needle, replacement);
}
replaceOne('[M,se]=(0,i.useState)(`1992-08-17`)', 'numeriaNameInputsRef=(0,i.useRef)(normalizeNumerologyNameInputs(null)),[M,se]=(0,i.useState)(`1992-08-17`)');
replaceOne('Fi=e=>({id:e,divination:l,name:j,birthName:ae,birthday:M,', 'Fi=e=>({id:e,divination:l,name:j,birthName:ae,birthday:M,numerologyNameInputs:normalizeNumerologyNameInputs(numeriaNameInputsRef.current),');
replaceOne('di=()=>{', 'di=()=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);');
replaceOne('hi=e=>{let t=d.find(t=>t.id===e);', 'hi=e=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);let t=d.find(t=>t.id===e);');
replaceOne('let n=t.snapshot;Bt(e)', 'let n=t.snapshot;numeriaNameInputsRef.current=normalizeNumerologyNameInputs(n.numerologyNameInputs);Bt(e)');
replaceOne('getReadingSnapshot:function(sessionId){return Fi(sessionId||Dn)}', `getReadingSnapshot:function(sessionId){return Fi(sessionId||Dn)},updateNumerologyNames:function(change){
  if(l!=="numerology"||change?.role==="partner"&&!ce)return{ok:false,message:"対象の数秘術鑑定を開いてください"};
  let result=updateNumerologyNameInputs(numeriaNameInputsRef.current,change,Fi(Dn));
  if(result.ok){numeriaNameInputsRef.current=result.value;window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status",{detail:{state:"dirty"}}))}
  return result;
},saveReadingDraft:function(){return Ii()}`);
replaceOne('getReadingSnapshot:function(){return call(`getReadingSnapshot`,arguments)}', 'getReadingSnapshot:function(){return call(`getReadingSnapshot`,arguments)},updateNumerologyNames:function(){return call(`updateNumerologyNames`,arguments)},saveReadingDraft:function(){return call(`saveReadingDraft`,arguments)}');
// Nine-star input stays explicit; legacy birth fields never imply clock confirmation.
replaceOne('numeriaNameInputsRef=(0,i.useRef)', 'numeriaKigakuInputRef=(0,i.useRef)(null),numeriaNameInputsRef=(0,i.useRef)');
replaceOne('numerologyNameInputs:normalizeNumerologyNameInputs(numeriaNameInputsRef.current),', 'kigakuInput:l==="nine-star-ki"?structuredClone(numeriaKigakuInputRef.current):null,numerologyNameInputs:normalizeNumerologyNameInputs(numeriaNameInputsRef.current),');
replaceOne('di=()=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);', 'di=()=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);numeriaKigakuInputRef.current=null;');
replaceOne('hi=e=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);', 'hi=e=>{numeriaNameInputsRef.current=normalizeNumerologyNameInputs(null);numeriaKigakuInputRef.current=null;');
replaceOne('let n=t.snapshot;numeriaNameInputsRef.current=', 'let n=t.snapshot;numeriaKigakuInputRef.current=n.divination==="nine-star-ki"&&n.kigakuInput?.methodKey==="nine-star-ki"?structuredClone(n.kigakuInput):null;numeriaNameInputsRef.current=');
replaceOne('updateNumerologyNames:function(change){', `updateKigakuInput:function(input){
  if(l!=="nine-star-ki"||!input||typeof input!=="object"||Array.isArray(input)||input.methodKey!=="nine-star-ki")return{ok:false,message:"九星気学の入力を確認してください"};
  numeriaKigakuInputRef.current=structuredClone(input);
  window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status",{detail:{state:"dirty"}}));
  return{ok:true};
},updateNumerologyNames:function(change){`);
replaceOne('updateNumerologyNames:function(){return call(`updateNumerologyNames`,arguments)}', 'updateKigakuInput:function(){return call(`updateKigakuInput`,arguments)},updateNumerologyNames:function(){return call(`updateNumerologyNames`,arguments)}');
writeFileSync(path, source);
console.log("Numerology name selection and explicit confirmation connected to reading snapshots, draft save, restore and reset.");
