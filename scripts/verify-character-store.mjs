import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { CharacterStore, D1CharacterRepository } from '../src/character-store.js';

const fields = (n = 50) => ({ name: '鑑定師', surfaceParameters: Array(9).fill(n) });
const scope = (planId = 'pro', userId = 'owner') => ({ workspaceId: 'workspace', userId, planId });
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0005_character_collections.sql', import.meta.url), 'utf8'));
  // Execute the real repository SQL against SQLite; only adapt D1 result envelopes.
  const repository = new D1CharacterRepository({ prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args); },
    async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
  }; } }; } });
  let i = 0;
  return { db, repository, store: new CharacterStore(repository, { id: () => `c${++i}`, now: () => '2026-10-28T00:00:00Z' }) };
}
const rejects = (promise, code) => assert.rejects(promise, { code });

test('Free cannot create; unknown or inherited plan names fail closed', async () => {
  const { store } = fixture();
  await rejects(store.create(scope('free'), fields()), 'CHARACTER_PLAN_REQUIRED');
  for (const plan of ['trial', 'toString', '__proto__']) await rejects(store.create(scope(plan), fields()), 'CHARACTER_SCOPE_INVALID');
});
for (const [plan, limit] of [['pro', 10], ['business', 30]]) test(`${plan} quota ${limit}, deleted releases quota and preserves history`, async () => {
  const { store, repository } = fixture();
  for (let i = 0; i < limit; i++) await store.create(scope(plan), fields());
  await rejects(store.create(scope(plan), fields()), 'CHARACTER_LIMIT_REACHED');
  await store.remove(scope(plan), 'c1', 1);
  await store.create(scope(plan), fields());
  assert.equal((await store.list(scope(plan))).length, limit);
  assert.equal((await repository.read(scope(plan))).state[0].versions.length, 1);
});
test('draft, published and stopped count; cross-user and cross-workspace access is isolated', async () => {
  const { store, repository } = fixture();
  for (let i = 0; i < 10; i++) await store.create(scope(), fields());
  const current = await repository.read(scope());
  current.state[0].status = 'stopped'; current.state[1].status = 'published';
  await repository.compareAndSwap(scope(), current.revision, current.state);
  await rejects(store.create(scope(), fields()), 'CHARACTER_LIMIT_REACHED');
  for (const other of [scope('pro', 'other'), { ...scope(), workspaceId: 'other' }]) {
    assert.deepEqual(await store.list(other), []);
    await rejects(store.save(other, 'c1', 1, fields()), 'CHARACTER_NOT_FOUND');
  }
});
test('custom fields reject arbitrary text, hidden settings, ReadingConfig and unsafe values', async () => {
  const { store } = fixture();
  for (const key of ['personality', 'speakingStyle', 'customInstruction', 'hiddenParameters', 'readingConfig', 'status']) {
    await rejects(store.create(scope(), { ...fields(), [key]: 'untrusted' }), 'CHARACTER_INPUT_INVALID');
  }
  for (const value of [Array(8).fill(50), Array(10).fill(50), Array(9).fill(55), Array(9).fill('50'), Array(9).fill(NaN), Array(9).fill(110), Array(9)]) {
    await rejects(store.create(scope(), { name: 'name', surfaceParameters: value }), 'CHARACTER_PARAMETERS_INVALID');
  }
  for (let n = 0; n <= 100; n += 10) await store.create(scope('business'), fields(n));
});
test('official copy fixes both parameter sets; hidden data never appears in user responses', async () => {
  const { store, repository } = fixture();
  const source = { type: 'preset', status: 'published', characterId: 'official', characterVersion: 'v1', surfaceParameters: Array(9).fill(20), hiddenParameters: Array(6).fill(70) };
  const created = await store.create(scope(), fields(), source);
  source.hiddenParameters.fill(0); source.surfaceParameters.fill(0);
  assert.deepEqual(created.versions[0].surfaceParameters, Array(9).fill(20));
  await store.save(scope(), created.characterId, 1, fields(90));
  const stored = (await repository.read(scope())).state[0];
  assert.deepEqual(stored.versions.map(v => v.hiddenParameters), [Array(6).fill(70), Array(6).fill(70)]);
  assert.doesNotMatch(JSON.stringify(await store.list(scope())), /hidden|source|70/);
  const blank = await store.create(scope(), fields());
  assert.equal((await repository.read(scope())).state.find(c => c.characterId === blank.characterId).versions[0].hiddenParameters, null);
});
test('saving appends an immutable version; stale save issues no version; public pointer advances independently of NP', async () => {
  const { store, repository } = fixture();
  await store.create(scope(), fields(10));
  const initial = await repository.read(scope());
  initial.state[0].status = 'published'; initial.state[0].publishedVersion = 1;
  await repository.compareAndSwap(scope(), initial.revision, initial.state);
  const saved = await store.save(scope(), 'c1', 1, fields(90));
  assert.equal(saved.publishedVersion, 2);
  assert.deepEqual(saved.versions[0].surfaceParameters, Array(9).fill(10));
  await rejects(store.save(scope(), 'c1', 1, fields()), 'CHARACTER_CONFLICT');
  assert.equal((await store.list(scope()))[0].latestVersion, 2);
});
test('simultaneous first creates, saves and last quota slots use atomic CAS', async () => {
  const { store } = fixture();
  const first = await Promise.allSettled([store.create(scope(), fields()), store.create(scope(), fields())]);
  assert.equal(first.filter(r => r.status === 'fulfilled').length, 1);
  const c = (await store.list(scope()))[0];
  const saves = await Promise.allSettled([store.save(scope(), c.characterId, 1, fields(20)), store.save(scope(), c.characterId, 1, fields(80))]);
  assert.equal(saves.filter(r => r.status === 'fulfilled').length, 1);
  for (let i = 1; i < 9; i++) await store.create(scope(), fields());
  const last = await Promise.allSettled([store.create(scope(), fields()), store.create(scope(), fields())]);
  assert.equal(last.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.list(scope())).length, 10);
});
test('downgrade keeps existing IDs/history while blocking edits; detached responses cannot mutate storage', async () => {
  const { store, repository } = fixture();
  const c = await store.create(scope('business'), fields());
  c.versions[0].surfaceParameters[0] = 0;
  assert.equal((await store.list(scope('free')))[0].versions[0].surfaceParameters[0], 50);
  await rejects(store.save(scope('free'), c.characterId, 1, fields()), 'CHARACTER_PLAN_REQUIRED');
  await store.remove(scope('free'), c.characterId, 1);
  assert.equal((await repository.read(scope())).state[0].versions.length, 1);
});
