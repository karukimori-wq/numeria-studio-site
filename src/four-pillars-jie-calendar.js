import {Solar} from 'lunar-typescript';
export const FOUR_PILLARS_JIE_VERSION='ns.bazi.jie.lunar-typescript-1.8.6.utc8.v1';
const names=['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
export function fourPillarsJieCalendar(year){
 if(!Number.isInteger(year)||year<1901||year>2100)throw Error('CALENDAR_YEAR_OUT_OF_RANGE');
 const terms=[];
 for(const y of [year-1,year,year+1]){
  const table=Solar.fromYmd(y,1,1).getLunar().getJieQiTable();
  for(const name of names){const civil=table[name].toYmdHms();terms.push({name,instant:new Date(civil.replace(' ','T')+'+08:00').toISOString(),sourceCivil:civil,sourceOffsetMinutes:480});}
 }
 return{calendarVersion:FOUR_PILLARS_JIE_VERSION,terms:terms.sort((a,b)=>a.instant.localeCompare(b.instant)),verificationState:'review-required',publicationAllowed:false};
}
