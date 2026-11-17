import {calculateYunStart} from './four-pillars-yun-start.js';
import {fourPillarsFromBirthClock} from './four-pillars-birth-clock.js';
import {fourPillarsJieCalendar} from './four-pillars-jie-calendar.js';
import {selectYunSolarTerm} from './four-pillars-yun-term.js';

// Calculation projection only: this does not establish a formal Report result.
export function fourPillarsYunFromBirthClock({birthClock,referenceDate,calculationSex}={}){
 const calculation=fourPillarsFromBirthClock({birthClock,referenceDate});
 const selected=calculation.clockNormalization?.selected;
 if(calculation.state!=='available'||!selected)return{state:calculation.state==='calculation-error'?'calculation-error':'required-missing',reason:calculation.reason||'KNOWN_BIRTH_TIME_REQUIRED_FOR_YUN',data:null,publicationAllowed:false};
 try{
  const calendar=fourPillarsJieCalendar(Number(selected.standardDate.slice(0,4)));
  const yun=selectYunSolarTerm({yearStem:calculation.pillars.year[0],calculationSex,birthInstant:selected.utcInstant,terms:calendar.terms,calendarVersion:calendar.calendarVersion});
  return yun.state==='available'?{...yun,start:calculateYunStart({birthInstant:selected.utcInstant,offset:yun.offset.offset})}:yun;
 }catch(error){return{state:'calculation-error',reason:error.message,data:null,publicationAllowed:false};}
}
