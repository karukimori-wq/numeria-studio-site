import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {withFourPillarsCalculationCheckpoint as attach} from '../src/four-pillars-calculation-checkpoint.js';
import {buildFourPillarsDraftPreview as build,renderFourPillarsDraftPage as render,FOUR_PILLARS_DRAFT_PREVIEW_CSS} from '../src/four-pillars-draft-preview.js';
import {REPORT_FIGURE_CSS} from '../src/report-figure-renderer.js';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';

// Offline geometry lab only: no API, account entitlement, or release contract.
const clock={date:'1948-09-12',time:'00:30:45',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:600};
const snapshot=attach({id:'a4-lab-synthetic',divination:'four-pillars',fourPillarsInput:{methodKey:'four-pillars',subjectId:'a',partnerSubjectId:'b',birthClock:clock,partnerBirthClock:{...clock,offsetChoiceMinutes:540},referenceDate:'2026-11-20',calculationSex:'female',familyContext:'parent-child',parentDirection:'a-parent'}});
const cases=[];
for(const layout of ['standard','magazine']){
 const model=build(snapshot,reportPageDefinitionsFor('four-pillars','pro'),layout);
 if(!model.available||model.pages.length!==14)throw Error('Expected 14 synthetic draft pages');
 for(const {definition} of model.pages)cases.push({id:definition.pageDefinitionId,layout,html:render(model,definition.pageDefinitionId)});
}
const data=JSON.stringify(cases).replace(/</g,'\\u003c');
const planner=readFileSync('src/four-pillars-a4-plan.js','utf8').replace(/export /g,'');
const runtime=readFileSync('scripts/four-pillars-a4-runtime.js','utf8');
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>四柱 A4ローカル検査・架空データ</title><style>${REPORT_FIGURE_CSS}\n${FOUR_PILLARS_DRAFT_PREVIEW_CSS}</style><div data-bazi-draft-preview><header class="nbdp-controls"><strong>ローカル組版検査・架空データ・正式発行不可</strong><label>検査対象<select id="case">${cases.map((item,index)=>`<option value="${index}">${item.layout} ${item.id}</option>`).join('')}</select></label><button id="run">全28ケースを検査</button><span role="status" id="status">準備中</span></header><div id="content"></div><details><summary>検査結果JSON</summary><pre id="proof"></pre></details></div><script>${planner}\n${runtime}\nconst cases=${data};
const root=document.querySelector('[data-bazi-draft-preview]'),content=document.querySelector('#content'),status=document.querySelector('#status'),select=document.querySelector('#case');
function inspect(item){
 content.innerHTML=item.html;const source=content.firstElementChild;
 const before={copy:Array.from(source.querySelectorAll('.nbdp-copy-segment > p'),e=>e.textContent),rows:Array.from(source.querySelectorAll('tbody tr'),e=>e.textContent),svg:source.querySelectorAll('svg').length};
 const result=paginateFourPillarsDraftA4(source,root);
 if(!result.ok)return{id:item.id,layout:item.layout,ok:false,reason:result.reason};
 content.replaceChildren(result.viewport);
 const after={copy:Array.from(content.querySelectorAll('.nbdp-copy-segment > p'),e=>e.textContent),rows:Array.from(content.querySelectorAll('tbody tr'),e=>e.textContent),svg:content.querySelectorAll('svg').length};
 const pages=Array.from(content.querySelectorAll('.nbdp-a4-page'),p=>({width:p.getBoundingClientRect().width,height:p.getBoundingClientRect().height,body:p.querySelector('.nbdp-a4-body').clientHeight,content:p.querySelector('.nbdp-a4-columns').getBoundingClientRect().height,columns:p.querySelector('.nbdp-a4-columns').dataset.a4Columns}));
 const preserved=JSON.stringify(before)===JSON.stringify(after),fits=pages.every(p=>p.width===794&&p.height===1123&&p.content<=p.body+.5);
 status.textContent=item.layout+' '+item.id+' '+pages.length+'ページ／'+(preserved&&fits?'PASS':'FAIL');
 return{id:item.id,layout:item.layout,ok:preserved&&fits,preserved,pages,measureResidue:root.querySelectorAll('.nbdp-a4-measure').length};
}
select.onchange=()=>inspect(cases[Number(select.value)]);
document.querySelector('#run').onclick=async()=>{await document.fonts.ready;const results=cases.map(inspect);document.querySelector('#proof').textContent=JSON.stringify({synthetic:true,accountAcceptance:false,results},null,2);status.textContent=results.filter(r=>r.ok).length+'/28 PASS（実Pro・PDF受入ではありません）';};
document.fonts.ready.then(()=>inspect(cases[0]));
</script></html>`;
mkdirSync('output/a4-lab',{recursive:true});writeFileSync('output/a4-lab/index.html',html);
console.log('Built output/a4-lab/index.html: 14 pages × 2 layouts, synthetic geometry only.');
