import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';
import {reportResultReferenceFor} from '../src/report-result-references.js';

// Exercise the actual entrypoint against /api/usage's nested response contract.
const source=readFileSync('src/worker-entry.js','utf8').replace(/^import .*;\n/gm,'').replace('export default {','const worker = {');
const context=vm.createContext({Request,Response,Headers,URL,reportPageDefinitionsFor,reportResultReferenceFor,
 coreWorker:{fetch:async(_request,env)=>new Response(JSON.stringify(env.usageBody),{status:env.usageStatus||200})}});
vm.runInContext(source+'\nglobalThis.entry = worker; globalThis.resolveScope = resolveAuthenticatedScope;',context);
const request=new Request('https://example.test/api/report-page-definitions?methodKey=four-pillars',{headers:{'X-Admin-Email':'forged@example.test','X-Plan-Id':'pro'}});
for(const [plan,count] of [['free',5],['pro',14]]){
 const env={usageBody:{status:'success',workspaceId:'ws_personal',userId:'verified-user',usage:{planId:plan}}};
 const response=await context.entry.fetch(request,env),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.planId,plan,`nested ${plan} usage must determine catalog plan`);assert.equal(body.definitions.length,count);
 const {scope}=await context.resolveScope(request,env,null,'ws_personal');assert.equal(scope.planId,plan);
 const db={prepare:()=>({bind:()=>({first:async()=>null})})};
 const formatResponse=await context.entry.fetch(new Request('https://example.test/api/report-formats/default'),{...env,NUMERIA_DB:db});
 assert.equal(formatResponse.status,200);assert.equal((await formatResponse.json()).pageLimit,plan==='pro'?30:3);
}
for(const usageBody of [{planId:'pro',usage:{planId:'free'}},{planId:'pro'},{usage:{planId:'business'}},{usage:{planId:'invalid'}}]){
 const body=await(await context.entry.fetch(request,{usageBody})).json();assert.equal(body.planId,'free');assert.equal(body.definitions.length,5);
}
const denied=await context.entry.fetch(request,{usageStatus:401,usageBody:{errorCode:'AUTH_SESSION_REQUIRED'}});assert.equal(denied.status,401);
for(const [plan,count,expectedStatus] of [['free',3,200],['free',4,400],['pro',30,200],['pro',31,400]]){
 const backupFormat={schemaVersion:3,pages:Array.from({length:count},(_,i)=>({pageId:`free-${i}`,pageKind:'free',layoutRegions:[]}))};
 let writes=0;
 const state={app_settings:{report_format_blocks_v3_meta:{revision:1},report_format_blocks_v3_backups:[{backupId:'pro-backup',format:backupFormat}]}};
 const db={prepare:()=>({bind:()=>({first:async()=>({workspace_state_json:JSON.stringify(state)}),run:async()=>{writes++;return{success:true};}})})};
 const env={usageBody:{workspaceId:'ws_personal',userId:'verified-user',usage:{planId:plan}},NUMERIA_DB:db};
 const response=await context.entry.fetch(new Request('https://example.test/api/report-formats/default',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({backupId:'pro-backup',expectedRevision:1})}),env);
 assert.equal(response.status,expectedStatus,`${plan} restoration must obey current page limit`);assert.equal(writes,expectedStatus===200?1:0);
 if(expectedStatus===400)assert.equal((await response.json()).errorCode,'REPORT_FORMAT_PAGE_LIMIT_EXCEEDED');
}
console.log('Report scope: nested verified usage plan controls actual catalog; Free 5 / Pro 14, top-level/headers cannot elevate, unknown plan fails closed, auth failure retained PASS.');
