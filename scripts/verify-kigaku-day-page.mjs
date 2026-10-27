import assert from 'node:assert/strict';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuDayPage} from '../src/kigaku-day-page.js';
const make=(referenceInstant='2026-10-28T00:00:00Z',date='1990-06-15',commentEnabled=false)=>createKigakuReading({referenceInstant,birthClock:{date,time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true},commentEnabled,practitionerComment:'独自コメント'});
const seen=new Set();
for(let year=1980;year<1989;year++){
 const reading=make(undefined,`${year}-06-15`),page=createKigakuDayPage(reading,'pro'),ref=page.rows[0];
 seen.add(ref.palace);
 assert.equal(page.pageId,'KIG-05');assert.equal(page.slots.length,1);
 assert.equal(page.slots[0].copies[0].copyId,`kig.palace.${ref.palace}.day`);
 assert.equal(page.board[ref.palace],reading.result.sourceResult.natal.mainStar.value);
 assert.equal(ref.date,'2026-10-28');assert.equal(ref.timeZone,'Asia/Tokyo');assert.equal(ref.methodLabel,'koyomi8方式・JST日界');
 assert.equal(ref.calculationVersion,reading.result.sourceResult.day.calculationVersion);
 assert.equal(ref.referenceInstant,reading.input.referenceInstant);assert.equal(ref.path,'result.sourceResult.day.board');
 assert.equal(ref.startInclusive,'2026-10-27T15:00:00.000Z');assert.equal(ref.endExclusive,'2026-10-28T15:00:00.000Z');
 assert.equal(page.practitionerComment,null);assert.equal(page.systemExplanationEnabled,true);
 assert.equal(page.exportAllowed,false);assert.equal(page.releaseEnabled,false);assert.equal(page.verificationStatus,'calculated-not-independently-verified');
 assert.equal(page.slots[0].copies[0].reviewStatus,'draft');assert.ok(page.slots[0].copies[0].copyVersion);assert.ok(page.slots[0].copies[0].sourceUrl);
 assert.deepEqual(createKigakuDayPage(JSON.parse(JSON.stringify(reading)),'pro'),page);
}
assert.equal(seen.size,9);
const before=createKigakuDayPage(make('2026-10-28T14:59:59.999Z'),'pro');
const after=createKigakuDayPage(make('2026-10-28T15:00:00Z'),'pro');
assert.equal(before.rows[0].date,'2026-10-28');assert.equal(after.rows[0].date,'2026-10-29');
assert.equal(before.rows[0].endExclusive,after.rows[0].startInclusive);
const source=make();const original=structuredClone(source.result.analysis);
assert.deepEqual(createKigakuDayPage(source,'business'),createKigakuDayPage(source,'pro'));
assert.deepEqual(source.result.analysis,original); // Day preview never changes annual/monthly common directions.
for(const plan of ['free','unknown',null]){const page=createKigakuDayPage(source,plan);assert.equal(page.reasonCode,'PRO_REQUIRED');assert.equal(page.board,null);assert.deepEqual(page.slots,[]);assert.deepEqual(page.rows,[]);}
assert.equal(createKigakuDayPage(createKigakuReading({referenceInstant:'2026-10-28T00:00:00Z'}),'pro').reasonCode,'MAIN_STAR_REQUIRED');
const tampered=structuredClone(source);tampered.result.sourceResult.day.date='2026-10-29';assert.throws(()=>createKigakuDayPage(tampered,'pro'),/MISMATCH/);
assert.equal(createKigakuDayPage(make(undefined,undefined,true),'pro').practitionerComment,'独自コメント');
const last=createKigakuDayPage(make('2100-12-31T00:00:00Z'),'pro');assert.equal(last.rows[0].endExclusive,'2100-12-31T15:00:00.000Z');
console.log('Day page: nine palace copies, fixed JST midnight boundaries, method/version refs, plan gating, comments, tamper rejection and unchanged common directions verified.');
