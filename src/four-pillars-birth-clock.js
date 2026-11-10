import {normalizeJapanBirthClock} from './japan-birth-clock.js';
import {calculateFourPillars} from './four-pillars-calculator.js';
// Shared normalizer reused from the Kigaku branch; no alternate timezone rules.
export function fourPillarsFromBirthClock({birthClock,referenceDate}={}){
 if(typeof birthClock?.date==='string'&&typeof referenceDate==='string'&&birthClock.date>referenceDate)return{state:'required-missing',reason:'BIRTH_DATE_AFTER_REFERENCE',pillars:null,publicationAllowed:false};
 let clock;
 try{clock=normalizeJapanBirthClock(birthClock);}catch(error){return{state:'calculation-error',reason:error.message,pillars:null,publicationAllowed:false};}
 if(!clock.selected)return{state:clock.state==='invalid'?'calculation-error':'required-missing',reason:clock.reasonCode,clockNormalization:clock,pillars:null,publicationAllowed:false};
 const calculation=calculateFourPillars({date:clock.selected.standardDate,time:clock.selected.standardTime,referenceDate,standardClockConfirmed:true});
 return{...calculation,clockNormalization:clock};
}
