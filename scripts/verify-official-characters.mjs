import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1OfficialCharacterCatalog } from '../src/official-character-catalog.js';
import { createCharacterApi } from '../src/character-api.js';
test('official SQL catalog and duplication API preserve private immutable source versions', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0006_official_characters.sql', import.meta.url),'utf8'));
  const insert = (version, hidden) => db.prepare('INSERT INTO official_character_versions VALUES (?,?,?,?,?)').run('official',version,'Official',JSON.stringify(Array(9).fill(20)),JSON.stringify(Array(6).fill(hidden)));
  insert('1',70); insert('2',80);
  db.exec("INSERT INTO official_character_publications VALUES ('official','1','published')");
  const d1 = { prepare(sql) { return { async all() { return { results: db.prepare(sql).all() }; }, bind(...args) { return { async first() { return db.prepare(sql).get(...args); } }; } }; } };
  const catalog = new D1OfficialCharacterCatalog(d1);
  let state = [], revision = 0, planId = 'free';
  const repository = { async read() { return { state: structuredClone(state), revision }; }, async compareAndSwap(_, expected, next) { if (expected !== revision) return false; state = structuredClone(next); revision++; return true; } };
  const api = createCharacterApi({ catalog, repository, coreWorker: { async fetch() { return Response.json({ incomingRequestVerified:true,incomingRequestUserId:'owner' }); } }, entitlement: async () => ({ ok:true,entitlement:{workspaceId:'ws_personal',ownerUserId:'owner',productCode:'numeria-studio',source:'growth-engine',planId,entitlementStatus:'active',validUntil:null} }) });
  const call = (path,body) => api(new Request('https://test/api/characters/'+path,{ method:body?'POST':'GET', headers:{authorization:'Bearer fixture','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}) }),{CHARACTER_API_ENABLED:'1',AUTH_ENFORCEMENT_MODE:'enforce'});
  try {
    const listed = await call('official'); assert.equal(listed.status,200); assert.doesNotMatch(await listed.text(),/"hiddenParameters"/g);
    const body = {name:'Copy',sourceCharacterId:'official',sourceCharacterVersion:'1'};
    assert.equal((await call('duplicate',body)).status,403);
    planId='pro';
    assert.equal((await call('duplicate',{...body,hiddenParameters:Array(6).fill(0)})).status,400);
    const copied=await call('duplicate',body);assert.equal(copied.status,201);assert.doesNotMatch(await copied.text(),/"hiddenParameters"/g);
    assert.deepEqual(state[0].versions[0].hiddenParameters,Array(6).fill(70));
    db.exec("UPDATE official_character_publications SET character_version='2'");
    assert.equal((await call('duplicate',body)).status,409);
    assert.deepEqual(state[0].versions[0].hiddenParameters,Array(6).fill(70));
    db.exec("UPDATE official_character_publications SET status='stopped'");
    assert.deepEqual(await catalog.list(),[]);
    assert.equal((await call('duplicate',{...body,sourceCharacterVersion:'2'})).status,409);
    assert.throws(()=>db.exec("UPDATE official_character_versions SET name='changed'"),/immutable/);
    assert.throws(()=>db.exec('DELETE FROM official_character_versions'),/immutable/);
    assert.equal(state.length,1);
  } finally { db.close(); }
});
