import {parseYunInstant} from './four-pillars-yun-instant.js';

export const FOUR_PILLARS_YUN_START_VERSION='ns.bazi.yun-start.jst.year-month-day-hour.step-clamp.v1';
// Adopted by the user on 2026-11-18: add year, month, day, hour in that
// order; clamp the day separately at both the year and month steps.
// Calendar arithmetic uses Japan standard time (UTC+09:00), not the
// historical daylight civil clock and not fixed-duration 365-day years.
export function calculateYunStart({birthInstant,offset}={}){
 const stop=(state,reason)=>({state,reason,data:null,calculationVersion:FOUR_PILLARS_YUN_START_VERSION,publicationAllowed:false});
 try{
  const birth=parseYunInstant(birthInstant);
  const keys=['years','months','days','hours'];
  if(!offset||typeof offset!=='object'||Array.isArray(offset)||Object.keys(offset).some(key=>!keys.includes(key))||keys.some(key=>!Number.isSafeInteger(offset[key])||offset[key]<0)||offset.years>10||offset.months>11||offset.days>29||offset.hours>22||offset.hours%2) return stop('calculation-error','YUN_OFFSET_INVALID');
  let standard=new Date(birth+9*3600000);
  if(standard.toISOString().slice(0,10)<'1901-01-01'||standard.toISOString().slice(0,10)>'2100-12-31')return stop('required-missing','BIRTH_STANDARD_DATE_OUT_OF_RANGE');
  const steps=[];
  const calendarStep=(unit,amount)=>{
   const from=standard.toISOString().slice(0,19);
   const target=new Date(Date.UTC(standard.getUTCFullYear()+(unit==='years'?amount:0),standard.getUTCMonth()+(unit==='months'?amount:0),1,standard.getUTCHours(),standard.getUTCMinutes(),standard.getUTCSeconds()));
   const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
   const day=Math.min(standard.getUTCDate(),lastDay),clamped=day!==standard.getUTCDate();target.setUTCDate(day);standard=target;
   steps.push({unit,amount,from,to:standard.toISOString().slice(0,19),clamped});
  };
  calendarStep('years',offset.years);calendarStep('months',offset.months);
  for(const unit of ['days','hours']){
   const from=standard.toISOString().slice(0,19);
   if(unit==='days')standard.setUTCDate(standard.getUTCDate()+offset.days);else standard.setUTCHours(standard.getUTCHours()+offset.hours);
   steps.push({unit,amount:offset[unit],from,to:standard.toISOString().slice(0,19),clamped:false});
  }
  const standardDateTime=standard.toISOString().slice(0,19)+'+09:00';
  if(standardDateTime.slice(0,10)>'2100-12-31')return stop('required-missing','YUN_START_DATE_OUT_OF_RANGE');
  return{state:'available',reason:null,calculationVersion:FOUR_PILLARS_YUN_START_VERSION,birthInstant,offset:{...offset},standardOffsetMinutes:540,startInstant:new Date(standard.getTime()-9*3600000).toISOString(),standardDateTime,steps,verificationState:'review-required',publicationAllowed:false};
 }catch(error){return stop('calculation-error',error.message);}
}
