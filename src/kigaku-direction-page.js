import {validateKigakuReading} from './kigaku-reading.js';
import {createKigakuCurrentPages} from './kigaku-current-pages.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(copy=>[copy.copyId,copy]));
const reasonCopies={five_yellow:'gohosatsu',opposite_five_yellow:'ankensatsu',main_star:'honmeisatsu',opposite_main_star:'honmeitekisatsu',year_break:'saiha',month_break:'geppa'};
export function createKigakuDirectionPage(snapshot,planId='free') {
 const reading=validateKigakuReading(snapshot),analysis=reading.result.analysis;
 const current=createKigakuCurrentPages(reading);
 const reasonCode=!['pro','business'].includes(planId)?'PRO_REQUIRED':analysis.state!=='ready'?'MAIN_STAR_REQUIRED':current.find(page=>page.reasonCode)?.reasonCode||null;
 const copy=id=>{const record=catalog.get(`kig.direction.${id}`);if(!record)throw Error('KIGAKU_COPY_MISSING');return {...record,variant:'body'};};
 const directionRows=reasonCode?[]:['year','month'].flatMap((period,index)=>analysis[period].map((row,i)=>{
  const ref={...current[index].rows[0],path:`result.analysis.${period}.${i}`,period,direction:row.direction,star:row.star,goodCandidate:row.goodCandidate,candidateExclusions:row.candidateExclusions,dangerReasons:row.dangerReasons,judgement:row.judgement,directionCalculationVersion:reading.result.calculationVersion};
  const ids=[...(row.elementRelation.kind==='other'?[]:[`candidate-${row.elementRelation.kind}`]),...(!row.goodCandidate?['not-eligible']:[]),...row.dangerReasons.map(reason=>reasonCopies[reason.code])];
  return {...row,period,resultRefs:[ref],copies:ids.map(copy)};
 }));
 const refs=reasonCode?[]:current.map((page,index)=>({...page.rows[0],path:`result.analysis.${['year','month'][index]}`,directionCalculationVersion:reading.result.calculationVersion}));
 const commonGood=reasonCode?[]:[...analysis.common.directions];
 return {pageId:'KIG-06',title:'吉方位と開運行動',state:reasonCode?'unavailable':'draft_preview',reasonCode,slots:reasonCode?[]:[{copies:[copy('reading')],resultRefs:refs},{copies:[copy('use'),copy(commonGood.length?'common-present':'common-empty')],resultRefs:refs}],rows:[],directionRows,commonGood,systemExplanationEnabled:true,practitionerComment:reading.input.commentEnabled?reading.input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false};
}
