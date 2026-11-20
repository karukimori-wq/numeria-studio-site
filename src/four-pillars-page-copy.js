import { FOUR_PILLARS_COPY_RECORDS, FOUR_PILLARS_COPY_VERSION } from './four-pillars-copy-data.js';

const copyStemIds=Object.fromEntries([...'甲乙丙丁戊己庚辛壬癸'].map((v,i)=>[v,['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'][i]]));
const copyBranchIds=Object.fromEntries([...'子丑寅卯辰巳午未申酉戌亥'].map((v,i)=>[v,['zi','chou','yin','mao','chen','si','wu','wei','shen','you','xu','hai'][i]]));
const copyGodIds={'比肩':'hiken','劫財':'gozai','食神':'shokushin','傷官':'shokan','偏財':'henzai','正財':'seizai','偏官':'henkan','正官':'seikan','偏印':'henin','印綬':'inju'};
const copyStageIds={'長生':'chosei','沐浴':'mokuyoku','冠帯':'kantai','建禄':'kenroku','帝旺':'teiou','衰':'sui','病':'byo','死':'shi','墓':'bo','絶':'zetsu','胎':'tai','養':'yo'};
const copyPillarLabels={year:'年柱',month:'月柱',day:'日柱',hour:'時柱'};

// Selection is a draft-only projection of saved page calculations. It does not
// recompute a chart, approve source text, mutate comments, or issue a report.
export function selectFourPillarsPageCopy(page,scope,records=FOUR_PILLARS_COPY_RECORDS){
 const result={pageDefinitionId:page?.pageDefinitionId,copyVersion:FOUR_PILLARS_COPY_VERSION,state:'required-missing',frames:[],publicationAllowed:false,reviewStatus:'draft',scope:{sessionId:scope?.sessionId,subjectId:scope?.subjectId,partnerSubjectId:scope?.partnerSubjectId}};
 if(!scope?.subjectId||!['available','valid-zero'].includes(page?.state)||!page.data)return result;
 const frames=[];let frame;
 const start=(frameId,title)=>{frame={frameId,title,segments:[]};frames.push(frame);};
 const emit=(copyId,bindings=[],field='body')=>{
  const hits=records.filter(r=>r.copyId===copyId&&r.copyVersion===FOUR_PILLARS_COPY_VERSION);
  if(hits.length!==1)throw Error('COPY_MISSING_OR_AMBIGUOUS');const record=hits[0];
  if(record.reviewStatus!=='draft'||record.releaseEnabled!==false||!record[field]||!record.source?.pageUrl)throw Error('COPY_NOT_DRAFT');
  frame.segments.push({copyId,copyVersion:record.copyVersion,text:record[field],field,source:record.source,reviewStatus:record.reviewStatus,releaseEnabled:false,bindings});
 };
 const binding=(path,label,subjectId=scope.subjectId)=>({path,label,subjectId});
 const stem=(value,context,path,subjectId=scope.subjectId,field='body')=>{if(!copyStemIds[value])throw Error('DAY_STEM_REQUIRED');emit(`baz.day-stem.${copyStemIds[value]}.${context}`,[binding(path,value,subjectId)],field);};
 const placements=(rows,context,field='body')=>{
  if(!Array.isArray(rows)||!rows.length)throw Error('PLACEMENTS_REQUIRED');
  const groups=new Map();for(const row of rows){if(!copyGodIds[row.tenGod]||!copyPillarLabels[row.pillar]||!row.position||!row.stem)throw Error('PLACEMENT_INVALID');const list=groups.get(row.tenGod)||[];list.push(binding('placements',`${copyPillarLabels[row.pillar]}・${row.position} ${row.stem}（${row.tenGod}）`));groups.set(row.tenGod,list);}
  for(const [god,bindings] of groups)emit(`baz.ten-god.${copyGodIds[god]}.${context}`,bindings,field);
 };
 const period=(item,path,field='body')=>{if(!item?.startStandard||!item.endExclusiveStandard||!item.ganzhi||!copyGodIds[item.stemTenGod])throw Error('PERIOD_REQUIRED');emit(`baz.ten-god.${copyGodIds[item.stemTenGod]}.period`,[binding(path,`${item.ganzhi}（${item.stemTenGod}） ${item.startStandard} 〜 ${item.endExclusiveStandard}`)],field);};
 const comparison=(data,separateFrames=false)=>{
  if(data.subjectId!==scope.subjectId||data.partnerSubjectId!==scope.partnerSubjectId||!scope.partnerSubjectId||!Array.isArray(data.matches)||!Array.isArray(data.includedPillars)||!data.dayStemRelation)throw Error('COMPARISON_REQUIRED');
  const refs=[binding('dayStemRelation',`本人 ${data.dayStemRelation.subjectStem}`),binding('dayStemRelation',`相手 ${data.dayStemRelation.partnerStem}`,scope.partnerSubjectId)];
  if(!data.matches.length)emit('baz.comparison.no-combination-clash',[binding('includedPillars',`確定した対応${data.includedPillars.length}柱の範囲`)]);
  if(separateFrames)start('day-elements','日干の五行');emit(`baz.comparison.${data.dayStemRelation.elementRelation}`,refs);
  if(separateFrames)start('day-polarity','日干の陰陽');emit(`baz.comparison.${data.dayStemRelation.polarityRelation}`,refs);
  for(const [index,match] of data.matches.entries()){if(!['stem-combination','branch-combination','branch-clash'].includes(match.kind)||!data.includedPillars.includes(match.pillar))throw Error('MATCH_INVALID');if(separateFrames)start(`match-${index}`,`${copyPillarLabels[match.pillar]}の比較`);emit(`baz.comparison.${match.kind}`,[binding('matches',`${copyPillarLabels[match.pillar]} ${match.subjectValue}`),binding('matches',`${copyPillarLabels[match.pillar]} ${match.partnerValue}`,scope.partnerSubjectId)]);}
 };
 const data=page.data;
 try{
  switch(page.pageDefinitionId){
  case 'BAZ-01':
   if(!Array.isArray(data.includedPillars)||!['year','month','day'].every(k=>data.includedPillars.includes(k)&&data.pillars?.[k]))throw Error('PILLARS_REQUIRED');
   for(const key of data.includedPillars){if(!copyPillarLabels[key]||!data.pillars[key])throw Error('PILLAR_INVALID');start(key,copyPillarLabels[key]);emit(`baz.pillar.${key}`,[binding(`pillars.${key}`,data.pillars[key])]);}
   if(!data.includedPillars.includes('hour'))emit('baz.hour.unknown');break;
  case 'BAZ-02':start('day-stem','日干');stem(data.dayStem,'basic','dayStem');start('reading','読み方');emit('baz.day-stem.reading');break;
  case 'BAZ-03':{
   const keys=['wood','fire','earth','metal','water'];if(![6,8].includes(data.total)||keys.some(k=>!Number.isInteger(data.visibleElementCounts?.[k])||data.visibleElementCounts[k]<0)||keys.reduce((s,k)=>s+data.visibleElementCounts[k],0)!==data.total)throw Error('COUNTS_REQUIRED');
   start('composition','五行の構成');emit('baz.elements.composition');for(const key of keys)emit(`baz.element.${key}`,[binding(`visibleElementCounts.${key}`,String(data.visibleElementCounts[key]))]);start('reading','読み方');emit('baz.elements.reading');break;}
  case 'BAZ-04':for(const [key,title] of [['basic','才能'],['work','仕事'],['relationship','対人']]){start(key,title);placements(data.placements,key,'short');}break;
  case 'BAZ-05':
   if(!Array.isArray(data.rows)||!data.rows.length)throw Error('STAGES_REQUIRED');start('placement','十二運の配置');emit('baz.stages.placement');start('reading','十二運の読み方');emit('baz.stages.reading');for(const row of data.rows){const stage=row.twelveStage==='臨官'?'建禄':row.twelveStage;if(!copyStageIds[stage]||!copyPillarLabels[row.pillar])throw Error('STAGE_INVALID');emit(`baz.stage.${copyStageIds[stage]}`,[binding('rows',`${copyPillarLabels[row.pillar]} ${row.branch}・${stage}`)]);}break;
  case 'BAZ-06':if(!Array.isArray(data.intervals)||data.intervals.length!==10)throw Error('INTERVALS_REQUIRED');start('reading','大運の読み方');emit('baz.dayun.reading');start('periods','期間テーマ');for(const item of data.intervals)period(item,`intervals.${item.index}`);emit('baz.period.reading');break;
  case 'BAZ-07':start('current','現在の大運');emit('baz.dayun.current');period(data.currentDayun,'currentDayun','short');start('annual','当節年');emit('baz.annual.current');period(data.annual,'annual');break;
  case 'BAZ-08':start('overview','命式の比較');emit('baz.comparison.overview');comparison(data,true);break;
  case 'BAZ-09':start('love','恋愛観');stem(data.dayStem,'love','dayStem');start('partnership','結婚観');if(!copyBranchIds[data.dayBranch])throw Error('DAY_BRANCH_REQUIRED');emit(`baz.day-branch.${copyBranchIds[data.dayBranch]}.partnership`,[binding('dayBranch',data.dayBranch)]);start('growth','関係を育てる視点');emit('baz.love.growth');placements(data.placements,'relationship','short');break;
  case 'BAZ-10':start('strength','強み');placements(data.placements,'basic');start('work','働き方');placements(data.placements,'work');start('social','社会との関わり');emit('baz.career.social',data.placements.map(row=>binding('placements',`${copyPillarLabels[row.pillar]}・${row.position} ${row.stem}（${row.tenGod}）`)));break;
  case 'BAZ-11':if(!Array.isArray(scope.includedPillars)||!['year,month,day','year,month,day,hour'].includes(scope.includedPillars.join(',')))throw Error('WEALTH_SCOPE_REQUIRED');if(!Array.isArray(data.wealthPlacements))throw Error('WEALTH_REQUIRED');start('wealth','お金との関わり');emit('baz.wealth.reading',[binding('includedPillars',`掲載範囲：${(scope.includedPillars||[]).map(k=>copyPillarLabels[k]).join('・')}`)]);if(!data.wealthPlacements.length)emit('baz.wealth.none');else if(data.wealthPlacements.some(row=>!['偏財','正財'].includes(row.tenGod)||!copyPillarLabels[row.pillar]||!row.position||!row.stem))throw Error('WEALTH_INVALID');else for(const god of ['偏財','正財']){const rows=data.wealthPlacements.filter(row=>row.tenGod===god);if(rows.length)emit(`baz.wealth.${copyGodIds[god]}`,rows.map(row=>binding('wealthPlacements',`${copyPillarLabels[row.pillar]}・${row.position} ${row.stem}（${god}）`)));}start('use','活用の視点');emit('baz.wealth.use');break;
  case 'BAZ-12':if(!data.family?.context||data.family.context==='parent-child'&&!data.family.parentDirection)throw Error('FAMILY_REQUIRED');start('difference','2名の特徴の違い');emit('baz.family.difference');stem(data.dayStemRelation?.subjectStem,'basic','dayStemRelation.subjectStem',scope.subjectId,'short');stem(data.dayStemRelation?.partnerStem,'basic','dayStemRelation.partnerStem',scope.partnerSubjectId,'short');comparison(data);start('dialogue','関わり方');emit('baz.family.dialogue',[binding('family',`${data.family.context} ${data.family.parentDirection||''}`)]);break;
  case 'BAZ-13':if(!Array.isArray(data.years)||data.years.length!==2)throw Error('YEARS_REQUIRED');for(const [index,year] of data.years.entries()){if(!Array.isArray(year.correspondingDayun)||!year.correspondingDayun.length)throw Error('YEAR_DAYUN_REQUIRED');start(`year-${year.year}`,`${year.year}節年`);if(index===0)emit('baz.annual.compare');period(year,`years.${year.year}`);for(const item of year.correspondingDayun){if(!item.ganzhi||!item.startStandard||!item.endExclusiveStandard)throw Error('YEAR_DAYUN_REQUIRED');frame.segments.at(-1).bindings.push(binding(`years.${year.year}.correspondingDayun`,`${item.ganzhi} ${item.startStandard} 〜 ${item.endExclusiveStandard}`));}}break;
  case 'BAZ-14':if(!data.boundaryStandard||!Number.isInteger(data.age?.fullYears))throw Error('BOUNDARY_REQUIRED');start('transition','大運の切り替わり');emit('baz.dayun.transition',[binding('boundaryStandard',`${data.boundaryStandard}・満${data.age.fullYears}歳`)]);period(data.currentDayun,'currentDayun','short');period(data.nextDayun,'nextDayun','short');start('relation','命式との関係');emit('baz.dayun.relation');period(data.currentDayun,'currentDayun');period(data.nextDayun,'nextDayun');break;
  default:throw Error('PAGE_UNCONNECTED');
  }
  return {...result,state:'draft-preview',frames};
 }catch(error){return {...result,state:'source-missing',reason:error.message};}
}
