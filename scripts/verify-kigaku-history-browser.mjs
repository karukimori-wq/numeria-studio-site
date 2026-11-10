// Actual React UI with mocked authentication/API; not production Clerk/D1 acceptance.
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuReportSnapshot} from '../src/kigaku-report-snapshot.js';
import {renderKigakuReportHtml} from '../src/kigaku-report-print.js';
const fixture='tmp/kigaku-ui';await mkdir(fixture,{recursive:true});
await writeFile(`${fixture}/index.html`,`<div id="root"></div><script type="module">
import React from 'react';import {createRoot} from 'react-dom/client';
import {createKigakuReadingClient} from '/src/kigaku-reading-client.js';
import {createKigakuReadingComponent} from '/src/kigaku-reading-ui.js';
window.createKigakuReadingClient=createKigakuReadingClient;
window.Clerk={session:{getToken:async()=> 'fixture-token'}};
window.NumeriaKigakuPendingRestore='completed-fixture';
createRoot(document.getElementById('root')).render(React.createElement(createKigakuReadingComponent(React)));
</script>`);
const reading=createKigakuReading({referenceInstant:'2026-10-24T12:00:00+09:00',birthClock:{date:'1990-06-15',time:'12:34',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true}});
const report=await createKigakuReportSnapshot(reading,'pro','検証用');
const server=await createServer({server:{host:'127.0.0.1',port:4179,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});let saves=0;let savedDraft=null;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const payload=route.request().method()==='POST'?route.request().postDataJSON():{};
  let body=path==='/api/usage'?{usage:{activeDraft:null}}:path==='/api/kigaku/report-history'?{appraisal:{id:'completed-fixture',snapshot:reading,reportSnapshot:report}}:{};
  if(path==='/api/kigaku/calculate')body={reading:createKigakuReading(payload.input)};
  if(path==='/api/appraisals/save-draft'){
    saves++;assert.notEqual(payload.appraisalId,'completed-fixture');
    savedDraft={id:payload.appraisalId,snapshot:payload.snapshot,reportSnapshot:await createKigakuReportSnapshot(payload.snapshot,'pro','検証用')};
    body={draftId:payload.appraisalId,activeDraft:savedDraft};
  }
  if(path==='/api/kigaku/report-print')body={html:renderKigakuReportHtml(payload.draftId==='completed-fixture'?report:savedDraft.reportSnapshot,payload.format)};
  await route.fulfill({json:body});
 });
 await page.goto('http://127.0.0.1:4179/tmp/kigaku-ui/index.html');
 await page.getByRole('heading',{name:'あなたの九星',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'下書きを保存',exact:true}).isDisabled(),true);
 const popupPromise=page.waitForEvent('popup');
 await page.getByRole('button',{name:'スタンダード A4草案／PDF',exact:true}).click();
 const popup=await popupPromise;await popup.getByText('未承認草案・確認用PDF／正式発行不可',{exact:true}).waitFor();
 assert.equal(await popup.locator('article').count(),14);await popup.close();
 await page.getByLabel('相談文',{exact:true}).fill('新しい相談');
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
 console.log('Real React mobile UI: completed history, disabled overwrite, print popup and edit invalidation passed with mocked API.');
}finally{await browser.close();await server.close();await rm(fixture,{recursive:true,force:true});}
