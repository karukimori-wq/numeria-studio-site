import worker from '../src/worker-entry.js';
// Actual React UI with mocked authentication/API; not production Clerk/D1 acceptance.
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm,readFile,readdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuReportSnapshot} from '../src/kigaku-report-snapshot.js';
import {renderKigakuReportHtml} from '../src/kigaku-report-print.js';
const runtimeFile=(await readdir('dist/assets')).find(name=>/^numeria-app-runtime-.*\.js$/.test(name));
assert.ok(runtimeFile,'Run npm run build before browser verification');
const runtime=await readFile('dist/assets/'+runtimeFile,'utf8');
const historyBranch=runtime.match(/if\(t\.snapshot\?\.schemaVersion===`numeria\.kigaku\.reading\.v1`\)\{[^}]+return\}/)?.[0];
assert.ok(historyBranch,'Built host history branch missing');
const listStart=runtime.indexOf('(0,Z.jsx)(`div`,{className:`history-list`');
const listEnd=runtime.indexOf(',(0,Z.jsxs)(`div`,{className:`repeat-action`',listStart);
assert.ok(listStart>=0&&listEnd>listStart,'Built profile history list missing');
const historyList=runtime.slice(listStart,listEnd);
const historyLabels=runtime.slice(runtime.indexOf('function qo('),runtime.indexOf('function Yo('));
const fixture='tmp/kigaku-ui';await mkdir(fixture,{recursive:true});
await writeFile(`${fixture}/index.html`,`<div id="root"></div><script type="module">
import React from 'react';import {createRoot} from 'react-dom/client';import * as JSX from 'react/jsx-runtime';
import {createKigakuReadingClient} from '/src/kigaku-reading-client.js';
import {createKigakuReadingComponent} from '/src/kigaku-reading-ui.js';
window.createKigakuReadingClient=createKigakuReadingClient;
window.Clerk={session:{getToken:async()=> 'fixture-token'}};
const Component=createKigakuReadingComponent(React);
const routeHistory=new Function('t','u','k','re',${JSON.stringify(historyBranch)});
const renderList=new Function('G','ar','tr','na','Y','Z','vi',${JSON.stringify(historyLabels+';return '+historyList)});
function Harness(){const [route,setRoute]=React.useState('profiles');
const open=(_,record)=>routeHistory(record,()=>{},setRoute,()=>{});
return route==='reading'?React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setRoute('profiles')},'カルテ一覧へ戻る'),React.createElement(Component)):renderList({id:'profile-fixture',history:[{id:'completed-fixture',date:'2026.10.24',theme:'検証用の完成九星履歴',status:'完成',divination:'nine-star-ki',snapshot:{schemaVersion:'numeria.kigaku.reading.v1'}}]},'pro','user',[{id:'nine-star-ki',name:'九星気学',symbol:'九'}],open,JSX,()=>{});}

createRoot(document.getElementById('root')).render(React.createElement(Harness));
</script>`);
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

const server=await createServer({server:{host:'127.0.0.1',port:4179,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});let saves=0;let savedDraft=null;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const payload=route.request().method()==='POST'?route.request().postDataJSON():{};
  const response=await request(path,route.request().method()==='POST'?payload:undefined);
  if(path==='/api/appraisals/save-draft') {
    saves++;assert.notEqual(payload.appraisalId,'completed-fixture');savedDraft=response.body.activeDraft;
  }
  await route.fulfill({status:response.status,json:response.body});
 });
 await page.goto('http://127.0.0.1:4179/tmp/kigaku-ui/index.html');
 await page.getByRole('button',{name:/検証用の完成九星履歴/}).click();
 await page.getByRole('heading',{name:'あなたの九星',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'下書きを保存',exact:true}).isDisabled(),true);
 const popupPromise=page.waitForEvent('popup');
 await page.getByRole('button',{name:'スタンダード A4草案／PDF',exact:true}).click();
 const popup=await popupPromise;await popup.getByText('未承認草案・確認用PDF／正式発行不可',{exact:true}).waitFor();
 assert.equal(await popup.locator('article').count(),14);await popup.close();
 await page.getByLabel('相談文',{exact:true}).fill('新しい相談');
 await page.evaluate(()=>{window.__leavePrompts=0;window.confirm=()=>{window.__leavePrompts++;return false;};});
 await page.getByRole('button',{name:'カルテ一覧へ戻る',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__leavePrompts),1,'Unsaved navigation must request confirmation');
 assert.equal(await page.getByLabel('相談文',{exact:true}).inputValue(),'新しい相談');
 assert.equal(await page.locator('.history-list').count(),0);
 assert.equal(await page.getByRole('button',{name:'スタンダード A4草案／PDF',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('article').count(),0);assert.equal(saves,0);
 await page.getByRole('button',{name:'入力内容で計算する',exact:true}).click();
 await page.getByRole('button',{name:'下書きを保存',exact:true}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='下書きを保存'&&!b.disabled));
 await page.getByRole('button',{name:'下書きを保存',exact:true}).click();
 await page.getByText('サーバーへの保存を確認しました',{exact:true}).waitFor();
 assert.equal(saves,1);assert.equal(savedDraft.snapshot.input.question,'新しい相談');
 assert.equal(report.reading.input.question,reading.input.question);
 const magazinePromise=page.waitForEvent('popup');
 await page.getByRole('button',{name:'マガジン A4草案／PDF',exact:true}).click();
 const magazine=await magazinePromise;await magazine.locator('body.magazine').waitFor();
 assert.equal(await magazine.locator('article').count(),14);await magazine.close();
 await page.screenshot({path:'tmp/kigaku-print/history-edit-mobile.png',fullPage:true});
 console.log('Real React mobile UI: completed history, disabled overwrite, print popup and edit invalidation passed through the real Worker with test JWT and mocked D1.');
}finally{globalThis.fetch=savedFetch;await browser.close();await server.close();await rm(fixture,{recursive:true,force:true});}
