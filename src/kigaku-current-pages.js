import {validateKigakuReading} from './kigaku-reading.js';
import {kigakuSolarPeriod,kigakuSolarTerms,KIGAKU_SOLAR_VERSION} from './kigaku-solar-calendar.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(copy=>[copy.copyId,copy]));
const min=Date.parse('1901-01-01T00:00:00+09:00'), max=Date.parse('2101-01-01T00:00:00+09:00');
// These basic pages use the snapshot instant, never the browser's current clock.
export function createKigakuCurrentPages(snapshot) {
 const reading=validateKigakuReading(snapshot),source=reading.result.sourceResult;
 const period=kigakuSolarPeriod(source.input.referenceInstant);
 const spring=year=>kigakuSolarTerms(year).find(term=>term.solarMonthIndex===0).instant;
 const copy=id=>{if(!catalog.has(id))throw Error('KIGAKU_COPY_MISSING');return {...catalog.get(id),variant:'body'};};
 return [['KIG-03','今年の運勢','year'],['KIG-04','今月の運勢','month']].map(([pageId,title,kind])=>{
  const target=source[kind],startInclusive=kind==='year'?spring(target.kiYear):period.period.startInclusive,endExclusive=kind==='year'?spring(target.kiYear+1):period.period.endExclusive;
  const mainStar=source.natal.mainStar.value;
  const reasonCode=source.natal.mainStar.state!=='ready'?'MAIN_STAR_REQUIRED':Date.parse(startInclusive)<min||Date.parse(endExclusive)>max?'FULL_PERIOD_OUT_OF_RANGE':null;
  const palace=reasonCode?null:Object.keys(target.board).find(key=>target.board[key]===mainStar);
  const ref={path:`result.sourceResult.${kind}.board`,subject:'self',mainStar,palace,kiYear:target.kiYear,solarMonthIndex:kind==='month'?target.solarMonthIndex:null,referenceInstant:source.input.referenceInstant,startInclusive,endExclusive,calculationVersion:KIGAKU_SOLAR_VERSION};
  const slots=reasonCode?[]:[{copies:[copy(`kig.${kind}.reading`)],resultRefs:[ref]},{copies:[copy(`kig.palace.${palace}.${kind}`)],resultRefs:[ref]}];
  return {pageId,title,state:reasonCode?'unavailable':'draft_preview',reasonCode,slots,rows:reasonCode?[]:[ref],board:reasonCode?null:target.board,systemExplanationEnabled:true,practitionerComment:reading.input.commentEnabled?reading.input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false};
 });
}
