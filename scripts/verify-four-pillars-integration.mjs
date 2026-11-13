import assert from 'node:assert/strict';
import { fourPillarsFromBirthClock as calc } from '../src/four-pillars-birth-clock.js';
import { buildFourPillarsPageData as pages } from '../src/four-pillars-page-data.js';
import { normalizeJapanBirthTime } from '../src/japan-birth-time.js';
const birthClock = { date: '2000-01-07', time: '23:00', countryCode: 'JP', zoneId: 'Asia/Tokyo', zoneConfirmed: true, offsetChoiceMinutes: null };
const base = { birthClock, referenceDate: '2026-11-13', methodKey: 'four-pillars', subjectId: 'fixture', revision: 1 };
for (const [date, time, day, hour] of [['2000-01-07','22:59','甲子','乙亥'],['2000-01-07','23:00','甲子','丙子'],['2000-01-07','23:59','甲子','丙子'],['2000-01-08','00:00','乙丑','丙子']]) {
  const result = calc({ ...base, birthClock: { ...birthClock, date, time } });
  assert.equal(result.pillars.day, day); assert.equal(result.pillars.hour, hour); assert.equal(result.publicationAllowed, false);
}
assert.equal(calc({ ...base, birthClock: { ...birthClock, time: null } }).elements.data.total, 6);
for (const [date, time, reason] of [['1948-05-02','00:30','BIRTH_CLOCK_TIME_NONEXISTENT'], ['1948-09-12','00:30','BIRTH_CLOCK_TIME_AMBIGUOUS']]) {
  assert.equal(calc({ ...base, birthClock: { ...birthClock, date, time } }).reason, reason);
}
const summer = calc({ ...base, birthClock: { ...birthClock, date: '1948-07-01', time: '00:30:45' } });
assert.equal(summer.calculation.birthStandardDate, '1948-06-30'); assert.equal(summer.calculation.birthStandardTime, '23:30:45');
assert.equal(calc({ ...base, birthClock: { ...birthClock, date: '1948-07-01', time: null } }).reason, 'STANDARD_BIRTH_DATE_UNCERTAIN');
assert.equal(calc({ ...base, birthClock: { ...birthClock, date: '2026-02-04', time: null } }).state, 'required-missing');
assert.equal(calc({ ...base, birthClock: { ...birthClock, zoneConfirmed: false } }).pillars, null);
const mapped = pages(base);
assert.equal(mapped.pages.length, 14); assert.equal(mapped.pages[0].data.pillars.day, '甲子');
assert.equal(mapped.pages[1].data.dayStem, '甲'); assert.equal(mapped.pages[2].data.total, 8);
assert.ok(mapped.pages.filter(page => ['BAZ-06','BAZ-07','BAZ-08','BAZ-12','BAZ-13','BAZ-14'].includes(page.pageDefinitionId)).every(page => page.state === 'unconnected' && page.data === null));
assert.ok(mapped.pages.every(page => !page.publicationAllowed && page.reviewState === 'review-required'));
assert.ok(pages({ ...base, methodKey: 'tarot' }).pages.every(page => page.data === null));
assert.equal(pages({ ...base, birthClock: { ...birthClock, date: '2000-02-30' } }).pages[0].data, null);
const restored = pages(JSON.parse(JSON.stringify(base))); assert.deepEqual(restored, mapped);
assert.equal(normalizeJapanBirthTime({ birthDate: '2000-01-07', clockTime: '12:00:00', utcOffsetMinutes: 540 }).status, 'calculated');
console.log('Four Pillars integration: sect2 23h, shared DST clock, unknown stable/uncertain dates, eight calculated page adapters, six explicit gaps and no formal publication PASS. Internal fixtures are not independent chart acceptance.');
