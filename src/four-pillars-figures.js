import { reportFigureTypesForPage } from './report-figure-types.js';
import { validateReportFigure } from './report-figure-renderer.js';

export const FOUR_PILLARS_FIGURE_VERSION='ns.bazi.draft-figures.2026-11-19.v1';
const figurePillars={year:'年柱',month:'月柱',day:'日柱',hour:'時柱'};
const figureGods=['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];
const figureBranches='子丑寅卯辰巳午未申酉戌亥';
const figureStems='甲乙丙丁戊己庚辛壬癸';
const figureRequired=(condition)=>{if(!condition)throw Error('FIGURE_SOURCE_INCOMPLETE');};
const figurePillarKeys=keys=>Array.isArray(keys)&&['year,month,day','year,month,day,hour'].includes(keys.join(','));
const figureValidPillar=value=>typeof value==='string'&&value.length===2&&figureStems.includes(value[0])&&figureBranches.includes(value[1])&&figureStems.indexOf(value[0])%2===figureBranches.indexOf(value[1])%2;
const figureTable=(columns,rows)=>({columns:columns.map(([key,label])=>({key,label})),rows});
function figurePeriod(item,id,label){
 figureRequired(item&&figureValidPillar(item.ganzhi)&&figureGods.includes(item.stemTenGod)&&typeof item.startStandard==='string'&&typeof item.endExclusiveStandard==='string');
 figureRequired(Number.isFinite(Date.parse(item.startStandard))&&Date.parse(item.endExclusiveStandard)>Date.parse(item.startStandard));
 return{id,label,value:`${item.ganzhi}（${item.stemTenGod}）`,start:item.startStandard,end:item.endExclusiveStandard};
}
function figureStarRelation(data,placements){
 figureRequired(figureStems.includes(data.dayStem)&&typeof data.dayStem==='string'&&data.dayStem.length===1&&Array.isArray(placements));
 const groups=new Map();
 for(const row of placements){
  figureRequired(figurePillars[row.pillar]&&['天干','本気','中気','余気'].includes(row.position)&&figureGods.includes(row.tenGod)&&typeof row.stem==='string'&&row.stem.length===1&&figureStems.includes(row.stem));
  figureRequired(!(row.pillar==='day'&&row.position==='天干'));
  const existing=groups.get(row.tenGod);figureRequired(!existing||existing===row.stem);groups.set(row.tenGod,row.stem);
 }
 return{nodes:[{id:'日主',value:data.dayStem},...Array.from(groups,([id,value])=>({id,value}))],edges:Array.from(groups,([god])=>({from:'日主',to:god,kind:god})),legend:[{kind:'線の意味',label:'日干を基準とする通変星の対応。配置・強弱・相性の点数や因果関係を表す線ではありません。'}],scoreAxis:false};
}

// Only the saved-input draft viewer consumes these figures. The existing formal
// result contract, approval store and print pipeline are deliberately untouched.
export function buildFourPillarsDraftFigures(page,scope){
 const stopped=reason=>({available:false,reason,figures:[],publicationAllowed:false});
 if(!scope?.available||scope.methodKey!=='four-pillars'||scope.publicationAllowed!==false||!scope.sessionId||!scope.subjectId||!scope.draftRevision||!scope.calculationVersion)return stopped('FIGURE_DRAFT_SCOPE_REQUIRED');
 if(!['available','valid-zero'].includes(page?.state)||!page.data)return stopped(page?.reason||'FIGURE_CALCULATION_REQUIRED');
 const data=page.data,id=page.pageDefinitionId,types=reportFigureTypesForPage({pageDefinitionId:id,visualRequired:true});
 if(types.length!==1)return stopped('FIGURE_TYPE_UNCONNECTED');
 let figureData,state='ready',alt='',subjects=[scope.subjectId];
 try{
  switch(id){
  case 'BAZ-01':{
   figureRequired(figurePillarKeys(data.includedPillars)&&data.includedPillars.every(key=>figureValidPillar(data.pillars?.[key])));
   figureData=figureTable([['pillar','柱'],['ganzhi','干支']],data.includedPillars.map(key=>({pillar:figurePillars[key],ganzhi:data.pillars[key]})));
   alt=`確定${data.includedPillars.length}柱の命式${data.includedPillars.includes('hour')?'':'。出生時刻不明のため時柱は含みません'}`;break;}
  case 'BAZ-02':{
   const keys=Object.keys(figurePillars).filter(key=>data.pillars?.[key]!=null);figureRequired(figurePillarKeys(keys)&&keys.every(key=>figureValidPillar(data.pillars[key]))&&data.dayStem===data.pillars.day[0]);
   figureData={nodes:keys.map(key=>({id:figurePillars[key],value:data.pillars[key]})),edges:[],legend:[{kind:'日主',label:`日柱の天干 ${data.dayStem}。各柱を参照する配置であり、柱間の合冲を計算した線は追加していません。`}],scoreAxis:false};alt='日干と参照する確定命式';break;}
  case 'BAZ-03':{
   const elements={wood:'木',fire:'火',earth:'土',metal:'金',water:'水'};figureRequired(figurePillarKeys(data.includedPillars)&&data.total===data.includedPillars.length*2&&Object.keys(elements).every(key=>Number.isInteger(data.visibleElementCounts?.[key])));
   figureData={denominator:data.total,unit:'字',measure:'天干・地支の表面文字の構成数。蔵干・健康・吉凶の点数を含みません',items:Object.entries(elements).map(([key,label])=>({label,value:data.visibleElementCounts[key]}))};alt='確定三柱6字または四柱8字の五行構成。0も表示';break;}
  case 'BAZ-04':case 'BAZ-09':case 'BAZ-10':
   if(id==='BAZ-09')figureRequired(typeof data.dayBranch==='string'&&data.dayBranch.length===1&&figureBranches.includes(data.dayBranch));figureRequired(data.placements?.length>0);figureData=figureStarRelation(data,data.placements);alt='本人の日干を基準に、掲載位置の天干・蔵干に対応する通変星を整理';break;
  case 'BAZ-11':
   figureRequired(figurePillarKeys(scope.includedPillars)&&Array.isArray(data.wealthPlacements)&&data.wealthPlacements.every(row=>['偏財','正財'].includes(row.tenGod)));
   figureData=figureStarRelation(data,data.wealthPlacements);state=data.wealthPlacements.length?'ready':'empty';alt=`財星の対応。掲載範囲：${scope.includedPillars.map(key=>figurePillars[key]).join('・')}。未計算を0件としていません`;break;
  case 'BAZ-05':
   figureRequired(figurePillarKeys(data.includedPillars)&&Array.isArray(data.rows)&&data.rows.length===data.includedPillars.length&&data.rows.every((row,index)=>row.pillar===data.includedPillars[index]&&typeof row.branch==='string'&&row.branch.length===1&&figureBranches.includes(row.branch)&&['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'].includes(row.twelveStage)));
   figureData=figureTable([['pillar','柱'],['branch','支'],['stage','十二運']],data.rows.map(row=>({pillar:figurePillars[row.pillar],branch:row.branch,stage:row.twelveStage})));alt='各掲載地支と日干の固定表による十二運。活力・健康・運勢点数ではありません';break;
  case 'BAZ-06':{
   figureRequired(Array.isArray(data.intervals)&&data.intervals.length===10&&data.intervals.every((item,index)=>item.index===index+1));const periods=data.intervals.map((item,index)=>figurePeriod(item,`dayun-${index}`,String(index+1)));
   figureRequired(periods.every((item,index)=>index===0||item.start===periods[index-1].end));
   figureData=figureTable([['index','区間'],['ganzhi','干支'],['god','通変星'],['start','開始'],['end','終了']],data.intervals.map((item,index)=>({index:index+1,ganzhi:item.ganzhi,god:item.stemTenGod,start:item.startStandard,end:item.endExclusiveStandard})));alt='起運から全10区間の大運。日本標準時、開始を含み終了を含まない';break;}
  case 'BAZ-07':
   figureData={items:[figurePeriod(data.currentDayun,'current-dayun','現在の大運'),figurePeriod(data.annual,'current-year',`${data.annual?.year}節年`)],unit:'大運・節年（別々の期間）',timeZone:'Asia/Tokyo',scoreAxis:false};alt='基準日が属する大運と節年。それぞれの完全な区間';break;
  case 'BAZ-08':case 'BAZ-12':{
   figureRequired(data.subjectId===scope.subjectId&&data.partnerSubjectId===scope.partnerSubjectId&&scope.partnerSubjectId&&figurePillarKeys(data.includedPillars)&&Array.isArray(data.matches));subjects.push(scope.partnerSubjectId);
   figureRequired(data.includedPillars.every(key=>figureValidPillar(data.subjectPillars?.[key])&&figureValidPillar(data.partnerPillars?.[key])));
   const kinds={'stem-combination':'干合','branch-combination':'支合','branch-clash':'冲'};
   figureRequired(data.matches.every(match=>data.includedPillars.includes(match.pillar)&&kinds[match.kind]));
   if(id==='BAZ-12')figureRequired(['parent-child','partners','other-family'].includes(data.family?.context)&&(data.family.context!=='parent-child'||['a-parent','b-parent'].includes(data.family.parentDirection)));
   figureData=figureTable([['pillar','対応柱'],['subject','本人'],['partner','相手'],['matches','採用合冲']],data.includedPillars.map(key=>({pillar:figurePillars[key],subject:data.subjectPillars[key],partner:data.partnerPillars[key],matches:data.matches.filter(match=>match.pillar===key).map(match=>`${kinds[match.kind]} ${match.subjectValue}・${match.partnerValue}`).join('／')||'採用合冲なし'})));alt=`2名の確定した対応${data.includedPillars.length}柱だけの比較。時柱${data.includedPillars.includes('hour')?'を含む':'は含まない'}`;if(!data.matches.length)alt+='。採用合冲0件';if(id==='BAZ-12'){alt+=`。家族関係：${{'parent-child':'親子',partners:'パートナー','other-family':'その他の家族'}[data.family.context]}`;if(data.family.context==='parent-child')alt+=data.family.parentDirection==='a-parent'?'／本人：親・相手：子':'／本人：子・相手：親';}break;}
  case 'BAZ-13':
   figureRequired(Array.isArray(data.years)&&data.years.length===2&&data.years[1].year===data.years[0].year+1);
   figureData={items:data.years.flatMap(year=>{figureRequired(Array.isArray(year.correspondingDayun)&&year.correspondingDayun.length>0);return[figurePeriod(year,`annual-${year.year}`,`${year.year}節年`),...year.correspondingDayun.map((item,index)=>figurePeriod(item,`annual-${year.year}-dayun-${index}`,`${year.year}節年に重なる大運`))];}),unit:'2節年と各節年に対応する大運',timeZone:'Asia/Tokyo',scoreAxis:false};alt='今年・来年の節年と各年に重なる全大運。大運の区間は節年に切り詰めません';break;
  case 'BAZ-14':
   figureRequired(data.boundaryStandard===data.currentDayun?.endExclusiveStandard&&data.boundaryStandard===data.nextDayun?.startStandard&&Number.isInteger(data.age?.fullYears));
   figureData={items:[figurePeriod(data.currentDayun,'before-transition','切替前の大運'),figurePeriod(data.nextDayun,'after-transition','切替後の大運')],unit:`境界 ${data.boundaryStandard}・満${data.age.fullYears}歳`,timeZone:'Asia/Tokyo',scoreAxis:false};alt='次の切替境界を挟む2大運。境界日に出来事が起こる予測ではありません';break;
  default:return stopped('FIGURE_PAGE_UNCONNECTED');
  }
  const figure={schemaVersion:'ns.figure.v1',adapterVersion:FOUR_PILLARS_FIGURE_VERSION,figureId:`${scope.sessionId}:${id}:draft`,pageId:id,type:types[0],state,exampleOnly:false,alt,subjectRefs:subjects,resultRevision:scope.draftRevision,calculationVersion:scope.calculationVersion,publicationAllowed:false,verificationState:'review-required',resultBindings:[{pageDefinitionId:id,subjectRefs:subjects,sourceData:structuredClone(data)}],data:figureData};
  const validation=validateReportFigure(figure);if(!validation.ok)return stopped(validation.code);
  return{available:true,figures:[figure],publicationAllowed:false};
 }catch{return stopped('FIGURE_SOURCE_INCOMPLETE');}
}
