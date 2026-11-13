import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1CharacterSelection } from '../src/character-selection.js';
test('official selection CAS validates publication atomically and isolates owners', async () => {
  const db=new DatabaseSync(':memory:');
  for(const f of ['0006_official_characters.sql','0007_character_selections.sql']) db.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
  for(const version of ['1','2']) db.prepare('INSERT INTO official_character_versions VALUES (?,?,?,?,?)').run('official',version,'Official','[50,50,50,50,50,50,50,50,50]','[50,50,50,50,50,50]');
  db.exec("INSERT INTO official_character_publications VALUES ('official','1','published')");
  const d1={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}};}};}};
  const store=new D1CharacterSelection(d1),scope={workspaceId:'personal',userId:'owner'};
  const input={characterId:'official',characterVersion:'1',expectedRevision:0};
  try {
    assert.equal(await store.read(scope),null);
    const results=await Promise.allSettled([store.save(scope,input),store.save(scope,input)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.deepEqual(await store.read(scope),{characterId:'official',characterVersion:'1',revision:1,available:true});
    assert.equal(await store.read({...scope,userId:'other'}),null);
    assert.equal(await store.read({...scope,workspaceId:'other'}),null);
    await assert.rejects(store.save(scope,{...input,hiddenParameters:[]}),{code:'CHARACTER_INPUT_INVALID'});
    await assert.rejects(store.save({...scope,userId:'other'},{...input,expectedRevision:2}),{code:'CHARACTER_CONFLICT'});
    db.exec("UPDATE official_character_publications SET character_version='2'");
    assert.equal((await store.read(scope)).available,false);
    await assert.rejects(store.save(scope,{...input,expectedRevision:1}),{code:'CHARACTER_CONFLICT'});
    await store.save(scope,{...input,characterVersion:'2',expectedRevision:1});
    db.exec("UPDATE official_character_publications SET status='stopped'");
    assert.equal((await store.read(scope)).available,false);
    await assert.rejects(store.save(scope,{...input,characterVersion:'2',expectedRevision:2}),{code:'CHARACTER_CONFLICT'});
    assert.equal((await store.read(scope)).revision,2);
  } finally {db.close();}
});
