import assert from 'node:assert/strict';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuDirectionPage} from '../src/kigaku-direction-page.js';
const make=(year=1990,month=10)=>createKigakuReading({referenceInstant:`2026-${String(month).padStart(2,'0')}-15T00:00:00Z`,birthClock:{date:`${year}-06-15`,time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true},commentEnabled:false});
const reasons=new Set();let empty=0,present=0,overlap=0,notGood=0;
for(let year=1980;year<1989;year++)for(let month=1;month<=12;month++){
 const reading=make(year,month),page=createKigakuDirectionPage(reading,'pro');
 assert.equal(page.pageId,'KIG-06');assert.equal(page.slots.length,2);assert.equal(page.directionRows.length,16);
 assert.deepEqual(page.commonGood,reading.result.analysis.common.directions);
 assert.equal(page.slots[1].copies[1].copyId,`kig.direction.common-${page.commonGood.length?'present':'empty'}`);
 page.commonGood.length?present++:empty++;
 for(const row of page.directionRows){
  const raw=reading.result.analysis[row.period].find(r=>r.direction===row.direction),ref=row.resultRefs[0];
  for(const key of Object.keys(raw))assert.deepEqual(row[key],raw[key]);
  assert.ok(ref.path.startsWith(`result.analysis.${row.period}.`));assert.ok(ref.startInclusive);assert.ok(ref.endExclusive);assert.ok(ref.directionCalculationVersion);
  assert.equal(ref.referenceInstant,reading.input.referenceInstant);assert.equal(ref.mainStar,reading.result.sourceResult.natal.mainStar.value);
  assert.deepEqual(ref.candidateExclusions,raw.candidateExclusions);assert.deepEqual(ref.dangerReasons,raw.dangerReasons);
  if(row.goodCandidate&&row.dangerReasons.length){overlap++;assert.equal(row.judgement,'bad');}
  if(row.judgement==='not_good'){notGood++;assert.equal(row.dangerReasons.length,0);assert.ok(row.copies.some(c=>c.copyId==='kig.direction.not-eligible'));}
  for(const reason of row.dangerReasons)reasons.add(reason.code);
  for(const copy of row.copies){assert.ok(copy.sourceUrl);assert.ok(copy.copyVersion);assert.equal(copy.reviewStatus,'draft');assert.equal(copy.releaseEnabled,false);}
 }
 assert.equal(page.exportAllowed,false);assert.equal(page.practitionerComment,null);assert.equal(page.systemExplanationEnabled,true);
}
assert.equal(reasons.size,6);assert.ok(empty&&present&&overlap&&notGood);
const source=make(),original=structuredClone(source);
assert.deepEqual(createKigakuDirectionPage(source,'business'),createKigakuDirectionPage(source,'pro'));
assert.deepEqual(source,original);
for(const plan of ['free','invalid',null]){const page=createKigakuDirectionPage(source,plan);assert.equal(page.reasonCode,'PRO_REQUIRED');assert.deepEqual(page.directionRows,[]);assert.deepEqual(page.slots,[]);}
const missing=createKigakuReading({referenceInstant:source.input.referenceInstant});assert.equal(createKigakuDirectionPage(missing,'pro').reasonCode,'MAIN_STAR_REQUIRED');
const bad=structuredClone(source);bad.result.analysis.year[0].dangerReasons=[];bad.result.analysis.year[0].judgement='fake';assert.throws(()=>createKigakuDirectionPage(bad,'pro'),/MISMATCH/);
assert.deepEqual(createKigakuDirectionPage(JSON.parse(JSON.stringify(source)),'pro'),createKigakuDirectionPage(source,'pro'));
console.log('Direction page: 108 snapshots, all 16 annual/monthly rows, six danger reasons, overlapping candidates, non-good distinction, common empty/present, plan gates and tamper checks verified.');
