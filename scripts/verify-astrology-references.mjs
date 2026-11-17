import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildAstrologyPageData} from '../src/astrology-page-data.js';
const raw=readFileSync('test-fixtures/calendar-reference-cases.json');
const fixture=JSON.parse(raw),fixtureSha256=createHash('sha256').update(raw).digest('hex');
const input={methodKey:'western-astrology',subjectId:'jpl-fictional-fixture',birthDate:'2000-01-01',clockTime:'21:00:00',countryCode:'JP',zoneConfirmed:true,referenceDate:'2026-11-17'};
const result=buildAstrologyPageData(input),cases=[];
for(const item of fixture.cases.filter(c=>c.id.startsWith('JPL-'))){
 assert.equal(result.instantUTC.replace('.000Z','Z'),item.input.instant);
 const actual=result.pages[2].data.planets.find(p=>p.body===item.input.body);
 const delta=Math.abs(actual.longitudeDegrees-item.expected.longitudeDegrees);
 assert(Math.min(delta,360-delta)<=item.expected.toleranceDegrees,item.id);
 assert(Math.abs(actual.latitudeDegrees-item.expected.latitudeDegrees)<=item.expected.toleranceDegrees,item.id);
 cases.push({id:item.id,input:item.input,transportInput:input,expected:item.expected,actual,source:item.oracle,sourceVerificationStatus:item.verificationStatus,calculatorVersion:result.calculationVersion,adapterVersion:result.schemaVersion,fixtureSha256,result:'PASS'});
}
assert.equal(cases.length,6);
const report={main:'5d002e2818e2385f896f3a7243024c98488ddda7',cases,pageIndependentAccepted:0,publicationAllowed:false,limitations:['Six pre-existing independent JPL fixtures reused; no new live Horizons request','Four other planets, houses, axes, all-date coverage and full-page acceptance unverified','JSON roundtrip is not D1 or browser acceptance']};
const at=process.argv.indexOf('--write-evidence');
if(at>=0)writeFileSync(process.argv[at+1],JSON.stringify(report,null,2)+'\n');
console.log('Astrology birth-clock/page adapter: 6 recorded independent JPL longitude/latitude fixtures PASS; full-page acceptance remains 0.');
