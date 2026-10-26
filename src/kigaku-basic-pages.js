import {KIGAKU_SOLAR_VERSION} from './kigaku-solar-calendar.js';
import {validateKigakuReading} from './kigaku-reading.js';
import {KIGAKU_COPY_CATALOG} from './kigaku-copy-catalog.js';
const catalog=new Map(KIGAKU_COPY_CATALOG.map(copy=>[copy.copyId,copy]));
export function createKigakuBasicPages(snapshot) {
 const reading=validateKigakuReading(snapshot), source=reading.result.sourceResult;
 const roles=[['mainStar','honmei','本命星'],['monthStar','getsumei','月命星']];
 const ready=roles.every(([key])=>source.natal[key].state==='ready');
 const ref=([key,role,label])=>({path:`result.sourceResult.natal.${key}`,subject:'self',role,label,star:source.natal[key].value,referenceInstant:source.input.referenceInstant,calculationVersion:KIGAKU_SOLAR_VERSION});
 const copy=(id,variant='body')=>{if(!catalog.has(id))throw Error('KIGAKU_COPY_MISSING');return {...catalog.get(id),variant};};
 const refs=roles.map(ref);
 const identity=ready?roles.map((role,i)=>({resultRefs:[refs[i]],copies:[copy(`kig.role.${role[1]}`),copy(`kig.star.${refs[i].star}.basic`,'short')]})):[];
 const personality=ready?['basic','strength','caution'].map(kind=>({resultRefs:refs,copies:[...new Set(refs.map(ref=>ref.star))].map(star=>copy(`kig.star.${star}.${kind}`))})):[];
 return [['KIG-01','あなたの九星',identity],['KIG-02','基本性格と運勢傾向',personality]].map(([pageId,title,slots])=>({pageId,title,state:ready?'draft_preview':'unavailable',reasonCode:ready?null:'NATAL_STARS_REQUIRED',slots,rows:[],systemExplanationEnabled:true,practitionerComment:reading.input.commentEnabled?reading.input.practitionerComment:null,reviewStatus:'draft',releaseEnabled:false,exportAllowed:false}));
}
