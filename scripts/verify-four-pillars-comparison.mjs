import assert from 'node:assert/strict';
import { compareFourPillars } from '../src/four-pillars-comparison.js';
import { buildFourPillarsPageData } from '../src/four-pillars-page-data.js';
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
const basePillars={year:'甲子',month:'甲子',day:'甲子',hour:null};
const input={subjectId:'fixture-a',partnerSubjectId:'fixture-b',subjectPillars:basePillars,partnerPillars:basePillars};
const validStem=stem=>stem+(stems.indexOf(stem)%2?'丑':'子');
const validBranch=branch=>(branches.indexOf(branch)%2?'乙':'甲')+branch;
// Literal adopted tables from the Notion comparison rules; normative cases,
// not independent natal-chart or relationship-interpretation acceptance.
for(const pair of ['甲己','乙庚','丙辛','丁壬','戊癸']){
 const result=compareFourPillars({...input,subjectPillars:{...basePillars,year:validStem(pair[0])},partnerPillars:{...basePillars,year:validStem(pair[1])}});
 const matches=result.data.matches.filter(row=>row.kind==='stem-combination');
 assert.equal(matches.length,1,pair);assert.equal(matches[0].pillar,'year');assert.equal(matches[0].subjectValue,pair[0]);assert.equal(matches[0].partnerValue,pair[1]);
}
for(const [kind,pairs] of [['branch-combination',['子丑','寅亥','卯戌','辰酉','巳申','午未']],['branch-clash',['子午','丑未','寅申','卯酉','辰戌','巳亥']]])for(const pair of pairs){
 const result=compareFourPillars({...input,subjectPillars:{...basePillars,month:validBranch(pair[0])},partnerPillars:{...basePillars,month:validBranch(pair[1])}});
 const matches=result.data.matches.filter(row=>row.kind===kind);assert.equal(matches.length,1,pair);assert.equal(matches[0].pillar,'month');
}
const cross=compareFourPillars({...input,subjectPillars:{year:'甲子',month:'乙丑',day:'甲子',hour:null},partnerPillars:{year:'丙寅',month:'己巳',day:'甲子',hour:null}});
assert.deepEqual(cross.data.matches,[],'Cross-column combinations are outside the adopted scope.');
assert.equal(cross.state,'available');assert.equal(cross.data.matchesState,'valid-zero');assert.equal(cross.data.dayStemRelation.elementRelation,'same-element');
assert.deepEqual(cross.data.includedPillars,['year','month','day']);
const partial=compareFourPillars({...input,subjectPillars:{...basePillars,hour:'甲子'}});
assert.equal(partial.data.hourComparisonState,'optional-missing');assert.equal(partial.data.includedPillars.length,3);
const known=compareFourPillars({...input,subjectPillars:{...basePillars,hour:'甲子'},partnerPillars:{...basePillars,hour:'己丑'}});
assert.equal(known.data.includedPillars.length,4);assert.ok(known.data.matches.every(row=>row.pillar==='hour'));
const relationTargets=[['甲子','same-element'],['丙寅','self-produces-other'],['戊辰','self-controls-other'],['庚午','other-controls-self'],['壬申','other-produces-self']];
const inverse={'same-element':'same-element','self-produces-other':'other-produces-self','self-controls-other':'other-controls-self','other-controls-self':'self-controls-other','other-produces-self':'self-produces-other'};
for(const [day,expected] of relationTargets){
 const forward=compareFourPillars({...input,partnerPillars:{...basePillars,day}}),reverse=compareFourPillars({...input,subjectId:input.partnerSubjectId,partnerSubjectId:input.subjectId,subjectPillars:{...basePillars,day},partnerPillars:basePillars});
 assert.equal(forward.data.dayStemRelation.elementRelation,expected);assert.equal(reverse.data.dayStemRelation.elementRelation,inverse[expected]);
}
assert.equal(compareFourPillars({...input,partnerPillars:{...basePillars,day:'乙丑'}}).data.dayStemRelation.polarityRelation,'different-polarity');
assert.equal(compareFourPillars({...input,partnerSubjectId:input.subjectId}).state,'required-missing');
assert.equal(compareFourPillars({...input,partnerPillars:null}).state,'required-missing');
assert.equal(compareFourPillars(null).state,'required-missing');
const swapped=compareFourPillars({...input,subjectId:input.partnerSubjectId,partnerSubjectId:input.subjectId,subjectPillars:{...basePillars,hour:'己丑'},partnerPillars:{...basePillars,hour:'甲子'}});
assert.deepEqual(swapped.data.matches.map(row=>[row.kind,row.pillar]),known.data.matches.map(row=>[row.kind,row.pillar]));
assert.ok(swapped.data.matches.every(row=>row.subjectId==='fixture-b'&&row.partnerSubjectId==='fixture-a'));
assert.equal(known.data.score,undefined);
assert.equal(compareFourPillars({...input,partnerPillars:{...basePillars,day:'甲丑'}}).state,'calculation-error');
assert.equal(compareFourPillars({...input,partnerPillars:{...basePillars,day:null}}).state,'required-missing');
const clock={date:'2000-01-07',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null};
const pageInput={methodKey:'four-pillars',subjectId:'fixture-a',partnerSubjectId:'fixture-b',birthClock:clock,partnerBirthClock:{...clock,date:'2000-01-08'},referenceDate:'2026-11-16'};
const find=(envelope,id)=>envelope.pages.find(row=>row.pageDefinitionId===id);
const result=buildFourPillarsPageData(pageInput);
assert.equal(find(result,'BAZ-08').state,'available');assert.equal(find(result,'BAZ-12').state,'required-missing');assert.equal(find(result,'BAZ-12').reason,'FAMILY_CONTEXT_REQUIRED');
const family=buildFourPillarsPageData({...pageInput,familyContext:'parent-child',parentDirection:'a-parent'});
assert.equal(find(family,'BAZ-12').data.family.subjectRole,'parent');assert.equal(find(family,'BAZ-12').data.family.partnerRole,'child');
const reversedFamily=buildFourPillarsPageData({...pageInput,familyContext:'parent-child',parentDirection:'b-parent'});
assert.equal(find(reversedFamily,'BAZ-12').data.family.subjectRole,'child');
assert.equal(find(buildFourPillarsPageData({...pageInput,familyContext:'parent-child'}),'BAZ-12').reason,'PARENT_DIRECTION_REQUIRED');
for(const context of ['partners','other-family'])assert.equal(find(buildFourPillarsPageData({...pageInput,familyContext:context}),'BAZ-12').state,'available');
const badPartner=buildFourPillarsPageData({...pageInput,partnerBirthClock:{...clock,date:'2026-02-04'}});
assert.equal(find(badPartner,'BAZ-01').state,'available');assert.equal(find(badPartner,'BAZ-08').state,'required-missing');assert.equal(find(badPartner,'BAZ-08').data,null);
assert.equal(find(buildFourPillarsPageData({...pageInput,partnerBirthClock:null}),'BAZ-08').state,'required-missing');
assert.equal(family.pages.filter(row=>row.data!==null).length,10);
assert.ok(family.pages.every(row=>row.publicationAllowed===false&&row.reviewState==='review-required'));
assert.ok(family.pages.filter(row=>['BAZ-06','BAZ-07','BAZ-13','BAZ-14'].includes(row.pageDefinitionId)).every(row=>row.state==='required-missing'));
assert.deepEqual(buildFourPillarsPageData(JSON.parse(JSON.stringify({...pageInput,familyContext:'parent-child',parentDirection:'a-parent'}))),family);
assert.deepEqual(basePillars,{year:'甲子',month:'甲子',day:'甲子',hour:null});
console.log('Four Pillars comparison: 17 adopted pairs, corresponding columns only, direction reversal, partial hour, zero matches, partner isolation and 10 guarded page adapters PASS; no formal publication.');
