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
writeFileSync(path, source);
console.log("Numerology name selection and explicit confirmation connected to reading snapshots, draft save, restore and reset.");
