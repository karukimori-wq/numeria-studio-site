import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tenGod,twelveStage,pillarStructure} from '../src/four-pillars-structure.js';
const rows=JSON.parse(readFileSync('test-fixtures/four-pillars-ten-gods.json','utf8'));
assert.equal(rows.length,10);const stems='甲乙丙丁戊己庚辛壬癸';let count=0;
for(const [day,...expected] of rows)for(let i=0;i<10;i++){assert.equal(tenGod(day,stems[i]),expected[i]);count++;}
const starts='亥午寅酉寅酉巳子申卯';for(let i=0;i<10;i++)assert.equal(twelveStage(stems[i],starts[i]),'長生');
assert.equal(twelveStage('乙','巳'),'沐浴');assert.equal(twelveStage('甲','子'),'沐浴');
const r=pillarStructure({year:'甲子',month:'乙丑',day:'丙寅',hour:null});
assert.equal(r.day.tenGod,'日主');assert.equal(r.hour,undefined);assert.deepEqual(r.month.hiddenStems,{main:'己',middle:'辛',residual:'癸'});
assert.equal(pillarStructure({year:'甲丑',month:'乙丑',day:'丙寅'}),null);
console.log(`Notion fixed table ${count}/100 ten-god cases PASS; twelve-stage starts/directions, explicit hidden-stem roles, unknown hour and day-master handling PASS.`);
