import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fourPillarsJieCalendar} from '../src/four-pillars-jie-calendar.js';
import {calculateFourPillars as calc} from '../src/four-pillars-calculator.js';
const c=fourPillarsJieCalendar(2026);assert.equal(c.terms.length,36);
const spring=c.terms.find(t=>t.name==='立春'&&t.sourceCivil.startsWith('2026'));
// Notion 07 public NAOJ minute fixture: JST 05:02, tolerance 60 seconds.
const raw=readFileSync(new URL('../test-fixtures/four-pillars-jie-reference.json',import.meta.url));
const fixture=JSON.parse(raw);
assert(Math.abs(Date.parse(spring.instant)-Date.parse(fixture.expected.instant))<=fixture.expected.toleranceSeconds*1000);
console.log(JSON.stringify({id:fixture.id,input:fixture.input,expected:fixture.expected,actual:spring.instant,source:fixture.source,calendarVersion:c.calendarVersion,fixtureSha256:createHash('sha256').update(raw).digest('hex'),result:'PASS'}));
const run=time=>calc({date:'2026-02-04',time,referenceDate:'2026-11-17',standardClockConfirmed:true});
assert.equal(run('04:30:00').pillars.year,'乙巳');assert.equal(run('05:30:00').pillars.year,'丙午');
assert.notEqual(run('04:30:00').pillars.month,run('05:30:00').pillars.month);
assert.equal(run('04:30:00').pillars.day,run('05:30:00').pillars.day);
assert.throws(()=>fourPillarsJieCalendar(2101));
console.log('Jie UTC+8 to UTC adapter: NAOJ public-minute spring reference within 60s; JST year/month transition regression PASS. Other terms unverified.');
