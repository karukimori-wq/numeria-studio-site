import assert from 'node:assert/strict';
import {Solar,LunarUtil} from 'lunar-typescript';
import {twelveStage,pillarStructure} from '../src/four-pillars-structure.js';
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
let cases=0;
for(let i=0;i<10;i++){
 const date=new Date(Date.UTC(2000,0,7+i));
 const e=Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),12,0,0).getLunar().getEightChar();e.setSect(2);
 assert.equal(e.getDayGan(),stems[i]);
 for(let j=0;j<12;j++){const expected=e.getDiShi(j).replace('临官','建禄').replace('冠带','冠帯').replace('长生','長生').replace('绝','絶').replace('养','養');assert.equal(twelveStage(stems[i],branches[j]),expected);cases++;}
}
for(let i=0;i<12;i++){
 const branch=branches[i],stem=stems[i%2];
 const actual=pillarStructure({year:stem+branch,month:'乙丑',day:'丙寅'}).year.hiddenStems;
 assert.deepEqual(Object.values(actual).filter(Boolean).sort(),[...LunarUtil.ZHI_HIDE_GAN[branch]].sort());
}
console.log(`Fixed-library compatibility: ${cases}/120 twelve stages and 12/12 hidden-stem sets PASS; not independent natal-chart verification.`);
