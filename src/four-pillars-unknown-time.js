import {Solar} from 'lunar-typescript';
import {calculateFourPillars} from './four-pillars-calculator.js';
import {countVisiblePillarElements} from './four-pillars-elements.js';
// Conservatively refuse every solar-term day and every interval crossing a standard midnight.
// This may withhold a stable three-pillar result; it never selects a representative noon.
export function threePillarsForUnknownTime(clock,referenceDate){
 const stop=reason=>({state:'required-missing',reason,pillars:null,publicationAllowed:false});
 if(!clock.intervals?.length)return stop('BIRTH_INTERVAL_REQUIRED');
 const candidates=[];
 for(const interval of clock.intervals){
  const start=Date.parse(interval.startInclusiveUtc),end=Date.parse(interval.endExclusiveUtc);
  const standard=ms=>new Date(ms+540*60000).toISOString();
  const first=standard(start),last=standard(end-1);
  if(first.slice(0,10)!==last.slice(0,10))return stop('STANDARD_DATE_BOUNDARY_UNCERTAIN');
  const year=Number(first.slice(0,4));
  for(const y of [year-1,year,year+1]){
   const terms=Solar.fromYmd(y,1,1).getLunar().getJieQiTable();
   for(const term of Object.values(terms)){
    const ms=Date.parse(term.toYmdHms().replace(' ','T')+'+09:00');
    if(start<=ms&&ms<end)return stop('SOLAR_TERM_BOUNDARY_UNCERTAIN');
   }
  }
  for(const instant of [first,last]){
   const result=calculateFourPillars({date:instant.slice(0,10),time:instant.slice(11,19),referenceDate,standardClockConfirmed:true});
   if(!result.pillars)return stop(result.reason);
   candidates.push({year:result.pillars.year,month:result.pillars.month,day:result.pillars.day,hour:null});
  }
 }
 if(candidates.some(p=>JSON.stringify(p)!==JSON.stringify(candidates[0])))return stop('THREE_PILLARS_UNCERTAIN');
 return{state:'available',pillars:candidates[0],elements:countVisiblePillarElements(candidates[0]),optionalHourState:'optional-missing',verificationState:'review-required',publicationAllowed:false,coverage:'three-pillars-no-solar-term-or-standard-midnight-boundary'};
}
