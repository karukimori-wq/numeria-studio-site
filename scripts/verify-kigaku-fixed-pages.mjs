import assert from 'node:assert/strict';
import {createKigakuReading,validateKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuFixedPages} from '../src/kigaku-fixed-pages.js';
import {kigakuPersonRelation} from '../src/kigaku-remaining-pages.js';
import {kigakuSolarTerms} from '../src/kigaku-solar-calendar.js';
const birth=date=>({date,time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true});
const base={referenceInstant:'2026-10-28T00:00:00Z',birthClock:birth('1990-06-15'),partnerBirthClock:birth('1993-08-15'),partnerName:'相手',loveRelationship:'交際相手',workRelationship:'同僚',familyRelationship:'子',workTheme:'job-change',selectedDirection:'NE',directionPurpose:'travel'};
const full=createKigakuReading(base),pages=createKigakuFixedPages(full,'pro');
assert.deepEqual(pages.map(p=>p.pageId),Array.from({length:14},(_,i)=>`KIG-${String(i+1).padStart(2,'0')}`));
assert.ok(pages.every(p=>p.state==='draft_preview'));
assert.deepEqual(pages.map(p=>p.slots.length),[2,3,2,2,1,2,2,3,3,2,2,1,2,9]);
assert.equal(pages.reduce((n,p)=>n+p.slots.length,0),36);
for(const page of pages){assert.equal(page.systemExplanationEnabled,true);assert.equal(page.exportAllowed,false);assert.equal(page.releaseEnabled,false);for(const slot of page.slots){assert.ok(slot.resultRefs.length);for(const copy of slot.copies){assert.equal(copy.reviewStatus,'draft');assert.ok(copy.copyVersion);assert.ok(copy.sourceUrl);}}}
assert.deepEqual(createKigakuFixedPages(JSON.parse(JSON.stringify(full)),'business'),pages);
assert.deepEqual(validateKigakuReading(JSON.parse(JSON.stringify(full))),full);
const legacy=createKigakuReading({referenceInstant:base.referenceInstant,birthClock:base.birthClock});assert.ok(!Object.hasOwn(legacy,'partnerResult'));assert.ok(!Object.hasOwn(legacy.input,'partnerBirthClock'));assert.deepEqual(validateKigakuReading(legacy),legacy);
const inverse={biwa:'biwa',gasei:'seiga',seiga:'gasei',gakoku:'kokuga',kokuga:'gakoku'};
const dates=new Map();for(let year=1980;year<1989;year++){const reading=createKigakuReading({...base,birthClock:birth(`${year}-06-15`)});dates.set(reading.result.sourceResult.natal.mainStar.value,`${year}-06-15`);}
const seen=new Set();
for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
 const relation=kigakuPersonRelation(a,b);seen.add(relation);assert.equal(kigakuPersonRelation(b,a),inverse[relation]);
 const reading=createKigakuReading({...base,birthClock:birth(dates.get(a)),partnerBirthClock:birth(dates.get(b))});
 const pairPages=createKigakuFixedPages(reading,'pro');
 for(const [index,kind] of [[7,'basic'],[8,'love'],[9,'work'],[12,'family']]){const page=pairPages[index];assert.equal(page.relationship.self,a);assert.equal(page.relationship.partner,b);assert.equal(page.relationship.relation,relation);assert.ok(page.slots.flatMap(s=>s.copies).some(c=>c.copyId===`kig.relation.${relation}.${kind}`));}
 assert.deepEqual(pairPages[7].slots[0].resultRefs.map(r=>r.subject),['self']);assert.deepEqual(pairPages[7].slots[1].resultRefs.map(r=>r.subject),['partner']);
}
assert.equal(seen.size,5);assert.equal(kigakuPersonRelation(1,3),'gasei');assert.equal(kigakuPersonRelation(1,2),'kokuga');assert.equal(kigakuPersonRelation(2,8),'biwa');
for(const direction of ['N','NE','E','SE','S','SW','W','NW'])for(const purpose of ['travel','move']){
 const reading=createKigakuReading({...base,selectedDirection:direction,directionPurpose:purpose}),all=createKigakuFixedPages(reading,'pro'),page=all[11];
 assert.equal(page.slots.length,1);assert.equal(page.selectedRows.length,2);assert.ok(page.selectedRows.every(r=>r.direction===direction));
 assert.ok(page.slots[0].copies.some(c=>c.copyId===`kig.direction.purpose-${purpose}`));
 assert.equal(page.commonGood.includes(direction),reading.result.analysis.common.directions.includes(direction));
 assert.deepEqual(page.slots[0].resultRefs.map(r=>r.period),['year','month']);
 if(!page.commonGood.length&&reading.result.analysis.common.directions.length)assert.ok(!page.slots[0].copies.some(c=>c.copyId==='kig.direction.common-empty'));
}
for(const workTheme of ['job-change','independence']){const page=createKigakuFixedPages(createKigakuReading({...base,workTheme}),'pro')[10];assert.deepEqual(page.slots.map(s=>s.copies[0].copyId),page.periodComparison.map((r,i)=>`kig.palace.${r.palace}.work-${i===0?'year':'month'}`));}
for(const [patch,index,reason] of [[{partnerBirthClock:null},7,'PARTNER_MAIN_STAR_REQUIRED'],[{loveRelationship:''},8,'RELATIONSHIP_CONTEXT_REQUIRED'],[{workRelationship:''},9,'RELATIONSHIP_CONTEXT_REQUIRED'],[{familyRelationship:''},12,'RELATIONSHIP_CONTEXT_REQUIRED'],[{workTheme:''},10,'WORK_THEME_REQUIRED'],[{selectedDirection:null},11,'MANUAL_DIRECTION_REQUIRED'],[{directionPurpose:''},11,'DIRECTION_PURPOSE_REQUIRED']])assert.equal(createKigakuFixedPages(createKigakuReading({...base,...patch}),'pro')[index].reasonCode,reason);
const unknownMonthDate=kigakuSolarTerms(1993).find(t=>t.solarMonthIndex===5).jstDate;
const uncertain=createKigakuFixedPages(createKigakuReading({...base,partnerBirthClock:birth(unknownMonthDate)}),'pro')[7];assert.equal(uncertain.state,'draft_preview');assert.equal(uncertain.supplements.length,0);
assert.equal(pages[7].supplements.length,1);
const changedPartner=createKigakuReading({...base,partnerBirthClock:birth('1993-09-15')});
const changedPages=createKigakuFixedPages(changedPartner,'pro');
assert.equal(changedPages[7].relationship.relation,pages[7].relationship.relation);
assert.notDeepEqual(changedPages[7].supplements,pages[7].supplements);
assert.deepEqual(changedPartner.result.analysis,full.result.analysis);
const unconfirmed=createKigakuReading({...base,partnerBirthClock:{...base.partnerBirthClock,zoneConfirmed:false}});
assert.equal(createKigakuFixedPages(unconfirmed,'pro')[7].reasonCode,'PARTNER_MAIN_STAR_REQUIRED');

