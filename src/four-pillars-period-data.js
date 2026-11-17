import {Solar} from 'lunar-typescript';
import {fourPillarsJieCalendar} from './four-pillars-jie-calendar.js';
import {createDayunSchedule,FOUR_PILLARS_DAYUN_VERSION,FOUR_PILLARS_DAYUN_POLICY} from './four-pillars-dayun.js';
import {pillarTenGod} from './four-pillars-fixed-tables.js';
import {addJapanStandardCalendar} from './four-pillars-calendar-addition.js';
import {parseYunInstant} from './four-pillars-yun-instant.js';

const stop=(state,reason)=>({state,reason,data:null,publicationAllowed:false});
const available=data=>({state:'available',reason:null,data,publicationAllowed:false});
function solarYear(year,dayStem,schedule){
 if(year<1901||year+1>2100)return stop('required-missing','SOLAR_YEAR_OUT_OF_RANGE');
 const terms=fourPillarsJieCalendar(year).terms;
 const spring=value=>terms.find(term=>term.name==='立春'&&term.sourceCivil.startsWith(String(value)));
 const start=spring(year),end=spring(year+1);
 if(!start||!end)return stop('required-missing','SOLAR_YEAR_COVERAGE_REQUIRED');
 const standard=instant=>new Date(parseYunInstant(instant)+9*3600000).toISOString().slice(0,19)+'+09:00';
 const spans=schedule.covering(start.instant,end.instant);if(spans.state!=='available')return spans;
 const ganzhi=Solar.fromYmd(year,7,1).getLunar().getEightChar().getYear();
 return available({id:`bazi-solar-year-${year}`,year,ganzhi,stem:ganzhi[0],branch:ganzhi[1],dayStem,stemTenGod:pillarTenGod(dayStem,ganzhi[0]),startInstant:start.instant,endExclusiveInstant:end.instant,startStandard:standard(start.instant),endExclusiveStandard:standard(end.instant),calendarVersion:fourPillarsJieCalendar(year).calendarVersion,correspondingDayun:spans.data});
}
function fullAgeAt(birthInstant,boundary){
 const birth=new Date(parseYunInstant(birthInstant)+9*3600000),target=new Date(parseYunInstant(boundary)+9*3600000);
 let years=target.getUTCFullYear()-birth.getUTCFullYear();
 const anniversary=addJapanStandardCalendar(birthInstant,{years});
 if(parseYunInstant(anniversary.startInstant)>parseYunInstant(boundary))years--;
 return{fullYears:years,basis:'japan-standard-calendar-anniversary-step-clamp',birthInstant,boundaryInstant:boundary};
}
export function buildFourPillarsPeriodData({pillars,yun,referenceDate,policy=FOUR_PILLARS_DAYUN_POLICY}={}){
 const result={calculationVersion:FOUR_PILLARS_DAYUN_VERSION,policy:policy?{...policy}:null,publicationAllowed:false,pages:{}};
 const assignAll=value=>{for(const id of ['BAZ-06','BAZ-07','BAZ-13','BAZ-14'])result.pages[id]=value;return result;};
 const schedule=createDayunSchedule({monthPillar:pillars?.month,dayStem:pillars?.day?.[0],yun,policy});
 if(schedule.state!=='available')return assignAll(schedule);
 result.pages['BAZ-06']=schedule.table;
 try{
  if(typeof referenceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)||referenceDate<'1901-01-01'||referenceDate>'2100-12-31')throw Error('REFERENCE_DATE_INVALID');
  const begin=`${referenceDate}T00:00:00+09:00`,end=`${referenceDate}T23:59:59+09:00`;
  parseYunInstant(begin);parseYunInstant(end);
  const first=schedule.at(begin),last=schedule.at(end);
  let current=first.state!=='available'?first:last.state!=='available'?last:first.data.id!==last.data.id?stop('required-missing','REFERENCE_DAYUN_BOUNDARY_TIME_REQUIRED'):first;
  const spring=fourPillarsJieCalendar(Number(referenceDate.slice(0,4))).terms.find(term=>term.name==='立春'&&term.sourceCivil.startsWith(referenceDate.slice(0,4)));
  const springMs=parseYunInstant(spring.instant),startMs=parseYunInstant(begin),endMs=parseYunInstant(end);
  let annual;
  if(springMs>startMs&&springMs<=endMs)annual=stop('required-missing','REFERENCE_SOLAR_YEAR_BOUNDARY_TIME_REQUIRED');
  else{
   const year=Number(referenceDate.slice(0,4))-(endMs<springMs?1:0);
   annual=solarYear(year,pillars.day[0],schedule);
   const nextAnnual=solarYear(year+1,pillars.day[0],schedule);
   result.pages['BAZ-13']=annual.state!=='available'?annual:nextAnnual.state!=='available'?nextAnnual:available({referenceDate,years:[annual.data,nextAnnual.data]});
  }
  if(!result.pages['BAZ-13'])result.pages['BAZ-13']=annual;
  result.pages['BAZ-07']=current.state!=='available'?current:annual.state!=='available'?annual:available({referenceDate,currentDayun:current.data,annual:annual.data});
  if(current.state!=='available')result.pages['BAZ-14']=current;
  else{
   const next=schedule.interval(current.data.index);
   result.pages['BAZ-14']=next.state!=='available'?next:available({referenceDate,currentDayun:current.data,nextDayun:next.data,boundaryInstant:next.data.startInstant,boundaryStandard:next.data.startStandard,age:fullAgeAt(yun.start.birthInstant,next.data.startInstant)});
  }
 }catch(error){for(const id of ['BAZ-07','BAZ-13','BAZ-14'])result.pages[id]=stop('calculation-error',error.message);}
 return result;
}
