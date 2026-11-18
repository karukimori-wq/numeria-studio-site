// Full authenticated host component, with fixture identity/workspace bridges.
// This does not verify the outer Clerk login/boot wrapper or real D1.
import assert from 'node:assert/strict';
import worker from '../src/worker-entry.js';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {readFile,readdir,writeFile,rm,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const reading=createKigakuReading({referenceInstant:'2026-10-24T12:00:00+09:00',birthClock:{date:'1990-06-15',time:'12:34',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true}});
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey); jwk.kid = 'test-kigaku';
const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${base64({ alg: 'RS256', kid: jwk.kid })}.${base64({ sub: 'kigaku-user', exp: Math.floor(Date.now()/1000)+300 })}`;
const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(unsigned));
const token = `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
const savedFetch = globalThis.fetch;
globalThis.fetch = async url => { assert.equal(String(url), 'https://clerk.test/kigaku-jwks'); return Response.json({ keys: [jwk] }); };
const rows = new Map();
const db = { prepare(sql) { let args; return { bind(...values) { args = values; return this; }, async first() { return rows.get(args[0]) ?? null; }, async run() { assert.match(sql, /INSERT INTO usage_records/); rows.set(args[0], { plan_id: args[4], monthly_appraisals: args[5], appraisal_clients: args[6], in_progress_appraisals: args[7], appraisal_client_profiles_json: args[8], active_draft_json: args[9], completed_appraisal_ids_json: args[10], completed_appraisals_json: args[11], report_exports_json: args[12], billing_month: args[3] }); return { success: true }; } }; } };
const env = { CLERK_JWKS_URL: 'https://clerk.test/kigaku-jwks', NUMERIA_DB: db };
async function request(path, body, authorized = true) {
  const response = await worker.fetch(new Request(`https://local.test${path}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(authorized ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  return { status: response.status, body: await response.json() };
}
const seed=await request('/api/appraisals/save-draft',{appraisalId:'completed-fixture',snapshot:reading,clientName:'検証用'});
assert.equal(seed.status,201);[...rows.values()][0].plan_id='pro';
const finished=await request('/api/appraisals/complete',{appraisalId:'completed-fixture'});assert.equal(finished.status,201);
const report=finished.body.appraisal.reportSnapshot;

const profile={id:'fixture-profile',name:'通し検査の相談者',birthday:'1990-06-15',history:[{id:'completed-fixture',date:'2026.10.24',theme:'完成した九星の通し検査',status:'完成',divination:'nine-star-ki',snapshot:reading}],profile:'検証用',status:'完成'};
const assets='dist/assets';
const file=(await readdir(assets)).find(n=>/^numeria-app-runtime-.*\.js$/.test(n));
assert.ok(file,'Build first');
const testModule=assets+'/kigaku-host-fixture.js';
await writeFile(testModule,(await readFile(assets+'/'+file,'utf8'))+'\nexport {us as FixtureHost,i as FixtureReact};');
await mkdir('tmp/kigaku-host',{recursive:true});
await writeFile('tmp/kigaku-host/index.html',`<meta charset="utf-8"><div id="root"></div><script type="module">
import {FixtureHost,FixtureReact as React} from '/dist/assets/kigaku-host-fixture.js';
import {t as domFactory} from '/dist/assets/framework-client-7951bef0cc41.js';
localStorage.setItem('numeria-onboarding-seen:fixture%40example.test','1');
localStorage.setItem('numeria-appraisal-profile-history:fixture%40example.test',JSON.stringify(${JSON.stringify([profile])}));
window.Clerk={user:{id:'fixture-user'},session:{getToken:async()=> 'fixture-token'}};
window.NumeriaAccessContextLoad=async()=>({data:{role:'user',plan:'pro',actualPlan:'pro'},error:null});
window.NumeriaUserPreferencesLoad=async()=>({data:{primary_divination:'nine-star-ki',enabled_divinations:['nine-star-ki']},error:null});
window.NumeriaD1WorkspaceLoad=async()=>({data:{appraisal_profiles:${JSON.stringify([profile])},saved_presets:[],feedback_items:[],app_settings:{}},error:null});
window.NumeriaD1WorkspaceSave=async data=>({data,error:null});
domFactory().createRoot(document.getElementById('root')).render(React.createElement(FixtureHost,{user:{displayName:'検証者',email:'fixture@example.test',primaryDivination:'nine-star-ki'},userId:'fixture-user',onSignOut:()=>{}}));
</script>`);
const server=createServer(async(req,res)=>{try{const path=resolve('.'+new URL(req.url,'http://localhost').pathname);assert.ok(path.startsWith(process.cwd()+'/'));const data=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(4181,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>console.error('Host page error:',e.message));
 page.on('console',m=>{if(m.type()==='error')console.error('Browser:',m.text());});
 let historyReads=0,saves=0;
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/kigaku/report-history'){historyReads++;assert.equal(route.request().postDataJSON().appraisalId,'completed-fixture');}if(path==='/api/appraisals/save-draft')saves++;const result=await request(path,route.request().method()==='POST'?route.request().postDataJSON():undefined);await route.fulfill({status:result.status,json:result.body});});
 await page.goto('http://127.0.0.1:4181/tmp/kigaku-host/index.html');
 await page.getByText('クラウド同期済み',{exact:true}).waitFor({timeout:15000});
 await page.getByRole('button',{name:/鑑定カルテ$/}).first().click({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().waitFor({timeout:15000});
 await page.getByText('通し検査の相談者',{exact:true}).first().click();
 await page.getByRole('heading',{name:'鑑定履歴・鑑定書',exact:true}).waitFor({timeout:15000});
 await page.screenshot({path:'tmp/kigaku-print/host-profile-mobile.png',fullPage:true});
 await page.getByRole('button',{name:/完成した九星の通し検査/}).click();
 await page.getByRole('heading',{name:'あなたの九星',exact:true}).waitFor({timeout:15000});
 assert.equal(historyReads,1);assert.equal(await page.getByRole('button',{name:'下書きを保存',exact:true}).isDisabled(),true);
 for(const name of ['スタンダード A4草案／PDF','マガジン A4草案／PDF']){const pending=page.waitForEvent('popup');await page.getByRole('button',{name,exact:true}).click();const popup=await pending;await popup.locator('article').first().waitFor();assert.equal(await popup.locator('article').count(),14);await popup.close();}
 await page.getByLabel(/^相談文/).fill('ホストで未保存の相談');
 page.once('dialog',async d=>{assert.equal(d.type(),'confirm');await d.dismiss();});
 await page.getByRole('button',{name:/鑑定カルテ$/}).first().click();
 assert.equal(await page.getByLabel(/^相談文/).inputValue(),'ホストで未保存の相談');assert.equal(saves,0);
 await page.screenshot({path:'tmp/kigaku-print/host-restored-mobile.png',fullPage:true});
 console.log('Full authenticated host: fixture workspace loaded, profile list selected, history section opened. Outer login is not covered.');
}catch(error){for(const page of browser.contexts().flatMap(c=>c.pages())){console.error('Host visible text:',(await page.locator('body').innerText()).slice(0,8000));await page.screenshot({path:'tmp/kigaku-print/host-failure.png',fullPage:true});}throw error;}finally{globalThis.fetch=savedFetch;await browser.close();await new Promise(r=>server.close(r));await rm(testModule,{force:true});await rm('tmp/kigaku-host',{recursive:true,force:true});}
