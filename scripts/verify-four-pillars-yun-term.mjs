import assert from 'node:assert/strict';
import {selectYunSolarTerm as select} from '../src/four-pillars-yun-term.js';
// Synthetic interval: selection/unit-rule testing, not astronomical reference evidence.
const base={birthInstant:'2000-01-15T00:00:00Z',calendarVersion:'synthetic-test-only',terms:[{name:'小寒',instant:'2000-01-05T00:00:00Z'},{name:'立春',instant:'2000-02-05T00:00:00Z'}]};
for(const [yearStem,calculationSex,direction] of [['甲','male','forward'],['甲','female','backward'],['乙','male','backward'],['乙','female','forward']]){
 const r=select({...base,yearStem,calculationSex});assert.equal(r.direction,direction);assert.equal(r.selectedTerm.name,direction==='forward'?'立春':'小寒');assert.equal(r.offset.differenceSeconds,(direction==='forward'?21:10)*86400);assert.equal(r.publicationAllowed,false);
}
const own={...base,yearStem:'甲',calculationSex:'male'};
assert.equal(select({...own,birthInstant:base.terms[0].instant}).state,'review-required');
assert.equal(select({...own,calculationSex:null}).state,'required-missing');
assert.equal(select({...own,terms:[base.terms[0]]}).state,'required-missing');
assert.equal(select({...own,terms:[{name:'春分',instant:base.terms[0].instant}]}).state,'calculation-error');
assert.equal(select({...own,terms:[...base.terms,base.terms[0]]}).state,'calculation-error');
assert.equal(select({...own,birthInstant:'2000-02-30T00:00:00Z'}).state,'calculation-error');
console.log('Yun direction 4 cases, previous/next Jie selection, missing calendar/sex, exact equality refusal and second-offset bridge PASS; synthetic fixtures only.');
