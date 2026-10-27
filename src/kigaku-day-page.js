import {validateKigakuReading} from './kigaku-reading.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(copy=>[copy.copyId,copy]));
export function createKigakuDayPage(snapshot,planId='free') {
 const reading=validateKigakuReading(snapshot),source=reading.result.sourceResult,day=source.day;
 const reasonCode=!['pro','business'].includes(planId)?'PRO_REQUIRED':source.natal.mainStar.state!=='ready'?'MAIN_STAR_REQUIRED':null;
 const mainStar=source.natal.mainStar.value;
 const palace=reasonCode?null:Object.keys(day.board).find(key=>day.board[key]===mainStar);
 const startInclusive=new Date(`${day.date}T00:00:00+09:00`).toISOString();
 const endExclusive=new Date(Date.parse(startInclusive)+86400000).toISOString();
 const ref={path:'result.sourceResult.day.board',subject:'self',mainStar,palace,date:day.date,timeZone:'Asia/Tokyo',methodLabel:'koyomi8方式・JST日界',calculationVersion:day.calculationVersion,referenceInstant:source.input.referenceInstant,startInclusive,endExclusive};
 let slots=[];
 if(!reasonCode){
  const copy=catalog.get(`kig.palace.${palace}.day`);
  if(!copy)throw Error('KIGAKU_COPY_MISSING');
  slots=[{copies:[{...copy,variant:'body'}],resultRefs:[ref]}];
 }
 return {pageId:'KIG-05',title:'日々の運勢',state:reasonCode?'unavailable':'draft_preview',reasonCode,slots,rows:reasonCode?[]:[ref],board:reasonCode?null:day.board,verificationStatus:day.verificationStatus,systemExplanationEnabled:true,practitionerComment:reading.input.commentEnabled?reading.input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false};
}
