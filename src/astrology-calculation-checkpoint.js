import {buildAstrologyPageData,ASTROLOGY_PAGE_SOURCE_PATHS} from './astrology-page-data.js';
export const ASTROLOGY_CHECKPOINT_VERSION='ns.astrology.calculation-checkpoint.v1';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function withAstrologyCalculationCheckpoint(snapshot){
 if(!object(snapshot)||snapshot.divination!=='western-astrology')return snapshot;
 if(!object(snapshot.astrologyInput)||snapshot.astrologyInput.methodKey!=='western-astrology'){
  if(!snapshot.astrologyCalculation&&!['confirmed','completed'].includes(snapshot.status))return snapshot;
  const {astrologyCalculation,...draft}=snapshot;
  return{...draft,status:'draft',publicationAllowed:false};
 }
 const source=structuredClone(snapshot.astrologyInput);
 const scopeMatches=typeof snapshot.id==='string'&&snapshot.id.trim()&&typeof snapshot.selectedCustomerId==='string'&&snapshot.selectedCustomerId.trim()&&source.subjectId===snapshot.selectedCustomerId&&source.birthDate===snapshot.birthday&&source.referenceDate===snapshot.visitDate;
 const calculation=buildAstrologyPageData(scopeMatches?source:{...source,zoneConfirmed:false});
 if(!scopeMatches)for(const page of calculation.pages)if(Object.hasOwn(ASTROLOGY_PAGE_SOURCE_PATHS,page.pageDefinitionId))Object.assign(page,{state:'required-missing',reason:'SNAPSHOT_INPUT_SCOPE_MISMATCH',data:null});
 return{...snapshot,status:'draft',publicationAllowed:false,astrologyCalculation:{schemaVersion:ASTROLOGY_CHECKPOINT_VERSION,methodKey:'western-astrology',sessionId:snapshot.id??null,subjectId:snapshot.selectedCustomerId??null,status:'draft',verificationState:'review-required',publicationAllowed:false,source,calculation}};
}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 return object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
}
export function validateAstrologyCalculationCheckpoint(snapshot){
 if(snapshot?.divination!=='western-astrology')return{ok:false,code:'METHOD_MISMATCH'};
 if(snapshot.status!=='draft'||snapshot.publicationAllowed!==false)return{ok:false,code:'DRAFT_STATE_REQUIRED'};
 if(snapshot.astrologyCalculation?.schemaVersion!==ASTROLOGY_CHECKPOINT_VERSION)return{ok:false,code:'CHECKPOINT_SCHEMA_MISMATCH'};
 try{
  const expected=withAstrologyCalculationCheckpoint(snapshot).astrologyCalculation;
  if(!expected||JSON.stringify(canonical(expected))!==JSON.stringify(canonical(snapshot.astrologyCalculation)))return{ok:false,code:'CHECKPOINT_SCOPE_OR_VALUES_MISMATCH'};
 }catch{return{ok:false,code:'CHECKPOINT_INVALID'};}
 return{ok:true,code:'DRAFT_CHECKPOINT_MATCHED',publicationAllowed:false};
}
export async function saveAstrologyReadingDraft({snapshot,fetcher,expectedDraftVersion=null}={}){
 if(snapshot?.divination!=='western-astrology'||!object(snapshot.astrologyInput)||![snapshot.id,snapshot.selectedCustomerId,snapshot.name,snapshot.birthday,snapshot.theme].every(v=>typeof v==='string'&&v.trim()))return{ok:false,code:'DRAFT_INPUT_REQUIRED'};
 try{
  // Capture once, recompute, and preserve all unrelated editor fields.
  const captured=withAstrologyCalculationCheckpoint(structuredClone(snapshot));
  const response=await fetcher('/api/appraisals/save-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appraisalId:captured.id,expectedDraftVersion,clientName:captured.name,birthDate:captured.birthday,divination:captured.divination,question:captured.theme,snapshot:captured})});
  const data=await response.json();
  if(!response.ok||data.status!=='success'||data.draftId!==captured.id||data.activeDraft?.id!==captured.id||typeof data.activeDraft.draftVersion!=='string'||!data.activeDraft.draftVersion||!validateAstrologyCalculationCheckpoint(data.activeDraft.snapshot).ok||JSON.stringify(canonical(data.activeDraft.snapshot.astrologyCalculation))!==JSON.stringify(canonical(captured.astrologyCalculation)))return{ok:false,code:response.status===409?'DRAFT_SAVE_CONFLICT':'DRAFT_SAVE_UNCONFIRMED'};
  if(Object.keys(captured).some(key=>JSON.stringify(canonical(captured[key]))!==JSON.stringify(canonical(data.activeDraft.snapshot[key]))))return{ok:false,code:'DRAFT_SAVE_CONTENT_MISMATCH'};
  return{ok:true,snapshot:structuredClone(data.activeDraft.snapshot),draftVersion:data.activeDraft.draftVersion};
 }catch{return{ok:false,code:'DRAFT_SAVE_FAILED'};}
}
