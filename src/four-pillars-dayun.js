import {addJapanStandardCalendar} from './four-pillars-calendar-addition.js';
import {parseYunInstant} from './four-pillars-yun-instant.js';
import {pillarTenGod} from './four-pillars-fixed-tables.js';

export const FOUR_PILLARS_DAYUN_POLICY=Object.freeze({intervalCount:10,boundaryBasis:'initial-start',policyVersion:'ns.bazi.dayun-policy.user-2026-11-18.v1'});
export const FOUR_PILLARS_DAYUN_VERSION='ns.bazi.dayun.jst.ten-year-exclusive-end.v1';
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
const cycle=Array.from({length:60},(_,i)=>stems[i%10]+branches[i%12]);
const stop=(state,reason)=>({state,reason,data:null,publicationAllowed:false});
export function createDayunSchedule({monthPillar,dayStem,yun,policy}={}){
 if(policy?.intervalCount!==10||policy?.boundaryBasis!=='initial-start'||policy?.policyVersion!==FOUR_PILLARS_DAYUN_POLICY.policyVersion)return stop('unconnected','DAYUN_POLICY_REQUIRED');
 if(yun?.state!=='available'||yun.start?.state!=='available')return stop(yun?.state==='calculation-error'||yun?.start?.state==='calculation-error'?'calculation-error':'required-missing',yun?.reason||yun?.start?.reason||'YUN_START_REQUIRED');
 const month=cycle.indexOf(monthPillar);
 if(month<0||typeof dayStem!=='string'||!stems.includes(dayStem)||dayStem.length!==1||!['forward','backward'].includes(yun.direction))return stop('calculation-error','DAYUN_NATAL_INPUT_INVALID');
 try{
  parseYunInstant(yun.start.startInstant);
  const boundaries=new Map([[0,addJapanStandardCalendar(yun.start.startInstant,{})]]);
  const boundary=index=>{
   if(!boundaries.has(index)){
    boundaries.set(index,addJapanStandardCalendar(boundaries.get(0).startInstant,{years:10*index}));
   }
   return boundaries.get(index);
  };
  const interval=index=>{
   if(!Number.isInteger(index)||index<0||index>20)return stop('required-missing','DAYUN_INDEX_OUT_OF_RANGE');
   const begin=boundary(index),end=boundary(index+1);
   if(begin.standardDateTime.slice(0,10)<'1901-01-01'||end.standardDateTime.slice(0,10)>'2100-12-31')return stop('required-missing','DAYUN_INTERVAL_OUT_OF_RANGE');
   const ganzhi=cycle[((month+(yun.direction==='forward'?1:-1)*(index+1))%60+60)%60];
   return{state:'available',reason:null,data:{id:`bazi-dayun-${index+1}`,index:index+1,ganzhi,stem:ganzhi[0],branch:ganzhi[1],stemTenGod:pillarTenGod(dayStem,ganzhi[0]),dayStem,startInstant:begin.startInstant,endExclusiveInstant:end.startInstant,startStandard:begin.standardDateTime,endExclusiveStandard:end.standardDateTime,calculationVersion:FOUR_PILLARS_DAYUN_VERSION,policy:{...policy}},publicationAllowed:false};
  };
  const at=instant=>{
   const timestamp=parseYunInstant(instant);
   if(timestamp<parseYunInstant(yun.start.startInstant))return stop('required-missing','REFERENCE_BEFORE_YUN_START');
   for(let index=0;index<=20;index++){
    const item=interval(index);if(item.state!=='available')return item;
    if(timestamp>=parseYunInstant(item.data.startInstant)&&timestamp<parseYunInstant(item.data.endExclusiveInstant))return item;
   }
   return stop('required-missing','DAYUN_INTERVAL_OUT_OF_RANGE');
  };
  const covering=(start,end)=>{
   if(parseYunInstant(end)<=parseYunInstant(start))return stop('calculation-error','DAYUN_COVERAGE_INTERVAL_INVALID');
   const first=at(start);if(first.state!=='available')return first;
   const intervals=[],endMs=parseYunInstant(end);let cursor=parseYunInstant(start),index=first.data.index-1;
   while(cursor<endMs){
    const item=interval(index++);if(item.state!=='available')return item;
    intervals.push(item.data);cursor=parseYunInstant(item.data.endExclusiveInstant);
   }
   return{state:'available',reason:null,data:intervals,publicationAllowed:false};
  };
  const listed=Array.from({length:policy.intervalCount},(_,index)=>interval(index));
  const failed=listed.find(item=>item.state!=='available');
  const table=failed||{state:'available',reason:null,data:{yunStart:yun.start,policy:{...policy},intervals:listed.map(item=>item.data)},publicationAllowed:false};
  return{state:'available',reason:null,table,interval,at,covering,calculationVersion:FOUR_PILLARS_DAYUN_VERSION,publicationAllowed:false};
 }catch(error){return stop('calculation-error',error.message);}
}
