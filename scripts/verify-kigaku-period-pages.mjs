import assert from 'node:assert/strict';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuPeriodPages} from '../src/kigaku-period-pages.js';
const reading=referenceInstant=>createKigakuReading({referenceInstant,birthClock:{date:'1990-06-15',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true},practitionerComment:'独自コメント',commentEnabled:false});
const source=reading('2026-10-26T12:00:00+09:00');
const pages=createKigakuPeriodPages(source,'pro');
assert.deepEqual(pages.map(p=>p.slots.length),[2,9]);assert.deepEqual(pages.map(p=>p.rows.length),[12,9]);
assert.equal(pages[0].slots[0].copies.length,12);
for(const page of pages){assert.equal(page.practitionerComment,null);assert.equal(page.systemExplanationEnabled,true);assert.equal(page.exportAllowed,false);for(const slot of page.slots)for(const copy of slot.copies){assert.equal(copy.reviewStatus,'draft');assert.equal(copy.releaseEnabled,false);assert.ok(copy.sourceUrl);}}
assert.equal(pages[1].slots[0].copies[0].copyId,'kig.cycle.reading');
for(const p of createKigakuPeriodPages(source))assert.equal(p.reasonCode,'PRO_REQUIRED');
for(const p of createKigakuPeriodPages(createKigakuReading({referenceInstant:source.input.referenceInstant}),'pro'))assert.equal(p.reasonCode,'MAIN_STAR_REQUIRED');
for(const p of createKigakuPeriodPages(reading('2100-10-26T00:00:00Z'),'pro')){assert.equal(p.reasonCode,'FULL_PERIOD_OUT_OF_RANGE');assert.equal(p.slots.length,0);}
const altered=structuredClone(source);altered.result.analysis.common.directions.push('C');assert.throws(()=>createKigakuPeriodPages(altered,'pro'),/MISMATCH/);
assert.deepEqual(createKigakuPeriodPages(JSON.parse(JSON.stringify(source)),'pro'),pages);
console.log('Period page assembly: 12 months in 2 slots, 9 years in 9 slots, source refs, draft restrictions, plan gates, missing input and range rejection verified.');
