import assert from 'node:assert/strict';
import {calculateFourPillars as calc} from '../src/four-pillars-calculator.js';
// Notion fixed decision 84: adopted library behavior, not independent natal-chart proof.
const base={date:'2000-01-07',referenceDate:'2026-11-11',standardClockConfirmed:true};
for(const [date,time,day,hour] of [['2000-01-07','22:59','甲子','乙亥'],['2000-01-07','23:00','甲子','丙子'],['2000-01-07','23:59','甲子','丙子'],['2000-01-08','00:00','乙丑','丙子']]){
 const r=calc({...base,date,time});assert.equal(r.pillars?.day,day);assert.equal(r.pillars.hour,hour);assert.equal(r.elements.data.total,8);assert.equal(r.publicationAllowed,false);
}
assert.equal(calc({...base,time:null}).pillars,null);
assert.equal(calc({...base,time:'12:00',date:'2000-02-30'}).state,'calculation-error');
assert.equal(calc({...base,time:'12:00',standardClockConfirmed:false}).state,'required-missing');
console.log('Four Pillars: four adopted 23-hour fixtures PASS; missing time remains unresolved, no noon substitution or formal publication.');
