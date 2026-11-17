import {parseYunInstant as instant} from './four-pillars-yun-instant.js';
export const FOUR_PILLARS_YUN_OFFSET_VERSION='ns.bazi.yun-offset.floor-total-minutes.v1';

// Adopted decision 86 only. Caller must supply the correctly selected solar term.
// No gender/direction choice, calendar addition, start date or DaYun is inferred here.
export function calculateYunOffset({birthInstant,solarTermInstant}={}){
 try{
  const birth=instant(birthInstant),term=instant(solarTermInstant);
  const differenceSeconds=Math.abs(term-birth)/1000,totalMinutes=Math.floor(differenceSeconds/60);
  let remaining=totalMinutes;
  const years=Math.floor(remaining/4320);remaining%=4320;
  const months=Math.floor(remaining/360);remaining%=360;
  const days=Math.floor(remaining/12);remaining%=12;
  return{state:'available',calculationVersion:FOUR_PILLARS_YUN_OFFSET_VERSION,birthInstant,solarTermInstant,termSide:term<birth?'before':term>birth?'after':'same',differenceSeconds,totalMinutes,discardedSeconds:differenceSeconds%60,offset:{years,months,days,hours:remaining*2},verificationState:'review-required',publicationAllowed:false};
 }catch(error){return{state:'calculation-error',reason:error.message,data:null,publicationAllowed:false};}
}
