import { Solar } from 'lunar-typescript';
import { countVisiblePillarElements } from './four-pillars-elements.js';
export const FOUR_PILLARS_CALCULATION_VERSION='ns.bazi.lunar-typescript-1.8.6.sect2.v1';
export function calculateFourPillars(input={}){
 input=input&&typeof input==='object'?input:{};
 const stop=(state,reason)=>({state,reason,pillars:null,publicationAllowed:false,verificationState:'review-required',calculationVersion:FOUR_PILLARS_CALCULATION_VERSION});
 if(input.standardClockConfirmed!==true)return stop('required-missing','NORMALIZED_JAPAN_STANDARD_CLOCK_REQUIRED');
 if(!input.time)return stop('required-missing','UNKNOWN_TIME_INTERVAL_ADAPTER_REQUIRED');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||!/^\d{4}-\d{2}-\d{2}$/.test(input.referenceDate||''))return stop('calculation-error','DATE_INVALID');
 const valid=d=>{const t=new Date(d+'T00:00:00Z');return Number.isFinite(t.getTime())&&t.toISOString().slice(0,10)===d;};
 if(!valid(input.date)||!valid(input.referenceDate)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))return stop('calculation-error','CLOCK_INVALID');
 if(input.date<'1901-01-01'||input.date>input.referenceDate||input.referenceDate>'2100-12-31')return stop('required-missing','DATE_OUT_OF_RANGE');
 try{
  const [y,m,d]=input.date.split('-').map(Number),[h,min]=input.time.split(':').map(Number);
  const eight=Solar.fromYmdHms(y,m,d,h,min,0).getLunar().getEightChar();eight.setSect(2);
  const pillars={year:eight.getYear(),month:eight.getMonth(),day:eight.getDay(),hour:eight.getTime()};
  return{state:'available',pillars,elements:countVisiblePillarElements(pillars),calculationVersion:FOUR_PILLARS_CALCULATION_VERSION,verificationState:'review-required',publicationAllowed:false};
 }catch{return stop('calculation-error','CALCULATOR_FAILED');}
}
