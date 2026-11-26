import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';
const source=readFileSync('src/secure-worker-entry.js','utf8').replace(/^import .*;\n/gm,'').replace('export default {','const worker = {');
let calls=0;
const context=vm.createContext({Request,Response,Headers,URL,reportPageDefinitionsFor,appWorker:{fetch:()=>{calls++;throw Error('No writes or usage bypass expected');}}});
vm.runInContext(source+'\nresolveSecureAdminAccess=async(_r,env)=>env.access;globalThis.entry=worker;',context);
for(const [access,status] of [[{verified:false,adminMode:true},401],[{verified:true,adminMode:false},403],[{verified:true,adminMode:true},200]]){
 const response=await context.entry.fetch(new Request('https://example.test/api/admin/four-pillars-draft-definitions',{headers:{'X-Admin-Email':'spoofed@example.test','X-Plan-Id':'business'}}),{access});
 assert.equal(response.status,status);const body=await response.json();
 if(status===200){assert.equal(body.definitions.length,14);assert.equal(body.previewOnly,true);assert.equal(body.publicationAllowed,false);assert.equal(body.subscriptionPlanUnaffected,true);assert.equal(response.headers.get('cache-control'),'no-store');}
 else assert.equal(body.definitions,undefined);
}
const refused=await context.entry.fetch(new Request('https://example.test/api/admin/four-pillars-draft-definitions',{method:'POST'}),{access:{verified:true,adminMode:true}});assert.equal(refused.status,405);assert.equal(calls,0);
const real=vm.createContext({Request,Response,Headers,URL,reportPageDefinitionsFor,appWorker:{fetch:async(request,env)=>{
 assert.equal(new URL(request.url).pathname,'/auth/status');
 return new Response(JSON.stringify({incomingRequestVerified:env.verified!==false,incomingRequestUserId:env.userId||'ordinary-user',incomingRequestEmail:env.email||'ordinary@example.test'}));
}}});
vm.runInContext(source+'\nglobalThis.entry=worker;',real);
const forged=new Request('https://example.test/api/admin/four-pillars-draft-definitions',{headers:{Authorization:'Bearer fixture','X-Numeria-Clerk-Client-Email':'admin@example.test','X-Admin-Email':'admin@example.test'}});
const ordinary=await real.entry.fetch(forged,{NUMERIA_ADMIN_EMAILS:'admin@example.test'});assert.equal(ordinary.status,403,'ordinary verified user must not gain admin from client email header');
for(const env of [{NUMERIA_ADMIN_USER_IDS:'ordinary-user'},{NUMERIA_ADMIN_EMAILS:'admin@example.test',email:'admin@example.test'}])assert.equal((await real.entry.fetch(forged,env)).status,200);
assert.equal((await real.entry.fetch(forged,{verified:false,NUMERIA_ADMIN_USER_IDS:'ordinary-user'})).status,401);
for(const verification of ['unverified','verified']){
 real.fetch=async()=>new Response(JSON.stringify({email_addresses:[{email_address:'admin@example.test',verification:{status:verification}}]}));
 assert.equal((await real.entry.fetch(forged,{NUMERIA_ADMIN_EMAILS:'admin@example.test',CLERK_SECRET_KEY:'fixture-secret'})).status,verification==='verified'?200:403);
}
console.log('Admin Four Pillars draft catalog: verified admin only, 401/403/405, 14 read-only definitions, no storage/usage call, no approval/contract promotion PASS.');
