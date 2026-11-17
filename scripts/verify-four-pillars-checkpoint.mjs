import assert from 'node:assert/strict';
import { withFourPillarsCalculationCheckpoint as attach, validateFourPillarsCalculationCheckpoint as validate } from '../src/four-pillars-calculation-checkpoint.js';
const clock={date:'2000-01-07',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null};
const fourPillarsInput={methodKey:'four-pillars',subjectId:'fixture-a',partnerSubjectId:'fixture-b',birthClock:clock,partnerBirthClock:{...clock,date:'2000-01-08'},referenceDate:'2026-11-16',familyContext:'parent-child',parentDirection:'a-parent',revision:'r1'};
const old={id:'fixture-reading',divination:'four-pillars',drafts:{retained:'利用者の本文を保持'},unknownFutureField:{retain:true}};
assert.equal(attach(old),old);
const original={...old,fourPillarsInput};const result=attach(original);
assert.equal(original.fourPillarsCalculation,undefined);assert.deepEqual(result.drafts,old.drafts);assert.deepEqual(result.unknownFutureField,old.unknownFutureField);
assert.equal(result.fourPillarsCalculation.calculation.pages.filter(page=>page.data).length,10);
assert.equal(validate(JSON.parse(JSON.stringify(result))).ok,true);
assert.deepEqual(attach(result),result);
for(const status of ['confirmed','completed']){
 const forged=attach({...original,status,fourPillarsCalculation:{publicationAllowed:true}});
 assert.equal(forged.status,'draft');assert.deepEqual(forged.fourPillarsCalculation,result.fourPillarsCalculation);
 const missing=attach({...old,status,fourPillarsCalculation:{publicationAllowed:true}});assert.equal(missing.status,'draft');assert.equal(missing.fourPillarsCalculation,undefined);
}
for(const change of [source=>{source.birthClock.date='2000-01-08';},source=>{source.partnerBirthClock.date='2000-01-09';},source=>{source.parentDirection='b-parent';},source=>{source.subjectId='other-subject';}]){
 const changed=structuredClone(result);change(changed.fourPillarsInput);assert.equal(validate(changed).code,'CHECKPOINT_SCOPE_OR_VALUES_MISMATCH');assert.deepEqual(attach(changed).drafts,old.drafts);
}
const tampered=structuredClone(result);tampered.fourPillarsCalculation.calculation.pages[7].data.matches.push({kind:'fabricated'});assert.equal(validate(tampered).ok,false);
const permitted=structuredClone(result);permitted.fourPillarsCalculation.publicationAllowed=true;assert.equal(validate(permitted).ok,false);
const lostPartner=attach({...original,fourPillarsInput:{...fourPillarsInput,partnerBirthClock:null}});
assert.equal(lostPartner.fourPillarsCalculation.calculation.pages[0].state,'available');assert.equal(lostPartner.fourPillarsCalculation.calculation.pages[7].state,'required-missing');assert.equal(lostPartner.fourPillarsCalculation.calculation.pages[7].data,null);
const foreign={...original,divination:'tarot'};assert.equal(attach(foreign),foreign);assert.equal(validate(foreign).code,'METHOD_MISMATCH');
console.log('Four Pillars checkpoint: clock/pair/family/identity tampering, stale approvals, forged status, JSON restore and unknown-field/body retention PASS; draft only.');

const timedInput={...fourPillarsInput,birthClock:{...clock,time:'12:00:00'},calculationSex:'male'};
const timed=attach({...original,fourPillarsInput:timedInput});
assert.equal(timed.fourPillarsCalculation.calculation.yun.state,'available');
const sexChanged=structuredClone(timed);sexChanged.fourPillarsInput.calculationSex='female';assert.equal(validate(sexChanged).ok,false);
const recalculated=attach(sexChanged);assert.notEqual(recalculated.fourPillarsCalculation.calculation.yun.direction,timed.fourPillarsCalculation.calculation.yun.direction);
assert.deepEqual(recalculated.drafts,old.drafts);
const forgedYun=structuredClone(timed);forgedYun.fourPillarsCalculation.calculation.yun.offset.totalMinutes=0;assert.equal(validate(forgedYun).ok,false);
const noSex=attach({...original,fourPillarsInput:{...timedInput,calculationSex:null,gender:'male'}});
assert.equal(noSex.fourPillarsCalculation.calculation.yun.reason,'CALCULATION_SEX_REQUIRED');
assert.equal(noSex.fourPillarsCalculation.calculation.pages.filter(page=>page.data).length,10);
console.log('Yun checkpoint: explicit calculation sex, stale direction/offset rejection, no profile inference and independent subject pages PASS.');

assert.equal(timed.fourPillarsCalculation.calculation.yun.start.state,'available');
const forgedStart=structuredClone(timed);forgedStart.fourPillarsCalculation.calculation.yun.start.startInstant='2000-01-01T00:00:00.000Z';assert.equal(validate(forgedStart).ok,false);
assert.equal(validate(JSON.parse(JSON.stringify(timed))).ok,true);

const periodInput={...fourPillarsInput,birthClock:{...clock,date:'1948-09-12',time:'00:30:45',offsetChoiceMinutes:600},calculationSex:'female'};
const period=attach({...original,fourPillarsInput:periodInput});
assert.equal(period.fourPillarsCalculation.calculation.pages.filter(page=>page.data).length,14);
const altered=structuredClone(period);altered.fourPillarsCalculation.calculation.pages[5].data.intervals[0].ganzhi='甲子';assert.equal(validate(altered).ok,false);
assert.equal(validate(JSON.parse(JSON.stringify(period))).ok,true);
