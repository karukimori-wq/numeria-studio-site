import {validateKigakuReading} from './kigaku-reading.js';
import {createKigakuPeriodSeries} from './kigaku-period-series.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(c=>[c.copyId,c]));
// Caller must supply the effective server plan; never pass a client plan claim.
export function createKigakuPeriodPages(snapshot,planId='free') {
 const reading=validateKigakuReading(snapshot),source=reading.result.sourceResult;
 const definitions=[{pageId:'KIG-07',title:'運勢のまとめ',kind:'months'},{pageId:'KIG-14',title:'9年間の運勢',kind:'years'}];
 const series=source.natal.mainStar.state==='ready'&&['pro','business'].includes(planId)?createKigakuPeriodSeries(source.year.kiYear,source.natal.mainStar.value):null;
 const copy=(id,variant='body')=>{if(!catalog.has(id))throw Error('KIGAKU_COPY_MISSING');return {...catalog.get(id),variant};};
 return definitions.map(def=>{
  const available=series?.[def.kind];
  const reasonCode=!['pro','business'].includes(planId)?'PRO_REQUIRED':source.natal.mainStar.state!=='ready'?'MAIN_STAR_REQUIRED':available.reasonCode;
  const rows=available?.state==='ready'?available.rows:[];
  const refs=rows.map((row,index)=>({path:`series.${def.kind}.${index}`,mainStar:row.mainStar,palace:row.honmeiPosition,calculationVersion:row.calculationVersion,referenceInstant:source.input.referenceInstant,startInclusive:row.startInclusive,endExclusive:row.endExclusive}));
  const slots=!rows.length?[]:def.kind==='months'?[{copies:rows.map(row=>copy(`kig.palace.${row.honmeiPosition}.month`,'short')),resultRefs:refs},{copies:[copy('kig.months.overall')],resultRefs:refs}]:rows.map((row,i)=>({copies:[...(i===0?[copy('kig.cycle.reading')]:[]),copy(`kig.palace.${row.honmeiPosition}.year`)],resultRefs:[refs[i]]}));
  return {pageId:def.pageId,title:def.title,state:rows.length?'draft_preview':'unavailable',reasonCode,rows,slots,systemExplanationEnabled:true,practitionerComment:reading.input.commentEnabled?reading.input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false};
 });
}
