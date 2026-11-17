import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import worker from "../src/worker.js";

import { withAstrologyCalculationCheckpoint as checkpoint, validateAstrologyCalculationCheckpoint as validate, saveAstrologyReadingDraft } from "../src/astrology-calculation-checkpoint.js";

// Run the Worker's real D1 SQL on SQLite. Identity and D1 transport are fixtures.
const directory = mkdtempSync(join(tmpdir(), "numeria-draft-cas-"));
function sql(query, args = [], script = false) {
  const result = spawnSync("python3", ["-c", `import sqlite3,json,sys
p=json.load(sys.stdin);c=sqlite3.connect(p['database']);c.row_factory=sqlite3.Row
if p['script']:
 c.executescript(p['query']);value=None
elif isinstance(p['query'],list):
 value=[]
 with c:
  for q in p['query']:
   cur=c.execute(q['query'],q['args']);value.append({'meta':{'changes':cur.rowcount}})
else:
 cur=c.execute(p['query'],p['args'])
 value=[dict(r) for r in cur.fetchall()] if cur.description else {'meta':{'changes':cur.rowcount}}
c.commit();print(json.dumps(value))
`], { input: JSON.stringify({ database: join(directory, "test.sqlite"), query, args, script }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
let waiting = [], holdReads = false, beforeWrite = null, failWrite = false;
const db = { async batch(statements) { return sql(statements.map(s => ({query:s.query,args:s.args}))); }, prepare(query) { return { query,
  args: [], bind(...args) { this.args = args; return this; },
  async first() {
    const row = sql(query, this.args)[0] || null;
    if (holdReads && query.includes("FROM usage_records")) await new Promise(resolve => {
      waiting.push(resolve);
      if (waiting.length === 2) { holdReads = false; for (const release of waiting) release(); waiting = []; }
    });
    return row;
  },
  async run() {
    if (query.includes("WHERE usage_records.active_draft_json IS ?")) {
      if (failWrite) throw new Error("fixture disk failure");
      if (beforeWrite) { const callback = beforeWrite; beforeWrite = null; callback(); }
    }
    return sql(query, this.args);
  },
}; } };
const env = { NUMERIA_DB: db, AUTH_ENFORCEMENT_MODE: "observe" };
async function api(path, body) {
  const response = await worker.fetch(new Request(`https://fixture.test${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Workspace-Id": "astrology_fixture_ws", "X-User-Id": "astrology_fixture_owner" },
    body: body ? JSON.stringify(body) : undefined,
  }), env, {});
  return { status: response.status, body: await response.json() };
}
const input={methodKey:'western-astrology',subjectId:'fictional-client',revision:1,birthDate:'2000-01-01',clockTime:'21:00:00',countryCode:'JP',zoneConfirmed:true,referenceDate:'2026-11-17',futureInput:{keep:true}};
const original={id:'astrology-fixture-session',divination:'western-astrology',selectedCustomerId:'fictional-client',name:'架空テスト',birthday:'2000-01-01',visitDate:'2026-11-17',theme:'架空の相談',status:'confirmed',publicationAllowed:true,astrologyInput:input,astrologyCalculation:{confirmed:true,publicationAllowed:true,planets:[999]},drafts:{body:'消さない本文'},futureField:{keep:['unknown',0]},numerologyCalculation:{keep:'unrelated field'}};
const before=JSON.stringify(original),captured=checkpoint(original);
assert.equal(captured.status,'draft');assert.equal(captured.publicationAllowed,false);
assert.equal(validate(captured).ok,true);assert.equal(JSON.stringify(original),before);
assert.deepEqual(captured.futureField,original.futureField);assert.deepEqual(captured.drafts,original.drafts);
assert.deepEqual(captured.numerologyCalculation,original.numerologyCalculation);
assert.equal(captured.astrologyCalculation.calculation.pages[1].data.sun.sign,'Capricorn');
for(const mutate of [s=>s.astrologyCalculation.calculation.pages[1].data.sun.longitudeDegrees=0,s=>s.astrologyCalculation.sessionId='other',s=>s.astrologyInput.clockTime='22:00:00',s=>s.selectedCustomerId='other',s=>s.status='confirmed',s=>s.publicationAllowed=true]){
 const forged=structuredClone(captured);mutate(forged);assert.equal(validate(forged).ok,false);
}
assert.equal(checkpoint({...original,astrologyInput:{...input,subjectId:'other'}}).astrologyCalculation.calculation.pages[1].reason,'SNAPSHOT_INPUT_SCOPE_MISMATCH');
const legacy={id:'legacy',divination:'western-astrology',drafts:{body:'旧本文'},future:{keep:true}};
assert.deepEqual(checkpoint(legacy),legacy);
const stale=checkpoint({...legacy,status:'completed',astrologyCalculation:captured.astrologyCalculation});
assert.equal(stale.status,'draft');assert(!('astrologyCalculation'in stale));assert.deepEqual(stale.drafts,legacy.drafts);
for(const divination of ['numerology','tarot','four-pillars'])assert.deepEqual(checkpoint({...original,divination}),{...original,divination});
const save=(snapshot,expectedDraftVersion)=>api('/api/appraisals/save-draft',{appraisalId:snapshot.id,expectedDraftVersion,clientName:snapshot.name,birthDate:snapshot.birthday,divination:snapshot.divination,question:snapshot.theme,snapshot});
try{
 for(const file of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort())sql(readFileSync(join('migrations',file),'utf8'),[],true);
 const saved=await save(original,null);assert.equal(saved.status,201);
 assert.equal(saved.body.activeDraft.snapshot.status,'draft');assert.equal(validate(saved.body.activeDraft.snapshot).ok,true);
 const persisted=JSON.parse(sql('SELECT active_draft_json FROM usage_records')[0].active_draft_json);
 for(const key of Object.keys(captured))assert.deepEqual(persisted.snapshot[key],captured[key],key);
 const restored=(await api('/api/appraisals/'+original.id)).body.session.snapshot;
 for(const key of Object.keys(persisted.snapshot))assert.deepEqual(restored[key],persisted.snapshot[key],key);
 assert.deepEqual(checkpoint(restored),restored);
 const mismatch=await api('/api/appraisals/save-draft',{appraisalId:original.id,expectedDraftVersion:persisted.draftVersion,birthDate:original.birthday,divination:'tarot',snapshot:original});
 assert.equal(mismatch.status,400);
 assert.equal((await save(original,'stale-version')).status,409);
 assert.deepEqual(JSON.parse(sql('SELECT active_draft_json FROM usage_records')[0].active_draft_json),persisted);
 const unknown={...restored,astrologyInput:{...input,clockTime:null}};
 const noTime=await save(unknown,persisted.draftVersion);assert.equal(noTime.status,201);
 assert.equal(noTime.body.activeDraft.snapshot.astrologyCalculation.calculation.pages[1].state,'required-missing');
 assert.equal(noTime.body.activeDraft.snapshot.astrologyCalculation.calculation.pages[1].data,null);
 assert.deepEqual(noTime.body.activeDraft.snapshot.drafts,original.drafts);
 const resumed=(await api('/api/appraisals/'+original.id)).body.session.snapshot;
 assert.equal(validate(resumed).ok,true);
 const {astrologyInput:oldInput,astrologyCalculation:oldCalculation,...legacyOnly}=restored;
 const legacySave=await save(legacyOnly,noTime.body.activeDraft.draftVersion);
 assert.equal(legacySave.status,201);assert(!legacySave.body.activeDraft.snapshot.astrologyCalculation);
 assert.deepEqual(legacySave.body.activeDraft.snapshot.futureField,original.futureField);
 const notesOnly=await api('/api/appraisals/save-draft',{appraisalId:original.id,expectedDraftVersion:legacySave.body.activeDraft.draftVersion,divination:'western-astrology',notes:'旧形式の本文更新'});
 assert.equal(notesOnly.status,201);assert.equal(notesOnly.body.activeDraft.notes,'旧形式の本文更新');
 assert.deepEqual(notesOnly.body.activeDraft.snapshot.drafts,original.drafts);
 const changedBirth=await api('/api/appraisals/save-draft',{appraisalId:original.id,expectedDraftVersion:notesOnly.body.activeDraft.draftVersion,divination:'western-astrology',birthDate:'2001-01-01'});
 assert.equal(changedBirth.status,400);
 const realFetcher=async(path,options)=>{const r=await api(path,JSON.parse(options.body));return{ok:r.status<400,status:r.status,json:async()=>r.body};};
 const ack=await saveAstrologyReadingDraft({snapshot:restored,expectedDraftVersion:notesOnly.body.activeDraft.draftVersion,fetcher:realFetcher});
 assert.equal(ack.ok,true);assert.deepEqual(ack.snapshot.futureField,original.futureField);
 assert.equal((await saveAstrologyReadingDraft({snapshot:restored,expectedDraftVersion:'old',fetcher:realFetcher})).code,'DRAFT_SAVE_CONFLICT');
 for(const change of [{draftId:'other'},{activeDraft:{...saved.body.activeDraft,id:'other'}},{activeDraft:{...saved.body.activeDraft,draftVersion:null}},{activeDraft:{...saved.body.activeDraft,snapshot:{...captured,astrologyCalculation:{}}}}]){
  const result=await saveAstrologyReadingDraft({snapshot:restored,fetcher:async()=>({ok:true,status:201,json:async()=>({...saved.body,...change})})});assert.equal(result.ok,false);
 }
 assert.equal((await saveAstrologyReadingDraft({snapshot:restored,fetcher:async()=>{throw Error('offline');}})).ok,false);
 const dropped={...saved.body,activeDraft:{...saved.body.activeDraft,snapshot:{...captured,futureField:undefined}}};
 assert.equal((await saveAstrologyReadingDraft({snapshot:restored,fetcher:async()=>({ok:true,status:201,json:async()=>dropped})})).code,'DRAFT_SAVE_CONTENT_MISMATCH');
 failWrite=true;
 const rowBefore=sql('SELECT active_draft_json FROM usage_records')[0].active_draft_json;
 await assert.rejects(()=>save(restored,ack.draftVersion),/fixture disk failure/);
 assert.equal(sql('SELECT active_draft_json FROM usage_records')[0].active_draft_json,rowBefore);
 const evidenceAt=process.argv.indexOf('--write-evidence');
 if(evidenceAt>=0)writeFileSync(process.argv[evidenceAt+1],JSON.stringify({executedAt:new Date().toISOString(),checkpointVersion:captured.astrologyCalculation.schemaVersion,calculatorVersion:captured.astrologyCalculation.calculation.calculationVersion,moduleSha256:createHash('sha256').update(readFileSync('src/astrology-calculation-checkpoint.js')).digest('hex'),workerSql:'Executed actual production Worker D1 SQL on local SQLite with migrations',checks:['recompute forged values/status','scope binding','SQL save and Session API restore','unknown fields/body retained','missing-time stale result invalidation','legacy no-key and snapshot-less notes update','CAS stale version 409','failed write preserves existing row','wrong ACK scope/version/content and offline rejected'],outcome:'PASS',authTransport:'fixture',liveD1Verified:false,browserVerified:false,pdfVerified:false,publicationAllowed:false},null,2)+'\n');
 console.log('Astrology checkpoint: production Worker/D1 SQL on local SQLite save -> Session restore PASS; CAS/stale/failed write, unknown fields/body, missing time, forged values, cross-method scope and client ACK/offline rejection PASS. Auth transport fixture; no live D1/browser acceptance.');
}finally{rmSync(directory,{recursive:true,force:true});}
