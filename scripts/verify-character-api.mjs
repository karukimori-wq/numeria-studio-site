import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterApi } from '../src/character-api.js';
const env = { CHARACTER_API_ENABLED: '1', AUTH_ENFORCEMENT_MODE: 'enforce' };
const fields = { name: 'Reader', surfaceParameters: Array(9).fill(50) };
function setup({ verified = true, planId = 'pro', active = true, fail = false } = {}) {
  const rows = new Map();
  const repository = {
    async read(s) { return structuredClone(rows.get(s.userId) || { revision: 0, state: [] }); },
    async compareAndSwap(s, revision, state) { if ((rows.get(s.userId)?.revision || 0) !== revision) return false; rows.set(s.userId, { revision: revision + 1, state: structuredClone(state) }); return true; },
  };
  const api = createCharacterApi({ repository, coreWorker: { async fetch(r) { return Response.json({ incomingRequestVerified: verified, incomingRequestUserId: r.headers.get('authorization') === 'Bearer user2' ? 'user2' : 'user1' }); } },
    entitlement: async (_, { workspaceId, ownerUserId }) => ({ ok: !fail, entitlement: { workspaceId, ownerUserId, productCode: 'numeria-studio', source: 'growth-engine', planId, entitlementStatus: active ? 'active' : 'inactive', validUntil: null } }) });
  return (method = 'GET', body, token = 'user1', path = '/api/characters', config = env) => api(new Request('https://test'+path, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), config);
}
test('disabled/observe APIs and unverified identities fail closed', async () => {
  assert.equal((await setup()('GET', undefined, 'user1', '/api/characters', {})).status, 503);
  assert.equal((await setup()('GET', undefined, 'user1', '/api/characters', { ...env, AUTH_ENFORCEMENT_MODE: 'observe' })).status, 503);
  assert.equal((await setup({ verified: false })()).status, 401);
});
test('GE failure, inactive paid plan and unsupported Business never grant create', async () => {
  for (const options of [{ fail: true }, { active: false }, { planId: 'business' }]) assert.notEqual((await setup(options)('POST', fields)).status, 201);
  assert.equal((await setup({ planId: 'free' })('POST', fields)).status, 403);
});
test('create/list/save isolate verified owners and reject forged authority', async () => {
  const call = setup();
  for (const key of ['userId', 'workspaceId', 'planId', 'hiddenParameters', 'officialSource']) assert.equal((await call('POST', { ...fields, [key]: 'forged' })).status, 400);
  const created = await call('POST', fields); assert.equal(created.status, 201);
  const id = (await created.json()).character.characterId;
  assert.deepEqual((await (await call('GET', undefined, 'user2')).json()).characters, []);
  assert.equal((await call('PUT', { ...fields, expectedVersion: 1 }, 'user2', '/api/characters/'+id)).status, 404);
  assert.equal((await call('PUT', { ...fields, expectedVersion: 1 }, 'user1', '/api/characters/'+id)).status, 200);
  assert.equal((await call('PUT', { ...fields, expectedVersion: 1 }, 'user1', '/api/characters/'+id)).status, 409);
  assert.equal((await call('GET', undefined, 'user1', '/api/characters?workspaceId=other')).status, 400);
});
