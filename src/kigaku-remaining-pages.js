import {validateKigakuReading} from './kigaku-reading.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
import {KIGAKU_SOLAR_VERSION} from './kigaku-solar-calendar.js';
import {createKigakuCurrentPages} from './kigaku-current-pages.js';
import {createKigakuDirectionPage} from './kigaku-direction-page.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(copy=>[copy.copyId,copy]));
const elements=[null,'water','earth','wood','wood','earth','metal','metal','earth','fire'];
const generates={wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
const controls={wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'};
export const KIGAKU_RELATION_VERSION='ns.kigaku.person-pair.v1';
export function kigakuPersonRelation(self,partner) {
 if(!Number.isInteger(self)||self<1||self>9||!Number.isInteger(partner)||partner<1||partner>9)throw TypeError('KIGAKU_PAIR_STAR_INVALID');
 const a=elements[self],b=elements[partner];
 return a===b?'biwa':generates[a]===b?'gasei':generates[b]===a?'seiga':controls[a]===b?'gakoku':'kokuga';
}
export function createKigakuRemainingPages(snapshot,planId='free') {
 const reading=validateKigakuReading(snapshot),input=reading.input,source=reading.result.sourceResult,partner=reading.partnerResult;
 const pro=['pro','business'].includes(planId);
 const copy=(id,variant='body')=>{const c=catalog.get(id);if(!c)throw Error('KIGAKU_COPY_MISSING');return {...c,variant};};
 const page=(pageId,title,reasonCode,slots=[],extra={})=>({pageId,title,state:reasonCode?'unavailable':'draft_preview',reasonCode,slots:reasonCode?[]:slots,rows:[],systemExplanationEnabled:true,practitionerComment:input.commentEnabled?input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false,...extra});
 const pairReason=!pro?'PRO_REQUIRED':source.natal.mainStar.state!=='ready'?'MAIN_STAR_REQUIRED':partner?.natal.mainStar.state!=='ready'?'PARTNER_MAIN_STAR_REQUIRED':null;
 const starRef=(subject,key='mainStar')=>({path:subject==='self'?`result.sourceResult.natal.${key}`:`partnerResult.natal.${key}`,subject,role:key==='mainStar'?'honmei':'getsumei',label:`${subject==='self'?'本人':'相手'}の${key==='mainStar'?'本命星':'月命星'}`,star:(subject==='self'?source:partner).natal[key].value,referenceInstant:input.referenceInstant,calculationVersion:KIGAKU_SOLAR_VERSION});
 const refs=pairReason?[]:[starRef('self'),starRef('partner')];
 const relation=pairReason?null:kigakuPersonRelation(refs[0].star,refs[1].star);
 const pairRefs=refs.map(ref=>({...ref,relation,relationVersion:KIGAKU_RELATION_VERSION}));
 const relationship={self:pairReason?null:refs[0].star,partner:pairReason?null:refs[1].star,selfName:'本人',partnerName:input.partnerName||'相手',relation,relationVersion:KIGAKU_RELATION_VERSION};
 const slot=(ids,resultRefs=pairRefs)=>({copies:ids.map(id=>copy(id)),resultRefs});
 const basic=page('KIG-08','ふたりの九星・相性鑑定',pairReason,pairReason?[]:[...refs.map(ref=>({copies:[copy('kig.role.honmei'),copy(`kig.star.${ref.star}.basic`,'short')],resultRefs:[ref]})),slot([`kig.relation.${relation}.basic`])],{relationship:pairReason?null:relationship,supplements:[]});
 if(!pairReason&&source.natal.monthStar.state==='ready'&&partner.natal.monthStar.state==='ready'){
  const monthRefs=[starRef('self','monthStar'),starRef('partner','monthStar')],monthRelation=kigakuPersonRelation(monthRefs[0].star,monthRefs[1].star);
  basic.supplements=[{label:'双方が確定した月命星の補足比較',copies:[copy(`kig.relation.${monthRelation}.basic`)],resultRefs:monthRefs.map(ref=>({...ref,relation:monthRelation,relationVersion:KIGAKU_RELATION_VERSION}))}];
 }
 const themed=(id,title,key,ids)=>{const reason=pairReason||(!input[key]?.trim()?'RELATIONSHIP_CONTEXT_REQUIRED':null);return page(id,title,reason,reason?[]:ids.map(list=>slot(list)),{relationship:reason?null:{...relationship,context:input[key]}});};
 const love=themed('KIG-09','恋愛・結婚の相性','loveRelationship',[[`kig.relation.${relation}.love`],['kig.context.love.distance'],['kig.context.love.dialogue']]);
 const work=themed('KIG-10','仕事・職場の人間関係','workRelationship',[[`kig.relation.${relation}.work`],['kig.context.work.cooperation']]);
 const familyReason=pairReason||(!input.familyRelationship?.trim()?'RELATIONSHIP_CONTEXT_REQUIRED':null);
 const family=page('KIG-13','家族・親子の相性',familyReason,familyReason?[]:[{copies:refs.map(ref=>copy(`kig.star.${ref.star}.basic`,'short')).concat(copy(`kig.relation.${relation}.basic`)),resultRefs:pairRefs},slot([`kig.relation.${relation}.family`,'kig.family.dialogue'])],{relationship:familyReason?null:{...relationship,context:input.familyRelationship}});
 const current=createKigakuCurrentPages(reading);
 const workReason=!pro?'PRO_REQUIRED':!input.workTheme?'WORK_THEME_REQUIRED':current.find(p=>p.reasonCode)?.reasonCode||null;
 const career=page('KIG-11','転職・独立のタイミング',workReason,workReason?[]:current.map((p,i)=>({copies:[copy(`kig.palace.${p.rows[0].palace}.work-${i===0?'year':'month'}`)],resultRefs:p.slots[0].resultRefs.map(ref=>({...ref,workTheme:input.workTheme}))})),{periodComparison:workReason?[]:current.map((p,i)=>({...p.rows[0],period:i===0?'year':'month',workTheme:input.workTheme}))});
 const general=createKigakuDirectionPage(reading,planId);
 const travelReason=general.reasonCode||(!input.selectedDirection?'MANUAL_DIRECTION_REQUIRED':!input.directionPurpose?'DIRECTION_PURPOSE_REQUIRED':null);
 const selected=travelReason?[]:general.directionRows.filter(row=>row.direction===input.selectedDirection);
 const travel=page('KIG-12','引越し・旅行の方位',travelReason,travelReason?[]:[{copies:[...selected.flatMap(row=>row.copies.map(c=>({...c,period:row.period}))),copy(general.commonGood.includes(input.selectedDirection)?'kig.direction.common-present':general.commonGood.length?'kig.direction.not-eligible':'kig.direction.common-empty'),copy(`kig.direction.purpose-${input.directionPurpose}`)],resultRefs:selected.flatMap(row=>row.resultRefs).map(ref=>({...ref,purpose:input.directionPurpose,commonGood:general.commonGood.includes(input.selectedDirection)}))}],{selectedDirection:travelReason?null:input.selectedDirection,directionPurpose:travelReason?null:input.directionPurpose,selectedRows:selected,commonGood:travelReason?[]:general.commonGood.filter(d=>d===input.selectedDirection)});
 return [basic,love,work,career,travel,family];
}
