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
 const page=await browser.newPage({viewport:{width:390,height:844}});let saves=0;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const body=path==='/api/usage'?{usage:{activeDraft:null}}:path==='/api/kigaku/report-history'?{appraisal:{id:'completed-fixture',snapshot:reading,reportSnapshot:report}}:path==='/api/kigaku/report-print'?{html:renderKigakuReportHtml(report,'standard')}:{};
  if(path==='/api/appraisals/save-draft')saves++;
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
 await page.screenshot({path:'tmp/kigaku-print/history-edit-mobile.png',fullPage:true});
 console.log('Real React mobile UI: completed history, disabled overwrite, print popup and edit invalidation passed with mocked API.');
}finally{await browser.close();await server.close();await rm(fixture,{recursive:true,force:true});}
