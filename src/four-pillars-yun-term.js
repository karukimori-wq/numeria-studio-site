import {calculateYunOffset} from './four-pillars-yun-offset.js';
const stems='甲乙丙丁戊己庚辛壬癸';
const names=new Set(['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪']);
function instant(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.000)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value))throw Error('SECOND_PRECISION_INSTANT_REQUIRED');
 const date=new Date(value.slice(0,10)+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.slice(0,10))throw Error('DATE_INVALID');
 const ms=Date.parse(value);if(!Number.isFinite(ms))throw Error('INSTANT_INVALID');return ms;
}
// terms must be a complete, canonical UTC/offset-aware Jie calendar supplied by the caller.
// This helper does not reinterpret library civil dates as Japan or China standard time.
export function selectYunSolarTerm({yearStem,calculationSex,birthInstant,terms,calendarVersion}={}){
 const stop=(state,reason)=>({state,reason,data:null,publicationAllowed:false});
 if(!['male','female'].includes(calculationSex))return stop('required-missing','CALCULATION_SEX_REQUIRED');
 if(typeof yearStem!=='string'||yearStem.length!==1||!stems.includes(yearStem))return stop('required-missing','CONFIRMED_YEAR_STEM_REQUIRED');
 if(typeof calendarVersion!=='string'||!calendarVersion.trim()||!Array.isArray(terms)||!terms.length)return stop('unconnected','CANONICAL_JIE_CALENDAR_REQUIRED');
 try{
  const birth=instant(birthInstant),rows=terms.map(t=>{if(!names.has(t?.name))throw Error('JIE_NAME_INVALID');return{...t,ms:instant(t.instant)};}).sort((a,b)=>a.ms-b.ms);
  if(rows.some((t,i)=>i&&rows[i-1].ms===t.ms))return stop('calculation-error','DUPLICATE_JIE_INSTANT');
  // The exact-equality convention is not explicitly settled in the source spec.
  if(rows.some(t=>t.ms===birth))return stop('review-required','EXACT_JIE_BIRTH_CONVENTION_REQUIRED');
  const yang=stems.indexOf(yearStem)%2===0,forward=(yang&&calculationSex==='male')||(!yang&&calculationSex==='female');
  const previous=rows.filter(t=>t.ms<birth).at(-1),next=rows.find(t=>t.ms>birth);
  if(!previous||!next)return stop('required-missing','JIE_CALENDAR_COVERAGE_REQUIRED');
  const selected=forward?next:previous;
  const offset=calculateYunOffset({birthInstant,solarTermInstant:selected.instant});
  if(offset.state!=='available')return stop('calculation-error',offset.reason);
  return{state:'available',direction:forward?'forward':'backward',calendarVersion,selectedTerm:{name:selected.name,instant:selected.instant},offset,verificationState:'review-required',publicationAllowed:false};
 }catch(error){return stop('calculation-error',error.message);}
}
