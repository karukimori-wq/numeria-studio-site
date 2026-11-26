import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Seasons} from 'astronomy-engine';
import {kigakuSolarTerms,KIGAKU_SOLAR_VERSION} from '../src/kigaku-solar-calendar.js';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const cases=JSON.parse(readFileSync('test-fixtures/kigaku-reference-cases.json','utf8'));
const results=cases.map(c=>{
 const actual=c.input.event==='lichun'?kigakuSolarTerms(c.input.year)[0].instant:Seasons(c.input.year)[c.input.event==='summer'?'jun_solstice':'dec_solstice'].date.toISOString();
 const errorSeconds=Math.abs(Date.parse(actual)-Date.parse(c.expected.publicMinute))/1000;
 const passed=errorSeconds<=c.expected.toleranceSeconds;
 assert(passed,`${c.id}: ${errorSeconds}`);
 return {...c,actual,errorSeconds,calculatorVersion:KIGAKU_SOLAR_VERSION,dependency:'astronomy-engine@2.1.19',passed};
});
if(process.argv.includes('--record')) writeFileSync('docs/block-editor/evidence/kigaku-reference-run-2026-11-08.json',JSON.stringify({scope:'3 public-minute solar/solstice references copied from Notion; no page, natal-star or full calendar acceptance',fixtureSHA256:hash('test-fixtures/kigaku-reference-cases.json'),moduleSHA256:hash('src/kigaku-solar-calendar.js'),results},null,2)+'\n');
console.log('Kigaku independent references: 3 PASS (public minute ±60s); 0 page acceptances.');
