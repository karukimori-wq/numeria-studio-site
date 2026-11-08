import { createKigakuResultFromClock } from './kigaku-result.js';
import { createKigakuDirectionResult } from './kigaku-directions.js';
import { createKigakuPeriodSeries } from './kigaku-period-series.js';
import { KIGAKU_SOLAR_VERSION, kigakuSolarTerms, kigakuSolarPeriod } from './kigaku-solar-calendar.js';
import { KIGAKU_DAYBOARD_VERSION } from './kigaku-dayboard.js';

export const KIGAKU_PAGE_DATA_VERSION = 'numeria.kigaku.f4-page-data.v1';
// Actual source paths, not new formal Result Keys. Comparison/theme adapters remain absent.
export const KIGAKU_PAGE_SOURCE_PATHS = Object.freeze({
 'KIG-01': ['natal.mainStar', 'natal.monthStar'],
 'KIG-02': ['natal.mainStar', 'natal.monthStar'],
 'KIG-03': ['year.board', 'natal.mainStar'],
 'KIG-04': ['month.board', 'natal.mainStar'],
 'KIG-05': ['day.board', 'day.date'],
 'KIG-06': ['analysis.year', 'analysis.month', 'analysis.common'],
 'KIG-07': ['months.rows'],
 'KIG-14': ['years.rows'],
});

export function buildKigakuPageData(input = {}) {
 const pages = Array.from({length:14}, (_, i) => ({pageDefinitionId:`KIG-${String(i+1).padStart(2,'0')}`, state:'unconnected', data:null, reason:'PAGE_ADAPTER_MISSING', publicationAllowed:false}));
 const envelope = {schemaVersion:KIGAKU_PAGE_DATA_VERSION, methodKey:'nine-star-ki', calculationVersion:{solar:KIGAKU_SOLAR_VERSION,day:KIGAKU_DAYBOARD_VERSION}, verificationState:'review-required', publicationAllowed:false, revision:input.revision??null, subject:input.subjectId??null, pages};
 if (input.methodKey !== 'nine-star-ki') return envelope;
 const set = (n,state,data,reason=null) => Object.assign(pages[n-1], {state,data,reason});
 let result;
 try { result = createKigakuResultFromClock({referenceInstant:input.referenceInstant, birthClock:input.birthClock??null}); }
 catch (error) {
  for (const id of Object.keys(KIGAKU_PAGE_SOURCE_PATHS)) set(Number(id.slice(4)), 'calculation-error', null, error.message);
  return envelope;
 }
 const main = result.natal.mainStar, month = result.natal.monthStar;
 const series=main.state==='ready'?createKigakuPeriodSeries(result.year.kiYear,main.value):null;
 const elements=[null,'water','earth','wood','wood','earth','metal','metal','earth','fire'];
 for (const n of [1,2]) set(n, main.state==='ready'&&month.state==='ready'?'available':'required-missing', main.state==='ready'&&month.state==='ready'?{mainStar:main.value,monthStar:month.value,...(n===2?{mainElement:elements[main.value],monthElement:elements[month.value]}:{})}:null, main.reasonCode||month.reasonCode);
 for (const [n,period] of [[3,'year'],[4,'month']]) {
  const board=result[period].board;
  const interval=period==='month'?kigakuSolarPeriod(result.input.referenceInstant).period:{startInclusive:kigakuSolarTerms(result.year.kiYear)[0].instant,endExclusive:kigakuSolarTerms(result.year.kiYear+1)[0].instant};
  const inRange=Date.parse(interval.startInclusive)>=Date.parse('1901-01-01T00:00:00+09:00')&&Date.parse(interval.endExclusive)<=Date.parse('2101-01-01T00:00:00+09:00');
  const ready=main.state==='ready'&&inRange;
  set(n,ready?'available':'required-missing',ready?{...result[period],honmeiPosition:Object.keys(board).find(key=>board[key]===main.value),referenceInstant:result.input.referenceInstant,interval}:null,inRange?main.reasonCode:'FULL_PERIOD_OUT_OF_RANGE');
 }
 set(5,'available',result.day);
 const directions=createKigakuDirectionResult({sourceResult:result}).analysis;
 set(6,directions.state==='ready'?(directions.common.directions.length?'available':'valid-zero'):'required-missing',directions.state==='ready'?directions:null,directions.reasonCode);
 if(main.state==='ready') {
  for(const [n,key] of [[7,'months'],[14,'years']]) set(n,series[key].state==='ready'?'available':'required-missing',series[key].state==='ready'?series[key]:null,series[key].reasonCode);
 } else for(const n of [7,14]) set(n,'required-missing',null,main.reasonCode);
 // Calculation availability never asserts independent verification, text/asset approval or F3 acceptance.
 return envelope;
}
