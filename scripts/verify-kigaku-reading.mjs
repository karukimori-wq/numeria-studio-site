import {renderKigakuReportHtml} from '../src/kigaku-report-print.js';
import {KIGAKU_COPY_CATALOG} from '../src/kigaku-copy-catalog.js';
import assert from 'node:assert/strict';
import worker from '../src/worker-entry.js';
import { createKigakuReading, validateKigakuReading } from '../src/kigaku-reading.js';
import { normalizeJapanBirthClock as clock } from '../src/japan-birth-clock.js';
const input = { referenceInstant: '2026-10-24T12:00:00+09:00', birthClock: { date: '1990-06-15', time: '12:34', countryCode: 'JP', zoneId: 'Asia/Tokyo', zoneConfirmed: true }, birthPlace: '岩手県', question: '相談', selectedDirection: 'NE' };
const reading = createKigakuReading(input);
assert.deepEqual(validateKigakuReading(JSON.parse(JSON.stringify(reading))), reading);
for (const mutate of [x => x.input.referenceInstant = '2026-11-24T03:00:00.000Z', x => x.input.selectedDirection = 'N', x => x.result.analysis.year[0].star = 99, x => x.systemExplanationEnabled = false, x => x.publicationStatus = 'approved']) {
  const altered = structuredClone(reading); mutate(altered);
  assert.throws(() => validateKigakuReading(altered), /MISMATCH/);
}
assert.throws(() => createKigakuReading({ ...input, question: 'a'.repeat(10001) }), /TEXT_INVALID/);
assert.throws(() => createKigakuReading({ ...input, planId: 'pro' }), /INPUT_INVALID/);
for (const referenceInstant of ['2026-10-24T24:00:00Z', '2026-10-24T12:00:60Z', '2026-10-24T12:00:00+24:00']) assert.throws(() => createKigakuReading({ ...input, referenceInstant }), /INSTANT_INVALID/);
for (const patch of [{ extra: true }, { zoneConfirmed: 'true' }, { offsetChoiceMinutes: 540 }, { offsetChoiceMinutes: '600' }]) assert.throws(() => clock({ ...input.birthClock, ...patch }));
for (const [start, end] of [['1948-05-02', '1948-09-12'], ['1949-04-03', '1949-09-11'], ['1950-05-07', '1950-09-10'], ['1951-05-06', '1951-09-09']]) {
  const birth = { ...input.birthClock, date: start, time: '00:30' };
  assert.equal(clock(birth).reasonCode, 'BIRTH_CLOCK_TIME_NONEXISTENT');
  birth.date = end;
  assert.equal(clock(birth).candidates.length, 2);
  for (const offsetChoiceMinutes of [540, 600]) assert.equal(clock({ ...birth, offsetChoiceMinutes }).selected.appliedOffsetMinutes, offsetChoiceMinutes);
}
// Local RS256 fixture exercises the real server authentication path; no real Clerk credentials.
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey); jwk.kid = 'test-kigaku';
const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${base64({ alg: 'RS256', kid: jwk.kid })}.${base64({ sub: 'kigaku-user', exp: Math.floor(Date.now()/1000)+300 })}`;
const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(unsigned));
const token = `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
const savedFetch = globalThis.fetch;
globalThis.fetch = async url => { assert.equal(String(url), 'https://clerk.test/kigaku-jwks'); return Response.json({ keys: [jwk] }); };
const rows = new Map();
const db = { prepare(sql) { let args; return { bind(...values) { args = values; return this; }, async first() { return rows.get(args[0]) ?? null; }, async run() { assert.match(sql, /INSERT INTO usage_records/); rows.set(args[0], { plan_id: args[4], monthly_appraisals: args[5], appraisal_clients: args[6], in_progress_appraisals: args[7], appraisal_client_profiles_json: args[8], active_draft_json: args[9], completed_appraisal_ids_json: args[10], completed_appraisals_json: args[11], report_exports_json: args[12], billing_month: args[3] }); return { success: true }; } }; } };
const env = { CLERK_JWKS_URL: 'https://clerk.test/kigaku-jwks', NUMERIA_DB: db };
async function request(path, body, authorized = true) {
  const response = await worker.fetch(new Request(`https://local.test${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(authorized ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await request('/api/kigaku/calculate', { input }, false)).status, 401);
  const calculated = await request('/api/kigaku/calculate', { input });
  assert.equal(calculated.status, 200); assert.deepEqual(calculated.body.reading, reading);
  const saved = await request('/api/appraisals/save-draft', { appraisalId: 'ki-test', clientProfileId: 'customer-ki', snapshot: reading, planId: 'pro' });
  assert.equal(saved.status, 201); assert.equal(saved.body.activeDraft.divination, 'nine-star-ki');
  assert.equal(saved.body.usage.planId, 'free');
  assert.equal(saved.body.activeDraft.clientProfileId, 'customer-ki');
  const restored = await request('/api/usage');
  assert.equal(restored.status, 200); assert.deepEqual(restored.body.usage.activeDraft.snapshot, reading);
  const legacyRow=[...rows.values()][0];const legacyDraft=JSON.parse(legacyRow.active_draft_json);delete legacyDraft.reportSnapshot;legacyRow.active_draft_json=JSON.stringify(legacyDraft);
  assert.equal((await request('/api/usage')).status,200);
  const upgradedLegacy=await request('/api/appraisals/save-draft',{appraisalId:'ki-test',snapshot:reading});
  assert.equal(upgradedLegacy.body.activeDraft.reportSnapshot.schemaVersion,'numeria.kigaku.report.v1');
  const preview=await request('/api/kigaku/period-pages',{snapshot:reading,planId:'pro'});
  assert.equal(preview.status,200);assert.deepEqual(preview.body.pages.slice(0,4).map(page=>page.state),Array(4).fill('draft_preview'));assert.ok(preview.body.pages.slice(4).every(page=>page.reasonCode==='PRO_REQUIRED'));
  assert.equal((await request('/api/kigaku/period-pages',{snapshot:reading},false)).status,401);
  // Change only the mocked server-side record; request plan claims remain untrusted.
  const serverRow = [...rows.values()][0];
  for (const plan of ['pro', 'business']) {
    serverRow.plan_id = plan;
    const allowed = await request('/api/kigaku/period-pages', { snapshot: reading, planId: 'free' });
    assert.equal(allowed.status, 200);
    assert.deepEqual(allowed.body.pages.map(page => page.state), [...Array(7).fill('draft_preview'),...Array(6).fill('unavailable'),'draft_preview']);
    assert.deepEqual(allowed.body.pages.map(page => page.slots.length), [2,3,2,2,1,2,2,0,0,0,0,0,0,9]);
    assert.ok(allowed.body.pages.every(page => page.exportAllowed === false && page.releaseEnabled === false));
  }
  const full=createKigakuReading({...input,partnerBirthClock:{...input.birthClock,date:'1993-08-15'},partnerName:'相手',loveRelationship:'交際相手',workRelationship:'同僚',familyRelationship:'子',workTheme:'job-change',directionPurpose:'travel'});
  const fullResponse=await request('/api/kigaku/period-pages',{snapshot:full});
  assert.equal(fullResponse.status,200);assert.equal(fullResponse.body.pages.length,14);assert.ok(fullResponse.body.pages.every(p=>p.state==='draft_preview'));
  const fullSaved=await request('/api/appraisals/save-draft',{appraisalId:'ki-test',snapshot:full});assert.equal(fullSaved.status,201);
  assert.deepEqual((await request('/api/usage')).body.usage.activeDraft.snapshot,full);
  const frozen=fullSaved.body.activeDraft.reportSnapshot;
  assert.equal(frozen.pages.length,14);
  const hostile=structuredClone(frozen);hostile.subjectName='<script>alert(1)</script>';hostile.pages[0].slots[0].copies[0].body='<img src=x onerror=alert(1)>';
  const safeHtml=renderKigakuReportHtml(hostile);
  assert.ok(!safeHtml.includes('<script>'));assert.ok(!safeHtml.includes('<img'));
  assert.match(safeHtml,/&lt;script&gt;/);
  assert.deepEqual(frozen.pages,fullResponse.body.pages);
  assert.deepEqual((await request('/api/usage')).body.usage.activeDraft.reportSnapshot,frozen);
  const originalCopy=KIGAKU_COPY_CATALOG[0].body;KIGAKU_COPY_CATALOG[0].body='後日更新された本文';
  assert.deepEqual((await request('/api/usage')).body.usage.activeDraft.reportSnapshot,frozen);
  const repeated=await request('/api/appraisals/save-draft',{appraisalId:'ki-test',snapshot:full,reportSnapshot:{pages:[]}});
  assert.deepEqual(repeated.body.activeDraft.reportSnapshot,frozen);
  KIGAKU_COPY_CATALOG[0].body=originalCopy;
  const notesOnly=await request('/api/appraisals/save-draft',{appraisalId:'ki-test',notes:'メモだけ変更'});
  assert.deepEqual(notesOnly.body.activeDraft.reportSnapshot,frozen);
  for(const format of ['standard','magazine']) {
    const printed=await request('/api/kigaku/report-print',{draftId:'ki-test',format});
    assert.equal(printed.status,200);assert.match(printed.body.html,/@page\{size:A4/);
    assert.equal((printed.body.html.match(/<article>/g)||[]).length,14);
    assert.match(printed.body.html,/未承認草案/);assert.equal(printed.body.exportAllowed,false);
  }
  assert.equal((await request('/api/kigaku/report-print',{draftId:'other',format:'standard'})).status,409);
  assert.equal((await request('/api/kigaku/report-print',{draftId:'ki-test',format:'bad'})).status,400);
  assert.equal((await request('/api/kigaku/report-print',{draftId:'ki-test',format:'standard'},false)).status,401);
  const fullRow=[...rows.values()][0];fullRow.plan_id='free';
  assert.equal((await request('/api/usage')).body.usage.activeDraft.reportSnapshot,undefined);
  assert.equal((await request('/api/kigaku/report-print',{draftId:'ki-test',format:'standard'})).status,409);
  assert.deepEqual(JSON.parse(fullRow.active_draft_json).reportSnapshot,frozen);
  fullRow.plan_id='business';
  assert.deepEqual((await request('/api/usage')).body.usage.activeDraft.reportSnapshot,frozen);
  const corrupt=JSON.parse(fullRow.active_draft_json);corrupt.reportSnapshot.pages[0].title='改変';
  const intact=fullRow.active_draft_json;fullRow.active_draft_json=JSON.stringify(corrupt);
  assert.equal((await request('/api/usage')).status,409);fullRow.active_draft_json=intact;
  const corruptPartner=structuredClone(full);corruptPartner.partnerResult.natal.mainStar.value=99;
  assert.equal((await request('/api/kigaku/period-pages',{snapshot:corruptPartner})).status,400);
  await request('/api/appraisals/save-draft',{appraisalId:'ki-test',snapshot:reading});
  const broken = structuredClone(reading); broken.result.sourceResult.natal.mainStar.value = 99;
  assert.equal((await request('/api/kigaku/period-pages', { snapshot: broken })).status, 400);
  [...rows.values()][0].plan_id = 'free';
  const downgraded = await request('/api/kigaku/period-pages', { snapshot: reading, planId: 'business' });
  assert.deepEqual(downgraded.body.pages.slice(0,4).map(page=>page.state),Array(4).fill('draft_preview'));
  assert.ok(downgraded.body.pages.slice(4).every(page => page.reasonCode === 'PRO_REQUIRED'));
  const bad = structuredClone(reading); bad.result.analysis.common.directions.push('C');
  assert.equal((await request('/api/appraisals/save-draft', { appraisalId: 'ki-test', snapshot: bad })).status, 400);
  assert.deepEqual((await request('/api/usage')).body.usage.activeDraft.snapshot, reading);
  const row = [...rows.values()][0]; row.active_draft_json = JSON.stringify({ ...saved.body.activeDraft, snapshot: bad });
  assert.equal((await request('/api/usage')).status, 409);
  assert.equal((await request('/api/appraisals/status')).status, 409);
} finally { globalThis.fetch = savedFetch; }
console.log('Pro/Business server-record period previews, downgrade, forged plans and tampered input verified with mocked D1.');
console.log('Kigaku reading: strict inputs, all 8 DST transitions, snapshot tampering, RS256 auth, mocked D1 save/restore and server Free plan verified.');
