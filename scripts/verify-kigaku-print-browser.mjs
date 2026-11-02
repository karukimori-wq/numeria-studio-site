import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createKigakuReading} from '../src/kigaku-reading.js';
import {createKigakuReportSnapshot} from '../src/kigaku-report-snapshot.js';
import {renderKigakuReportHtml} from '../src/kigaku-report-print.js';
const clock={date:'1990-06-15',time:'12:34',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true};
const browser=await chromium.launch({headless:true});
await mkdir('tmp/kigaku-print',{recursive:true});
try {
 for(const commentEnabled of [true,false]) for(const format of ['standard','magazine']) {
  const reading=createKigakuReading({referenceInstant:'2026-10-24T12:00:00+09:00',birthClock:clock,partnerBirthClock:{...clock,date:'1993-08-15'},partnerName:'検証用の長い相手名'.repeat(15),loveRelationship:'交際相手',workRelationship:'同僚',familyRelationship:'子',workTheme:'job-change',directionPurpose:'travel',selectedDirection:'NE',commentEnabled,practitionerComment:'確認用コメント。'.repeat(300)});
  const report=await createKigakuReportSnapshot(reading,'pro','架空の検証対象者');
  assert.ok(report.pages.every(p=>p.state==='draft_preview'));
  const page=await browser.newPage({viewport:{width:1000,height:900}});
  const html=renderKigakuReportHtml(report,format);
  await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('article').count(),14);
  assert.equal(await page.locator('.pair-diagram').count(),4);
  assert.equal(await page.getByRole('heading',{name:'占い師のコメント',exact:true}).count(),commentEnabled?14:0);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('article,table,svg,figcaption')].filter(el=>el.getBoundingClientRect().right>document.documentElement.clientWidth+1).length);
  assert.equal(overflow,0,'Content overflows the viewport');
  const name=`${format}-comments-${commentEnabled?'on':'off'}`;
  await page.screenshot({path:`tmp/kigaku-print/${name}.png`,fullPage:true});
  await page.pdf({path:`tmp/kigaku-print/${name}.pdf`,preferCSSPageSize:true,printBackground:true});
  await writeFile(`tmp/kigaku-print/${name}.html`,html);
  await page.close();
 }
} finally {await browser.close();}
console.log('Four draft print fixtures generated. PDF page-by-page visual review remains required.');
