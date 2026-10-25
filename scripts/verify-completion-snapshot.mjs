import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let completion;
vm.runInNewContext(readFileSync('scripts/patch-legacy-static-assets.mjs','utf8').replace(/^import .*;\n/,'')+';capture(guardedCompletionBridge);',{
 readFileSync:()=>readFileSync('assets/numeria-app-Cckhajir.js','utf8'),writeFileSync(){},console:{log(){}},capture(value){completion=value;}
});
const snapshot={id:'saved_session',intro:'保持する本文',template:'original',drafts:{overview:'鑑定文'},reportTypography:{bodySize:14}};
let sent;
const finish=vm.runInNewContext('('+completion.slice('Gi='.length)+')',{
 tr:'user',G:null,j:'架空',M:'1990-01-02',F:null,P:'相談',lt:'',dt:'',Pe:'',pt:null,wr:null,l:'numerology',
 Fi:id=>({...snapshot,id}),Gt(){},window:{NumeriaAuthenticatedFetch:async(path,init)=>{
 if(path.includes('/status'))return {ok:true,json:async()=>({activeDraft:{id:'saved_session'}})};
 sent=JSON.parse(init.body);return {ok:true,json:async()=>({status:'success'})};
 }}
});
assert.equal(await finish('numerology','fallback'),true);
assert.deepEqual(JSON.parse(JSON.stringify(sent.snapshot)),snapshot);
assert.equal(sent.divination,'numerology');
assert.equal(sent.appraisalId,'saved_session');
console.log('Production completion handler sends the editable snapshot and divination for the resolved Session ID (VM fixture).');
