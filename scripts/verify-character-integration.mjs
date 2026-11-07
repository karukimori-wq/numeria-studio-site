import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/worker-entry.js';

test('Worker → real JWT verification → GE adapter → real SQLite, with failure injection', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'fixture-key' };
  const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(user, expiry = Math.floor(Date.now()/1000)+300) {
    const input = base64({ alg: 'RS256', kid: jwk.kid })+'.'+base64({ sub: user, iss: 'https://fixture.clerk.test', exp: expiry });
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(input));
    return input+'.'+Buffer.from(signature).toString('base64url');
  }
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0005_character_collections.sql', import.meta.url),'utf8'));
  for (const file of ['0006_official_characters.sql','0007_character_selections.sql']) db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
  db.prepare('INSERT INTO official_character_versions VALUES (?,?,?,?,?)').run('official','1','Fixture',JSON.stringify(Array(9).fill(50)),JSON.stringify(Array(6).fill(70)));
  db.exec("INSERT INTO official_character_publications VALUES ('official','1','published')");
  let storageFailure = false, geFailure = false, expired = false, reads = 0, planId = 'pro', stopOnSave = false;
  const env = { CHARACTER_API_ENABLED: '1', AUTH_ENFORCEMENT_MODE: 'enforce', CLERK_JWKS_URL: 'https://fixture.clerk.test/jwks', CLERK_JWT_ISSUER: 'https://fixture.clerk.test', PLATFORM_SUBSCRIPTION_INTEGRATION_SECRET: 'test-only-not-a-secret',
    DB: { prepare(sql) { return { async all() { return {results:db.prepare(sql).all()}; }, bind(...args) { return {
      async first() { if (storageFailure) throw Error('private storage detail'); return db.prepare(sql).get(...args); },
      async run() { if (stopOnSave && sql.includes('INSERT INTO character_selections')) { db.exec("UPDATE official_character_publications SET status='stopped'"); stopOnSave=false; } if (storageFailure) throw Error('private storage detail'); return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
    }; } }; } },
    GROWTH_ENGINE_SERVICE: { async fetch(url, init) {
      reads++;
      const query = new URL(url).searchParams;
      assert.equal(query.get('workspaceId'), 'ws_personal');
      assert.ok(['owner1','owner2'].includes(query.get('ownerUserId')));
      assert.equal(init.headers['x-platform-subscription-secret'], 'test-only-not-a-secret');
      return Response.json(geFailure ? { status: 'error' } : { status: 'success', planId, entitlementStatus: 'active', validUntil: expired ? '2000-01-01T00:00:00Z' : null }, { status: geFailure ? 503 : 200 });
    } },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => { assert.equal(String(url), env.CLERK_JWKS_URL); return Response.json({ keys: [jwk] }); };
  const fields = { name: 'fixture', surfaceParameters: Array(9).fill(50) };
  async function call(jwt, method='GET', body, path='/api/characters') {
    return worker.fetch(new Request('https://test'+path, { method, headers: { authorization: 'Bearer '+jwt, 'content-type': 'application/json', 'x-user-id': 'forged', 'x-plan-id': 'business' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env, {});
  }
  try {
    const owner1 = await token('owner1'), owner2 = await token('owner2');
    assert.equal((await call(await token('owner1', 1))).status, 401);
    assert.equal((await call(owner1.slice(0,-8)+'AAAAAAAA')).status, 401);
    assert.equal(reads, 0);
    const created = await call(owner1, 'POST', fields); assert.equal(created.status, 201);
    const id = (await created.json()).character.characterId;
    assert.deepEqual((await (await call(owner2)).json()).characters, []);
    assert.equal((await call(owner2, 'PUT', { ...fields, expectedVersion: 1 }, '/api/characters/'+id)).status, 404);
    geFailure = true; assert.equal((await call(owner1, 'POST', fields)).status, 503); geFailure = false;
    expired = true; assert.equal((await call(owner1, 'POST', fields)).status, 403); expired = false;
    storageFailure = true; const failed = await call(owner1, 'POST', fields); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private storage/); storageFailure = false;
    assert.equal((await (await call(owner1)).json()).characters.length, 1);
    planId = 'free';
    const selectionPath = '/api/characters/selection';
    const selection = {characterId:'official',characterVersion:'1',expectedRevision:0};
    const official = await call(owner1,'GET',undefined,'/api/characters/official');
    assert.equal(official.status,200); assert.doesNotMatch(await official.text(),/hidden|70/);
    assert.equal((await call(owner1,'POST',fields)).status,403);
    assert.equal((await call(owner1,'PUT',{...selection,userId:'owner2'},selectionPath)).status,400);
    assert.equal((await call(owner1,'PUT',selection,selectionPath)).status,200);
    assert.equal((await (await call(owner2,'GET',undefined,selectionPath)).json()).selection,null);
    assert.equal((await call(owner1,'PUT',selection,selectionPath)).status,409);
    storageFailure=true;
    assert.equal((await call(owner1,'PUT',{...selection,expectedRevision:1},selectionPath)).status,503);
    storageFailure=false;
    stopOnSave=true;
    assert.equal((await call(owner1,'PUT',{...selection,expectedRevision:1},selectionPath)).status,409);
    const restored=(await (await call(owner1,'GET',undefined,selectionPath)).json()).selection;
    assert.deepEqual(restored,{characterId:'official',characterVersion:'1',revision:1,available:false});
    assert.equal(db.prepare('SELECT count(*) AS n FROM character_collections').get().n,1);
  } finally { globalThis.fetch = originalFetch; db.close(); }
});
