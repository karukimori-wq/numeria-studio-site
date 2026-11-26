import assert from 'node:assert/strict';
import {fourPillarsYunFromBirthClock as run} from '../src/four-pillars-yun-calendar.js';
const base={birthClock:{date:'2026-02-04',time:'04:30:00',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null},referenceDate:'2026-11-17',calculationSex:'female'};
const result=run(base);
assert.equal(result.state,'available');
assert.equal(result.direction,'forward'); // Before Lichun: yin year, female.
assert.equal(result.selectedTerm.name,'立春');
assert.equal(result.selectedTerm.instant,'2026-02-03T20:02:08.000Z');
assert.equal(result.offset.state,'available');assert.equal(result.start.state,'available');assert.equal(result.start.standardOffsetMinutes,540);assert.equal(result.start.birthInstant,result.offset.birthInstant);assert.deepEqual(result.start.offset,result.offset.offset);
assert.equal(result.publicationAllowed,false);
const after=run({...base,birthClock:{...base.birthClock,time:'05:30:00'}});
assert.equal(after.direction,'backward'); // After Lichun: yang year, female.
assert.equal(after.selectedTerm.name,'立春');
assert.equal(run({...base,calculationSex:undefined}).reason,'CALCULATION_SEX_REQUIRED');
assert.equal(run({...base,birthClock:{...base.birthClock,date:'2000-01-07',time:null}}).state,'required-missing');
assert.equal(run({...base,birthClock:{...base.birthClock,zoneConfirmed:false}}).state,'required-missing');
assert.equal(run({...base,birthClock:{...base.birthClock,time:'05:02:08'}}).state,'review-required');
assert.equal(run({...base,birthClock:{...base.birthClock,date:'1948-05-02',time:'00:30:00'}}).state,'calculation-error');
assert.deepEqual(run(JSON.parse(JSON.stringify(base))),result);
console.log('Birth clock -> actual Jie calendar -> Yun selection: before/after Lichun, missing sex/time/zone, exact term, DST gap and JSON roundtrip PASS. Full Yun independently unverified.');
