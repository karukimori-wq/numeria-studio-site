import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let completion;
vm.runInNewContext(readFileSync('scripts/patch-legacy-static-assets.mjs','utf8').replace(/^import .*;\n/,'')+';capture(guardedCompletionBridge);',{
 readFileSync:()=>readFileSync('assets/numeria-app-Cckhajir.js','utf8'),writeFileSync(){},console:{log(){}},capture(value){completion=value;}
});
const snapshot={id:'saved_session',intro:'保持する本文',template:'original',drafts:{overview:'鑑定文'},reportTypography:{bodySize:14}};
const sent=[];
const finish=vm.runInNewContext('('+completion.slice('Gi='.length)+')',{
 tr:'user',G:null,j:'架空',M:'1990-01-02',F:null,P:'相談',lt:'',dt:'',Pe:'',pt:null,wr:null,l:'numerology',
 Fi:id=>({...snapshot,id}),Gt(){},window:{NumeriaAuthenticatedFetch:async(path,init)=>{
 if(path.includes('/status'))return {ok:true,json:async()=>({activeDraft:{id:'saved_session'}})};
 sent.push({path,body:JSON.parse(init.body)});return {ok:true,json:async()=>path.includes('/reports/export')?({status:'success',exportId:'rep_saved'}):({status:'success'})};
 }}
});
assert.deepEqual(JSON.parse(JSON.stringify(await finish('numerology','fallback'))),{appraisalId:'saved_session',exportId:'rep_saved'});
assert.equal(sent.length,2);
assert.equal(sent[0].path,'/api/appraisals/complete');
assert.deepEqual(JSON.parse(JSON.stringify(sent[0].body.snapshot)),snapshot);
assert.equal(sent[0].body.divination,'numerology');
assert.equal(sent[0].body.appraisalId,'saved_session');
assert.equal(sent[1].path,'/api/reports/export');
assert.equal(sent[1].body.appraisalId,'saved_session');
assert.equal(sent[1].body.format,'pdf');
assert.equal(sent[1].body.reportType,'basic');
console.log('Production PDF handler completes the Session and persists its Report export with the resolved Session ID (VM fixture).');
