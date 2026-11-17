import {countVisiblePillarElements} from './four-pillars-elements.js';
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
const hidden={子:['癸',null,null],丑:['己','辛','癸'],寅:['甲','丙','戊'],卯:['乙',null,null],辰:['戊','癸','乙'],巳:['丙','庚','戊'],午:['丁','己',null],未:['己','乙','丁'],申:['庚','壬','戊'],酉:['辛',null,null],戌:['戊','丁','辛'],亥:['壬','甲',null]};
const starts='亥午寅酉寅酉巳子申卯';
const stages=['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'];
export function tenGod(dayStem,target){
 const a=stems.indexOf(dayStem),b=stems.indexOf(target);if(a<0||b<0)throw Error('STEM_INVALID');
 const relation=(Math.floor(b/2)-Math.floor(a/2)+5)%5,same=a%2===b%2;
 return[['比肩','劫財'],['食神','傷官'],['偏財','正財'],['偏官','正官'],['偏印','印綬']][relation][same?0:1];
}
export function twelveStage(dayStem,branch){
 const a=stems.indexOf(dayStem),b=branches.indexOf(branch);if(a<0||b<0)throw Error('STEM_BRANCH_INVALID');
 return stages[((b-branches.indexOf(starts[a]))*(a%2?-1:1)+12)%12];
}
export function pillarStructure(pillars){
 const checked=countVisiblePillarElements(pillars);if(checked.state!=='available')return null;
 const dayStem=pillars.day[0];
 return Object.fromEntries(checked.data.includedPillars.map(key=>{
  const [stem,branch]=pillars[key],h=hidden[branch];
  return[key,{stem,branch,tenGod:key==='day'?'日主':tenGod(dayStem,stem),twelveStage:twelveStage(dayStem,branch),hiddenStems:{main:h[0],middle:h[1],residual:h[2]}}];
 }));
}