for(const plan of ['free','unknown'])assert.ok(createKigakuFixedPages(full,plan).slice(4).every(p=>p.reasonCode==='PRO_REQUIRED'));
const bad=structuredClone(full);bad.partnerResult.natal.mainStar.value=99;assert.throws(()=>createKigakuFixedPages(bad,'pro'),/MISMATCH/);
for(const patch of [{workTheme:'future-date'},{directionPurpose:'auto'},{partnerName:12},{partnerBirthClock:[]}])assert.throws(()=>createKigakuReading({...base,...patch}));
// Render all fourteen page responses through the actual React component.
const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {createKigakuReadingComponent}=await import('../src/kigaku-reading-ui.js');
const {createKigakuReadingClient}=await import('../src/kigaku-reading-client.js');globalThis.createKigakuReadingClient=createKigakuReadingClient;
const state={input:full.input,reading:full,periodPages:pages,save:'saved',calculation:'ready',periodPreviewState:'ready',error:''};
const TestReact={...React,useState:()=>[state,()=>{}]};
const markup=renderToStaticMarkup(React.createElement(createKigakuReadingComponent(TestReact)));
assert.equal((markup.match(/<article/g)||[]).length,14);assert.doesNotMatch(markup,/undefined|NaN/);assert.match(markup,/本人から見た関係/);assert.match(markup,/月命星の補足比較/);
console.log('All 14 fixed pages: 36 slots, 81 ordered star pairs and inverse relations, optional month comparison, eight directions × two purposes, required contexts, legacy snapshot compatibility, tamper rejection and actual React rendering verified.');
