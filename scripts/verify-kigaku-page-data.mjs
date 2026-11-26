import assert from 'node:assert/strict';
import { buildKigakuPageData as build, KIGAKU_RESULT_STATES } from '../src/kigaku-page-data.js';
const birth = { date: '1990-06-15', time: '12:34', countryCode: 'JP', zoneId: 'Asia/Tokyo', zoneConfirmed: true, offsetChoiceMinutes: null };
const input = { methodKey: 'nine-star-ki', referenceInstant: '2026-11-08T00:00:00+09:00', birthClock: birth, subjectId: 'fixture-self', revision: 'fixture-r1',
  partnerSubjectId: 'fixture-partner', partnerBirthClock: { ...birth, date: '1991-09-12' },
  loveRelationship: '交際相手', workRelationship: '同僚', familyRelationship: '親子', workTheme: 'job-change', selectedDirection: 'N', directionPurpose: 'travel' };
const result = build(input);
assert.equal(result.pages.length, 14);
assert(result.pages.every(p => ['available', 'valid-zero'].includes(p.state)));
assert(result.pages.every(p => p.publicationAllowed === false && p.copyState === 'source-missing' && p.assetState === 'asset-missing' && p.reviewState === 'review-required'));
assert.equal(result.verificationState, 'review-required');
assert.equal(result.pages[5].state, 'valid-zero');
assert.deepEqual(result.pages[5].data.common.directions, []);
assert.equal(result.pages[11].state, 'available', 'A designated non-good direction is a valid assessment, never a missing result.');
assert.equal(result.pages[11].data.direction, 'N');
assert.equal(result.pages[11].data.purpose, 'travel');
assert.equal(result.pages[10].data.year.honmeiPosition, result.pages[2].data.honmeiPosition);
assert.deepEqual(build(JSON.parse(JSON.stringify(input))), result);
assert(build({ ...input, methodKey: 'numerology' }).pages.every(p => p.state === 'unconnected' && p.data === null));
assert(build({ ...input, referenceInstant: 'bad' }).pages.every(p => p.state === 'calculation-error'));
assert(build({ ...input, referenceInstant: null }).pages.every(p => p.state === 'required-missing'));
assert.equal(build(null).pages[0].state, 'unconnected');
const missing = build({ ...input, birthClock: null });
assert.equal(missing.pages[0].state, 'required-missing');
assert.equal(missing.pages[4].state, 'available');
const boundary = build({ ...input, birthClock: { ...birth, date: '2026-02-04', time: null } });
assert.equal(boundary.pages[0].data, null);
assert.equal(boundary.pages[0].state, 'required-missing');
const optional = build({ ...input, partnerBirthClock: { ...birth, date: '2026-03-05', time: null } });
assert.equal(optional.pages[7].state, 'available');
assert.equal(optional.pages[7].data.monthComparison, null);
assert.equal(optional.pages[7].optionalInputs[0].state, 'optional-missing');
for (const [n, field] of [[8, 'loveRelationship'], [9, 'workRelationship'], [12, 'familyRelationship']]) {
  const r = build({ ...input, [field]: '' });
  assert.equal(r.pages[n].state, 'required-missing');
  assert.equal(r.pages[n].data, null);
  assert.equal(r.pages[7].state, 'available');
}
for (const fields of [{ partnerBirthClock: null }, { partnerSubjectId: '' }, { subjectId: '' }, { partnerSubjectId: input.subjectId }]) {
  const r = build({ ...input, ...fields });
  for (const i of [7, 8, 9, 12]) assert.equal(r.pages[i].state, 'required-missing');
  for (const i of [0, 1, 2, 3, 4, 5, 6, 10, 11, 13]) assert.deepEqual(r.pages[i], result.pages[i]);
}
const invalidPartner = build({ ...input, partnerBirthClock: { ...birth, date: '2200-01-01' } });
assert.equal(invalidPartner.pages[7].state, 'calculation-error');
assert.deepEqual(invalidPartner.pages[0], result.pages[0]);
assert.equal(build({ ...input, selectedDirection: 'C' }).pages[11].data, null);
assert.equal(build({ ...input, directionPurpose: 'forecast' }).pages[11].state, 'required-missing');
assert.equal(build({ ...input, workTheme: 'unknown' }).pages[10].state, 'required-missing');
assert.equal(build({ ...input, referenceInstant: '2100-06-01T00:00:00+09:00' }).pages[13].state, 'required-missing');
assert.equal(build({ ...input, referenceInstant: '2100-12-31T12:00:00+09:00' }).pages[5].state, 'required-missing', 'No annual assessment may silently truncate an out-of-range year.');
assert.deepEqual(input.birthClock, birth);
const states = new Set([ ...result.pages.flatMap(p => [p.state, p.copyState, p.assetState, p.reviewState]),
  ...optional.pages[7].optionalInputs.map(p => p.state), missing.pages[0].state, invalidPartner.pages[7].state,
  build({ methodKey: 'tarot' }).pages[0].state ]);
assert.deepEqual([...states].sort(), [...KIGAKU_RESULT_STATES].sort());
console.log('F4 Kigaku: all 14 mappings, all nine states, optional month comparison, context/identity checks, invalid partner isolation, full intervals and no formal publication verified.');
