import assert from 'node:assert/strict';
import {withFourPillarsCalculationCheckpoint as attach} from '../src/four-pillars-calculation-checkpoint.js';
import {buildFourPillarsDraftPreview as build,renderFourPillarsDraftPage as render,FOUR_PILLARS_DRAFT_PREVIEW_CSS} from '../src/four-pillars-draft-preview.js';
import {REPORT_PAGE_DEFINITIONS,reportPageDefinitionsFor} from '../src/report-page-definitions.js';
import {assessReportPageAvailability} from '../src/report-page-availability.js';
const clock={date:'1948-09-12',time:'00:30:45',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:600};
const snapshot=attach({id:'preview-synthetic',divination:'four-pillars',fourPillarsInput:{methodKey:'four-pillars',subjectId:'preview-a',partnerSubjectId:'preview-b',birthClock:clock,partnerBirthClock:{...clock,offsetChoiceMinutes:540},referenceDate:'2026-11-18',calculationSex:'female',familyContext:'parent-child',parentDirection:'a-parent'}});
const defs=REPORT_PAGE_DEFINITIONS.filter(page=>page.methodKey==='four-pillars');
assert.equal(defs.length,14);
for(const layout of ['standard','magazine']){
 const model=build(snapshot,REPORT_PAGE_DEFINITIONS,layout);assert.equal(model.pages.length,14);assert.equal(model.layoutId,layout);assert.equal(model.publicationAllowed,false);
 for(const {definition} of model.pages){const html=render(model,definition.pageDefinitionId);assert(html.includes(definition.pageDefinitionId));assert(html.includes('計算確認用・未承認'));assert(html.includes('正式発行：不可'));assert(html.includes(`nbdp-${layout}`));assert(!html.includes('undefined'));assert(!html.includes('<script'));assert.equal(assessReportPageAvailability(definition,snapshot.fourPillarsCalculation).available,false);}
 assert(render(model,'BAZ-06').includes('2049-12-24'));assert(render(model,'BAZ-14').includes('満81歳'));assert(render(model,'BAZ-13').includes('2027節年'));assert(render(model,'BAZ-12').includes('本人：親'));assert(render(model,'BAZ-08').includes('0件'));
}
const free=build(snapshot,reportPageDefinitionsFor('four-pillars','free'));assert.equal(free.pages.length,5);assert(!render(free,'BAZ-14').includes('2029-12-24'));
assert.equal(build(snapshot,[]).available,false);assert.equal(build({...snapshot,divination:'tarot'},defs).available,false);
const changed=structuredClone(snapshot);changed.fourPillarsInput.calculationSex='male';assert.equal(build(changed,defs).available,false);
const confirmed=structuredClone(snapshot);confirmed.fourPillarsCalculation.status='confirmed';assert.equal(build(confirmed,defs).available,false);
const permitted=structuredClone(snapshot);permitted.fourPillarsCalculation.publicationAllowed=true;assert.equal(build(permitted,defs).available,false);
const wrong=structuredClone(snapshot);wrong.fourPillarsCalculation.calculation.subject='different';assert.equal(build(wrong,defs).available,false);
const escaped=structuredClone(snapshot);escaped.fourPillarsCalculation.calculation.pages[0].data.pillars.year='<img src=x onerror=alert(1)>';
const html=render(build(escaped,[{...defs[0],title:'<script>alert(1)</script>'}]),'BAZ-01');assert(!html.includes('<script'));assert(!html.includes('<img'));assert(html.includes('図表の計算結果が揃っていません'));assert(html.includes('&lt;script'));
const noData=structuredClone(snapshot);noData.fourPillarsCalculation.calculation.pages[2].data={};assert(render(build(noData,defs),'BAZ-03').includes('図表の計算結果が揃っていません'));
const missing=attach({...snapshot,fourPillarsInput:{...snapshot.fourPillarsInput,calculationSex:null}});assert(render(build(missing,defs),'BAZ-06').includes('必要な計算結果が確定していません'));
const reordered=structuredClone(snapshot);reordered.fourPillarsInput=Object.fromEntries(Object.entries(reordered.fourPillarsInput).reverse());assert.equal(build(reordered,defs).available,true);
assert(FOUR_PILLARS_DRAFT_PREVIEW_CSS.includes('@media print'));assert(FOUR_PILLARS_DRAFT_PREVIEW_CSS.includes('未承認の計算確認画面は正式発行できません'));
console.log('Four Pillars draft page preview: 14x2 layouts, Free five-definition filtering, saved-source scope, no approval promotion, missing/zero, interval facts, escaping and native-print suppression PASS; formal report/PDF pending.');
for(const value of [undefined,null,{}]){
 const malformed=structuredClone(snapshot);malformed.fourPillarsCalculation.calculation.pages[7].data.matches=value;
 const output=render(build(malformed,defs),'BAZ-08');assert(output.includes('図表の計算結果が揃っていません'));assert(!output.includes('0件'));
}
const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
const figureSource=['src/report-result-references.js','src/report-figure-types.js','src/report-figure-renderer.js','src/four-pillars-figures.js'].map(path=>readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replaceAll('export const ','const ').replaceAll('export function ','function ')).join('\n');
const source=figureSource+readFileSync('src/four-pillars-copy-data.js','utf8').replaceAll('export const ','const ')+readFileSync('src/four-pillars-page-copy.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export function ','function ')+readFileSync('src/four-pillars-draft-preview.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export function ','function ').replaceAll('export const ','const ')+readFileSync('src/four-pillars-a4-plan.js','utf8').replaceAll('export function ','function ')+readFileSync('scripts/four-pillars-a4-runtime.js','utf8')+readFileSync('scripts/four-pillars-draft-preview-runtime.js','utf8');
const listeners=new Set(),overlays=[];
const document={activeElement:null,createElement(){
 const close={isConnected:true,focus(){document.activeElement=this;}},select={value:'BAZ-01',isConnected:true,focus(){document.activeElement=this;}},content={innerHTML:''};
 const mode={isConnected:true,setAttribute(){},focus(){document.activeElement=this;}},status={textContent:''};
 const graph={isConnected:true,focus(){document.activeElement=this;}};
 const summary={isConnected:true,focus(){document.activeElement=this;}};
 const node={dataset:{},innerHTML:'',isConnected:true,setAttribute(){},querySelector:selector=>({'[data-bazi-preview-close]':close,'[data-bazi-preview-select]':select,'[data-bazi-preview-content]':content,'[data-bazi-a4-mode]':mode,'[data-bazi-a4-status]':status})[selector],querySelectorAll:()=>[close,select,mode,...(content.innerHTML.includes('nbdp-graph-viewport')?[graph]:[]),...(content.innerHTML.includes('<summary>')?[summary]:[])],remove(){this.isConnected=false;},close,select,mode,status,graph,summary,content};overlays.push(node);return node;
},body:{append(){}},addEventListener(type,listener,capture){assert.equal(capture,true);listeners.add(listener);},removeEventListener(type,listener,capture){assert.equal(capture,true);listeners.delete(listener);}};
const origin={isConnected:true,focus(){document.activeElement=this;}};document.activeElement=origin;
const context=vm.createContext({document,snapshot,structuredClone,definitions:reportPageDefinitionsFor('four-pillars','free')});vm.runInContext(source,context);
assert.equal(vm.runInContext('openFourPillarsDraftPreview({snapshot,definitions,layoutId:"magazine"}).ok',context),true);
let active=overlays.at(-1);assert(active.content.innerHTML.includes('BAZ-01'));assert.equal(document.activeElement,active.close);
active.select.value='BAZ-04';active.select.onchange();assert(active.content.innerHTML.includes('nbdp-graph-viewport'));assert(active.querySelectorAll().includes(active.graph));
active.select.value='BAZ-06';active.select.onchange();assert(active.content.innerHTML.includes('2049-12-24'));
let prevented=false,stopped=false;const key=event=>[...listeners][0](event);
key({key:'Tab',shiftKey:true,preventDefault(){prevented=true;}});assert(prevented);assert.equal(document.activeElement,active.summary);
key({key:'Tab',shiftKey:false,preventDefault(){}});assert.equal(document.activeElement,active.close);
document.activeElement=active.select;let pageSelectPrevented=false;key({key:'Tab',shiftKey:false,preventDefault(){pageSelectPrevented=true;}});assert.equal(pageSelectPrevented,false); // Native Tab can reach the first source summary.
key({key:'Escape',preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert(stopped);assert.equal(active.isConnected,false);assert.equal(listeners.size,0);assert.equal(document.activeElement,origin);
vm.runInContext('openFourPillarsDraftPreview({snapshot,definitions})',context);vm.runInContext('openFourPillarsDraftPreview({snapshot,definitions})',context);assert.equal(overlays.filter(node=>node.isConnected).length,1);assert.equal(listeners.size,1);overlays.at(-1).close.onclick();assert.equal(listeners.size,0);
console.log('Draft overlay runtime: actual renderer, page selection, single overlay/listener, focus loop, Escape isolation and return focus PASS.');

vm.runInContext('openFourPillarsDraftPreview({snapshot,definitions})',context);const pendingA4=overlays.at(-1);pendingA4.mode.onclick();assert.equal(pendingA4.status.textContent,'A4を計測中…');pendingA4.close.onclick();await Promise.resolve();assert.equal(pendingA4.isConnected,false);assert.equal(listeners.size,0);
