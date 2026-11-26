import assert from 'node:assert/strict';
import {FOUR_PILLARS_COPY_RECORDS as records,FOUR_PILLARS_COPY_VERSION as version} from '../src/four-pillars-copy-data.js';
import {selectFourPillarsPageCopy as select} from '../src/four-pillars-page-copy.js';
import {withFourPillarsCalculationCheckpoint as attach} from '../src/four-pillars-calculation-checkpoint.js';
import {buildFourPillarsDraftPreview as build,renderFourPillarsDraftPage as render} from '../src/four-pillars-draft-preview.js';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';
assert.equal(records.length,128);assert.equal(new Set(records.map(r=>r.copyId)).size,128);
for(const r of records){assert.equal(r.language,'ja');assert.equal(r.copyVersion,version);assert.equal(r.reviewStatus,'draft');assert.equal(r.releaseEnabled,false);assert(r.body);assert.equal(r.short,r.body.slice(0,r.body.indexOf('。')+1));assert.equal(r.source.originalCopyVersion,version);}
const clock={date:'1948-09-12',time:'00:30:45',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:600};
const snapshot=attach({id:'copy-synthetic',divination:'four-pillars',fourPillarsInput:{methodKey:'four-pillars',subjectId:'copy-a',partnerSubjectId:'copy-b',birthClock:clock,partnerBirthClock:{...clock,offsetChoiceMinutes:540},referenceDate:'2026-11-19',calculationSex:'female',familyContext:'parent-child',parentDirection:'a-parent'}});
const pages=snapshot.fourPillarsCalculation.calculation.pages;
const scope={sessionId:snapshot.id,subjectId:'copy-a',partnerSubjectId:'copy-b',includedPillars:['year','month','day','hour']};
const byId=id=>pages.find(p=>p.pageDefinitionId===id);
const segments=copy=>copy.frames.flatMap(f=>f.segments);
const ids=copy=>segments(copy).map(s=>s.copyId);
const expected=[4,2,2,3,2,2,2,3,3,3,2,2,2,2];
for(const [index,page] of pages.entries()){
 const copy=select(page,scope);assert.equal(copy.state,'draft-preview',page.pageDefinitionId);assert.equal(copy.frames.length,expected[index]);assert.equal(copy.publicationAllowed,false);assert.equal(copy.scope.sessionId,snapshot.id);
 for(const s of segments(copy)){const r=records.find(r=>r.copyId===s.copyId);assert.equal(s.text,r[s.field]);assert.equal(s.releaseEnabled,false);assert.equal(s.copyVersion,version);assert(s.bindings.every(b=>[scope.subjectId,scope.partnerSubjectId].includes(b.subjectId)));}
 for(const s of segments(copy)){
  const missing=select(page,scope,records.filter(r=>r.copyId!==s.copyId));assert.equal(missing.state,'source-missing');assert.equal(missing.frames.length,0);
 }
}
// Ten-god excerpts are deduplicated by star, with every distinct placement retained.
const chartCopy=select(byId('BAZ-04'),scope);
const placements=byId('BAZ-04').data.placements;
assert.equal(chartCopy.frames[0].segments.length,new Set(placements.map(p=>p.tenGod)).size);
assert.equal(chartCopy.frames[0].segments.reduce((n,s)=>n+s.bindings.length,0),placements.length);
assert(!segments(chartCopy).some(s=>s.bindings.some(b=>b.label.includes('日柱・天干'))));
const detailed=select(byId('BAZ-10'),scope);assert(detailed.frames[0].segments.every(s=>s.field==='body'));assert(chartCopy.frames[0].segments.every(s=>s.field==='short'));
assert(ids(select(byId('BAZ-07'),scope)).includes('baz.ten-god.inju.period'));
const zero=structuredClone(byId('BAZ-11'));zero.state='valid-zero';zero.data.wealthPlacements=[];assert(ids(select(zero,scope)).includes('baz.wealth.none'));
for(const includedPillars of [undefined,[],['year'],['year','month','day','day']]){assert.equal(select(zero,{...scope,includedPillars}).state,'source-missing');assert(!ids(select(zero,{...scope,includedPillars})).includes('baz.wealth.none'));}
delete zero.data.wealthPlacements;assert.equal(select(zero,scope).state,'source-missing');assert(!ids(select(zero,scope)).includes('baz.wealth.none'));
const pair=byId('BAZ-08');assert(ids(select(pair,scope)).includes('baz.comparison.no-combination-clash'));
assert.equal(select(pair,{...scope,partnerSubjectId:'wrong'}).state,'source-missing');
const noMatches=structuredClone(pair);delete noMatches.data.matches;assert(!ids(select(noMatches,scope)).includes('baz.comparison.no-combination-clash'));
const unknown=attach({...snapshot,fourPillarsInput:{...snapshot.fourPillarsInput,birthClock:{...clock,date:'2000-01-07',time:null,offsetChoiceMinutes:null}}});
const unknownChart=unknown.fourPillarsCalculation.calculation.pages[0];assert.equal(select(unknownChart,scope).frames.length,3);assert(ids(select(unknownChart,scope)).includes('baz.hour.unknown'));
assert.equal(select(unknown.fourPillarsCalculation.calculation.pages[5],scope).frames.length,0);
for(const bad of [[],[...records,records.find(r=>r.copyId==='baz.pillar.year')],records.map(r=>({...r,releaseEnabled:true})),records.map(r=>({...r,reviewStatus:'approved'})),records.map(r=>({...r,copyVersion:'changed'}))])assert.equal(select(pages[0],scope,bad).state,'source-missing');
const free=build(snapshot,reportPageDefinitionsFor('four-pillars','free'),'magazine');assert.equal(free.pages.length,5);assert(render(free,'BAZ-04').includes('登録原文の草案・未承認'));assert(!render(free,'BAZ-14').includes('baz.dayun.transition'));
const before=JSON.stringify(snapshot);for(const page of pages)select(page,scope);assert.equal(JSON.stringify(snapshot),before);
// Value-domain coverage is selector verification, not independent natal-chart acceptance.
for(const record of records.filter(r=>r.copyId.startsWith('baz.day-stem.')&&!r.copyId.endsWith('.reading'))){
 const id=record.copyId.split('.')[2],index=['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'].indexOf(id),dayStem=[...'甲乙丙丁戊己庚辛壬癸'][index];
 const page=structuredClone(byId(record.copyId.endsWith('.love')?'BAZ-09':'BAZ-02'));page.data.dayStem=dayStem;assert(ids(select(page,scope)).includes(record.copyId));
}
for(const [index,id] of ['zi','chou','yin','mao','chen','si','wu','wei','shen','you','xu','hai'].entries()){
 const page=structuredClone(byId('BAZ-09'));page.data.dayBranch=[...'子丑寅卯辰巳午未申酉戌亥'][index];assert(ids(select(page,scope)).includes(`baz.day-branch.${id}.partnership`));
}
for(const [index,stage] of ['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'].entries()){
 const page=structuredClone(byId('BAZ-05'));page.data.rows[0].twelveStage=stage;assert(ids(select(page,scope)).includes(`baz.stage.${['chosei','mokuyoku','kantai','kenroku','teiou','sui','byo','shi','bo','zetsu','tai','yo'][index]}`));
}
for(const [index,god] of ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'].entries()){
 const id=['hiken','gozai','shokushin','shokan','henzai','seizai','henkan','seikan','henin','inju'][index];
 const page=structuredClone(byId('BAZ-04'));page.data.placements=[{pillar:'year',position:'天干',stem:'甲',tenGod:god}];
 for(const context of ['basic','work','relationship'])assert(ids(select(page,scope)).includes(`baz.ten-god.${id}.${context}`));
 const period=structuredClone(byId('BAZ-07'));period.data.currentDayun.stemTenGod=god;assert(ids(select(period,scope)).includes(`baz.ten-god.${id}.period`));
}
console.log('Four Pillars copy: 128 pinned draft records, 14 frame selections, exact text/short/provenance, missing/ambiguous/version/approval refusal, placement deduplication, period roles, unknown time, valid-zero and Free filtering PASS. No source approval or formal publication.');
