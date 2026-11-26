import assert from 'node:assert/strict';
import {createKigakuPeriodSeries} from '../src/kigaku-period-series.js';
import {kigakuSolarPeriod} from '../src/kigaku-solar-calendar.js';
for(let star=1;star<=9;star++) {
 const s=createKigakuPeriodSeries(2026,star);
 assert.deepEqual(s.months.rows.map(r=>r.solarMonthIndex),Array.from({length:12},(_,i)=>i));
 assert.deepEqual(s.years.rows.map(r=>r.kiYear),Array.from({length:9},(_,i)=>2026+i));
 assert.equal(new Set(s.years.rows.map(r=>r.honmeiPosition)).size,9);
 for(const kind of ['months','years'])for(const [i,r] of s[kind].rows.entries()) {
  assert.equal(r.board[r.honmeiPosition],star);
  if(i)assert.equal(s[kind].rows[i-1].endExclusive,r.startInclusive);
  for(const instant of [r.startInclusive,new Date(Date.parse(r.endExclusive)-1).toISOString()]) {
   const p=kigakuSolarPeriod(instant);assert.deepEqual(kind==='months'?p.month.board:p.year.board,r.board);
  }
 }
 assert.equal(s.months.rows[11].startInclusive.slice(0,7),'2027-01');
}
assert.equal(createKigakuPeriodSeries(2091,1).years.state,'ready');
assert.equal(createKigakuPeriodSeries(2092,1).years.state,'unavailable');
for(const y of [1900,2100])for(const v of Object.values(createKigakuPeriodSeries(y,1))){assert.equal(v.state,'unavailable');assert.deepEqual(v.rows,[]);}
assert.throws(()=>createKigakuPeriodSeries(2101,1),/INPUT_INVALID/);
assert.throws(()=>createKigakuPeriodSeries(2026,0),/INPUT_INVALID/);
console.log('Period series: 9 stars, 12 solar months and 9 years, boundary instants, contiguous intervals, next-year January and full-range refusal verified. Internal consistency only.');
