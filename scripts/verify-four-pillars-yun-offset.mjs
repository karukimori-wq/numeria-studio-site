import assert from 'node:assert/strict';
import {calculateYunOffset as calc} from '../src/four-pillars-yun-offset.js';
const birthInstant='2000-01-01T00:00:59Z';
const r=calc({birthInstant,solarTermInstant:'2000-01-01T00:01:01Z'});
assert.equal(r.differenceSeconds,2);assert.equal(r.totalMinutes,0);assert.equal(r.offset.hours,0,'Do not subtract independently rounded endpoints.');
const origin='2000-01-01T00:00:00Z';
for(const [seconds,expected] of [[59,{years:0,months:0,days:0,hours:0}],[60,{years:0,months:0,days:0,hours:2}],[61,{years:0,months:0,days:0,hours:2}],[720,{years:0,months:0,days:1,hours:0}],[21600,{years:0,months:1,days:0,hours:0}],[259200,{years:1,months:0,days:0,hours:0}]]){
 const term=new Date(Date.parse(origin)+seconds*1000).toISOString();const got=calc({birthInstant:origin,solarTermInstant:term});assert.deepEqual(got.offset,expected);assert.equal(got.publicationAllowed,false);
 const reversed=calc({birthInstant:term,solarTermInstant:origin});assert.deepEqual(reversed.offset,expected);
}
assert.equal(calc({birthInstant:origin,solarTermInstant:origin}).termSide,'same');
assert.equal(calc({birthInstant:'2000-02-30T00:00:00Z',solarTermInstant:origin}).state,'calculation-error');
assert.equal(calc({birthInstant:'2000-01-01T00:00:00',solarTermInstant:origin}).state,'calculation-error');
assert.equal(calc({birthInstant:'2000-01-01T00:00:00.500Z',solarTermInstant:origin}).state,'calculation-error');
console.log('Decision 86 manual conversion fixtures PASS: total-seconds subtraction, minute floor, units, reverse order, zero and invalid dates; no start-date/DaYun acceptance.');
