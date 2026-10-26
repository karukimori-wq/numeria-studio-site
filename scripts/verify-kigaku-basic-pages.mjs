import assert from 'node:assert/strict';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuBasicPages} from '../src/kigaku-basic-pages.js';
const seen=new Set();
for(let year=1980;year<1989;year++)for(let month=1;month<=12;month++){
 const reading=createKigakuReading({referenceInstant:'2026-10-26T00:00:00Z',birthClock:{date:`${year}-${String(month).padStart(2,'0')}-15`,time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true},commentEnabled:false});
 const [identity,personality]=createKigakuBasicPages(reading);
 const main=reading.result.sourceResult.natal.mainStar.value,moon=reading.result.sourceResult.natal.monthStar.value;
 seen.add(`${main}/${moon}`);
 assert.equal(identity.slots.length,2);assert.equal(personality.slots.length,3);
 assert.deepEqual(identity.slots.map(s=>s.resultRefs[0].star),[main,moon]);
 for(const [index,slot] of personality.slots.entries()){
  assert.equal(slot.copies.length,main===moon?1:2);
  assert.deepEqual(slot.copies.map(c=>c.copyId),[...new Set([main,moon])].map(star=>`kig.star.${star}.${['basic','strength','caution'][index]}`));
  assert.deepEqual(slot.resultRefs.map(r=>r.role),['honmei','getsumei']);
 }
 for(const page of [identity,personality]){
  assert.equal(page.exportAllowed,false);assert.equal(page.practitionerComment,null);
  assert.equal(page.systemExplanationEnabled,true);
  for(const slot of page.slots)for(const copy of slot.copies){assert.equal(copy.releaseEnabled,false);assert.ok(copy.copyVersion);assert.ok(copy.sourceUrl);}
 }
 const altered=structuredClone(reading);altered.result.sourceResult.natal.monthStar.value=99;
 assert.throws(()=>createKigakuBasicPages(altered),/MISMATCH/);
}
assert.equal(seen.size,81);
for(const page of createKigakuBasicPages(createKigakuReading({referenceInstant:'2026-10-26T00:00:00Z'}))){assert.equal(page.reasonCode,'NATAL_STARS_REQUIRED');assert.deepEqual(page.slots,[]);}
console.log('Basic pages: all 81 natal pairs, role references, shared text deduplication, missing inputs and tamper rejection verified.');
