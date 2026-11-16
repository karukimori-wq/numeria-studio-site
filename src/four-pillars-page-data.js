import {FOUR_PILLARS_CALCULATION_VERSION} from './four-pillars-calculator.js';
import {fourPillarsFromBirthClock} from './four-pillars-birth-clock.js';
// Source paths are local calculator fields, not newly approved Result Keys.
export const FOUR_PILLARS_PAGE_SOURCE_PATHS=Object.freeze({
 'BAZ-01':['pillars','clockNormalization'],
 'BAZ-02':['pillars.day','pillars'],
 'BAZ-03':['elements.data.visibleElementCounts','elements.data.includedPillars'],
});
export function buildFourPillarsPageData(input={}){
 input=input&&typeof input==='object'?input:{};
 const pages=Array.from({length:14},(_,i)=>({pageDefinitionId:`BAZ-${String(i+1).padStart(2,'0')}`,state:'unconnected',reason:'PAGE_ADAPTER_MISSING',data:null,copyState:'source-missing',assetState:'asset-missing',reviewState:'review-required',publicationAllowed:false}));
 const envelope={schemaVersion:'numeria.bazi.page-data.v1',methodKey:'four-pillars',subject:input.subjectId??null,revision:input.revision??null,referenceDate:input.referenceDate??null,pages,publicationAllowed:false};
 if(input.methodKey!=='four-pillars')return envelope;
 let result;
 try{result=fourPillarsFromBirthClock(input);}catch{result={state:'calculation-error',reason:'CALCULATOR_FAILED',pillars:null};}
 const set=(index,data)=>Object.assign(pages[index],{state:result.pillars?'available':result.state,reason:result.reason??null,data:result.pillars?data:null});
 const optionalHourState=result.pillars?.hour?'available':'optional-missing';
 set(0,result.pillars?{pillars:result.pillars,clockNormalization:result.clockNormalization,optionalHourState}:null);
 set(1,result.pillars?{dayStem:result.pillars.day[0],pillars:result.pillars,optionalHourState}:null);
 set(2,result.pillars?{...result.elements.data,optionalHourState}:null);
 envelope.calculationVersion=result.calculationVersion??FOUR_PILLARS_CALCULATION_VERSION;
 return envelope;
}
