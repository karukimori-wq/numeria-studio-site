import { readFileSync, writeFileSync } from "node:fs";
const path = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(path, "utf8");
function replaceOne(needle, replacement) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw Error(`Registered numerology preview anchor (${count}): ${needle.slice(0, 80)}`);
  source = source.replace(needle, replacement);
}
replaceOne('numeriaNameInputsRef=(0,i.useRef)', 'numeriaRegisteredInputRef=(0,i.useRef)({enabled:false,family:{}}),numeriaNameInputsRef=(0,i.useRef)');
replaceOne('numerologyNameInputs:normalizeNumerologyNameInputs(numeriaNameInputsRef.current),', 'numerologyNameInputs:normalizeNumerologyNameInputs(numeriaNameInputsRef.current),numerologyRegisteredPagesEnabled:numeriaRegisteredInputRef.current.enabled===true,numerologyFamilyInput:{...numeriaRegisteredInputRef.current.family},');
for (const entry of ['di=()=>{', 'hi=e=>{']) replaceOne(entry, entry+'numeriaRegisteredInputRef.current={enabled:false,family:{}};');
replaceOne('let n=t.snapshot;', 'let n=t.snapshot;numeriaRegisteredInputRef.current={enabled:n.numerologyRegisteredPagesEnabled===true,family:n.numerologyFamilyInput&&typeof n.numerologyFamilyInput===`object`?{context:n.numerologyFamilyInput.context||``,parentDirection:n.numerologyFamilyInput.parentDirection||``}:{}};');
replaceOne('updateNumerologyNames:function(change){', `updateNumerologyRegisteredPages:function(change){
if(l!==\`numerology\`)return{ok:false};let current=numeriaRegisteredInputRef.current;
numeriaRegisteredInputRef.current={enabled:typeof change?.enabled===\`boolean\`?change.enabled:current.enabled,family:change?.family?{context:[\`parent-child\`,\`partners\`,\`other-family\`].includes(change.family.context)?change.family.context:\`\`,parentDirection:[\`a-parent\`,\`b-parent\`].includes(change.family.parentDirection)?change.family.parentDirection:\`\`}:current.family};
window.dispatchEvent(new CustomEvent(\`numeria-reading-draft-save-status\`,{detail:{state:\`dirty\`}}));return{ok:true};},updateNumerologyNames:function(change){`);
replaceOne('updateNumerologyNames:function(){return call(`updateNumerologyNames`,arguments)}', 'updateNumerologyRegisteredPages:function(){return call(`updateNumerologyRegisteredPages`,arguments)},updateNumerologyNames:function(){return call(`updateNumerologyNames`,arguments)}');
const material = '(0,Z.jsx)(ts,{numbers:F,theme:P,menuName:Se,visitDate:be,drafts:pt,updateDraft:Ni})';
replaceOne(material, material + ',(0,Z.jsx)(NumeriaRegisteredNumerologyPreview,{})');
const runtime = ["numerology-figure-renderer.js", "numerology-a4.js", "numerology-registered-preview.js"].map(name => readFileSync(`src/${name}`, "utf8").replace(/^import .*;\s*/gm, "").replaceAll("export const ", "const ").replaceAll("export async function ", "async function ").replaceAll("export function ", "function ")).join("\n");
writeFileSync(path, source + "\n" + runtime + '\nfunction NumeriaRegisteredNumerologyPreview(){return renderNumerologyRegisteredPreview(i,Z,{api:window.NumeriaNavigation,fetcher:(...args)=>window.NumeriaAuthenticatedFetch(...args),mountNameForm:mountNumerologyNameForm})}\n');
console.log("Recovered numerology registered copy/figures/A4 connected to current reading inputs; raw registry remains server-only.");
