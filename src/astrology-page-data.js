import {calculatePlanetPositions} from './calendar-calculators.js';
import {normalizeJapanBirthTime} from './japan-birth-time.js';
import {calculateAspect} from './astrology-math.js';

export const ASTROLOGY_PAGE_DATA_VERSION='ns.astrology.page-data.v1';
export const ASTROLOGY_PAGE_SOURCE_PATHS=Object.freeze({
 'AST-02':['pages[1].data.sun','pages[1].data.moon'],
 'AST-03':['pages[2].data.planets'],
 'AST-04':['pages[3].data.counts'],
 'AST-05':['pages[4].data.counts'],
 'AST-06':['pages[5].data.aspects'],
});
const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const elements=['fire','earth','air','water'],modalities=['cardinal','fixed','mutable'];
export function astrologySign(longitude){
 if(typeof longitude!=='number'||!Number.isFinite(longitude)||longitude<0||longitude>=360)throw Error('LONGITUDE_INVALID');
 const index=Math.floor(longitude/30);
 return{sign:signs[index],element:elements[index%4],modality:modalities[index%3]};
}
// Pure calculation projection, never a confirmed-result or publication adapter.
export function projectAstrologyPositions(result){
 if(result?.status!=='calculated'||result.calculationVersion!=='astronomy-engine@2.1.19'||result.center!=='geocentric'||result.frame!=='apparent true ecliptic of date'||result.sample===true||!Array.isArray(result.planets)||result.planets.length!==10)throw Error('PLANET_RESULT_INVALID');
 const planets=bodies.map(body=>{
  const rows=result.planets.filter(p=>p?.body===body);
  if(rows.length!==1||typeof rows[0].latitudeDegrees!=='number'||!Number.isFinite(rows[0].latitudeDegrees)||Math.abs(rows[0].latitudeDegrees)>90)throw Error('PLANET_RESULT_INVALID');
  return{body,longitudeDegrees:rows[0].longitudeDegrees,latitudeDegrees:rows[0].latitudeDegrees,...astrologySign(rows[0].longitudeDegrees)};
 });
 const elementCounts=Object.fromEntries(elements.map(e=>[e,0])),modalityCounts=Object.fromEntries(modalities.map(m=>[m,0]));
 planets.forEach(p=>{elementCounts[p.element]++;modalityCounts[p.modality]++;});
 const aspects=[];
 for(let a=0;a<planets.length;a++)for(let b=a+1;b<planets.length;b++){
  const pair=[planets[a].body,planets[b].body];
  const aspect=calculateAspect({longitudePair:[planets[a].longitudeDegrees,planets[b].longitudeDegrees],chartKind:'natal',pair});
  if(aspect.status==='calculated')aspects.push({pair,aspect:aspect.aspect,angle:aspect.angle,orb:aspect.orb,errorDegrees:aspect.errorDegrees});
  else if(aspect.status!=='empty')throw Error('ASPECT_RESULT_INVALID');
 }
 return{planets,elementCounts,modalityCounts,denominator:10,weightPerBody:1,axesIncluded:false,aspects};
}
export function buildAstrologyPageData(input={}){
 const pages=Array.from({length:16},(_,i)=>({pageDefinitionId:`AST-${String(i+1).padStart(2,'0')}`,state:'unconnected',reason:'PAGE_ADAPTER_UNCONNECTED',data:null,copyState:'source-missing',assetState:'asset-missing',reviewState:'review-required',publicationAllowed:false}));
 const envelope={schemaVersion:ASTROLOGY_PAGE_DATA_VERSION,methodKey:'western-astrology',subject:input?.subjectId??null,revision:input?.revision??null,referenceDate:input?.referenceDate??null,calculationVersion:'astronomy-engine@2.1.19',publicationAllowed:false,pages};
 const active=pages.filter(p=>Object.hasOwn(ASTROLOGY_PAGE_SOURCE_PATHS,p.pageDefinitionId));
 const stop=(state,reason)=>{active.forEach(p=>Object.assign(p,{state,reason}));return envelope;};
 if(input?.methodKey!=='western-astrology')return stop('unconnected','METHOD_NOT_SELECTED');
 if(input.countryCode!=='JP'||input.zoneConfirmed!==true)return stop('required-missing','JAPAN_BIRTH_ZONE_CONFIRMATION_REQUIRED');
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 if(!validDate(input.referenceDate)||input.referenceDate<'1901-01-01'||input.referenceDate>'2100-12-31'||!validDate(input.birthDate)||input.birthDate<'1901-01-01'||input.birthDate>input.referenceDate)return stop('required-missing','BIRTH_OR_REFERENCE_DATE_INVALID');
 const clock=normalizeJapanBirthTime({birthDate:input.birthDate,clockTime:input.clockTime,utcOffsetMinutes:input.utcOffsetMinutes});
 envelope.birthTime=clock;
 if(clock.status==='date-only')return stop('required-missing','UNKNOWN_TIME_INTERVAL_ADAPTER_UNCONNECTED');
 if(clock.status!=='calculated')return stop(['CLOCK_TIME_INVALID','CLOCK_TIME_NONEXISTENT','OFFSET_INVALID','OFFSET_MISMATCH'].includes(clock.code)?'calculation-error':'required-missing',clock.code);
 try{
  const result=calculatePlanetPositions(clock.utc);
  if(result.status!=='calculated')return stop(result.status==='calculation-failed'?'calculation-error':'required-missing',result.code);
  const projection=projectAstrologyPositions(result);
  envelope.instantUTC=result.instantUTC;envelope.frame=result.frame;envelope.center=result.center;
  active.forEach(p=>Object.assign(p,{state:'available',reason:null}));
  pages[1].data={sun:projection.planets[0],moon:projection.planets[1],asc:null,ascState:'optional-missing',ascReason:'PLACIDUS_AXES_UNCONNECTED'};
  pages[2].data={planets:projection.planets};
  pages[3].data={counts:projection.elementCounts,denominator:10,weightPerBody:1,axesIncluded:false};
  pages[4].data={counts:projection.modalityCounts,denominator:10,weightPerBody:1,axesIncluded:false};
  pages[5].data={aspects:projection.aspects,scope:'ten-planets-only',axesState:'unconnected'};
  if(!projection.aspects.length)pages[5].state='valid-zero';
  // ASC/MC aspects remain unconnected; AST-06 does not claim a full chart.
  return envelope;
 }catch{return stop('calculation-error','ASTROLOGY_CALCULATION_FAILED');}
}
