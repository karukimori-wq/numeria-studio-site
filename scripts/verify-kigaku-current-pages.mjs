import assert from 'node:assert/strict';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuCurrentPages} from '../src/kigaku-current-pages.js';
import {kigakuSolarTerms} from '../src/kigaku-solar-calendar.js';
const make=(referenceInstant='2026-10-26T00:00:00Z',date='1990-06-15')=>createKigakuReading({referenceInstant,birthClock:{date,time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true},practitionerComment:'本人向けコメント',commentEnabled:true});
const seen=[new Set(),new Set()];
for(let year=1980;year<1989;year++){
 const reading=make(undefined,`${year}-06-15`),pages=createKigakuCurrentPages(reading);
 assert.deepEqual(pages.map(p=>p.pageId),['KIG-03','KIG-04']);
 for(const [i,page] of pages.entries()){
  const kind=i===0?'year':'month',ref=page.rows[0];seen[i].add(ref.palace);
  assert.equal(page.state,'draft_preview');assert.equal(page.slots.length,2);
  assert.equal(page.board[ref.palace],reading.result.sourceResult.natal.mainStar.value);
  assert.deepEqual(page.board,reading.result.sourceResult[kind].board);
  assert.deepEqual(page.slots.map(s=>s.copies[0].copyId),[`kig.${kind}.reading`,`kig.palace.${ref.palace}.${kind}`]);
  assert.ok(Date.parse(ref.startInclusive)<=Date.parse(reading.input.referenceInstant));
  assert.ok(Date.parse(reading.input.referenceInstant)<Date.parse(ref.endExclusive));
  assert.ok(ref.calculationVersion);assert.equal(ref.subject,'self');assert.equal(ref.kiYear,2026);
  assert.equal(page.practitionerComment,'本人向けコメント');assert.equal(page.exportAllowed,false);assert.equal(page.releaseEnabled,false);
  for(const slot of page.slots)for(const copy of slot.copies){assert.equal(copy.reviewStatus,'draft');assert.equal(copy.releaseEnabled,false);assert.ok(copy.copyVersion);}
 }
 assert.deepEqual(createKigakuCurrentPages(JSON.parse(JSON.stringify(reading))),pages);
}
assert.deepEqual(seen.map(s=>s.size),[9,9]);
for(const index of [0,1,8,11]){
 const instant=kigakuSolarTerms(2026).find(t=>t.solarMonthIndex===index).instant;
 const before=createKigakuCurrentPages(make(new Date(Date.parse(instant)-1).toISOString()));
 const after=createKigakuCurrentPages(make(instant));
 assert.equal(before[1].rows[0].endExclusive,instant);
 assert.equal(after[1].rows[0].startInclusive,instant);
 assert.notDeepEqual(before[1].board,after[1].board);
 if(index===0){assert.equal(before[0].rows[0].kiYear,2025);assert.equal(after[0].rows[0].kiYear,2026);assert.equal(before[0].rows[0].endExclusive,instant);assert.equal(after[0].rows[0].startInclusive,instant);}
}
const jan=createKigakuCurrentPages(make('2027-01-15T00:00:00Z'));
assert.equal(jan[0].rows[0].kiYear,2026);assert.equal(jan[1].rows[0].solarMonthIndex,11);
const boundaryDate=kigakuSolarTerms(1990).find(t=>t.solarMonthIndex===4).jstDate;
const uncertain=make(undefined,boundaryDate);assert.equal(uncertain.result.sourceResult.natal.monthStar.state,'missing_input');
assert.ok(createKigakuCurrentPages(uncertain).every(p=>p.state==='draft_preview'));
for(const p of createKigakuCurrentPages(createKigakuReading({referenceInstant:'2026-10-26T00:00:00Z'}))){assert.equal(p.reasonCode,'MAIN_STAR_REQUIRED');assert.equal(p.board,null);assert.deepEqual(p.slots,[]);}
const altered=make();altered.result.sourceResult.year.board.C=99;assert.throws(()=>createKigakuCurrentPages(altered),/MISMATCH/);
assert.ok(createKigakuCurrentPages(make('2100-12-31T00:00:00Z')).every(p=>p.reasonCode==='FULL_PERIOD_OUT_OF_RANGE'));
console.log('Current pages: all nine palaces, registered copy selection, annual/monthly boundaries, January solar year, unknown month star, missing/tampered input and range checks verified.');
