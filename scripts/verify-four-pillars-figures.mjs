import assert from 'node:assert/strict';
import {withFourPillarsCalculationCheckpoint as attach} from '../src/four-pillars-calculation-checkpoint.js';
import {buildFourPillarsDraftPreview as build,renderFourPillarsDraftPage as render} from '../src/four-pillars-draft-preview.js';
import {buildFourPillarsDraftFigures as figures} from '../src/four-pillars-figures.js';
import {validateReportFigure,renderReportFigure} from '../src/report-figure-renderer.js';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';
import {reportFigureTypesForPage} from '../src/report-figure-types.js';
import {assessReportPageAvailability} from '../src/report-page-availability.js';
const clock={date:'1948-09-12',time:'00:30:45',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:600};
const snapshot=attach({id:'figure-synthetic',divination:'four-pillars',fourPillarsInput:{methodKey:'four-pillars',subjectId:'figure-a',partnerSubjectId:'figure-b',birthClock:clock,partnerBirthClock:{...clock,offsetChoiceMinutes:540},referenceDate:'2026-11-19',calculationSex:'female',familyContext:'parent-child',parentDirection:'a-parent'}});
const defs=reportPageDefinitionsFor('four-pillars','pro'),model=build(snapshot,defs),page=id=>model.pages.find(p=>p.definition.pageDefinitionId===id).projection;
const figure=id=>figures(page(id),model).figures[0];
const before=JSON.stringify(snapshot);
for(const {definition,projection} of model.pages){
 const result=figures(projection,model);assert.equal(result.available,true,definition.pageDefinitionId);assert.equal(result.publicationAllowed,false);assert.deepEqual(result.figures.map(f=>f.type),reportFigureTypesForPage(definition));
 for(const f of result.figures){assert.equal(validateReportFigure(f).ok,true);assert.equal(f.publicationAllowed,false);assert.equal(f.verificationState,'review-required');assert.deepEqual(f.resultBindings[0].sourceData,projection.data);assert.equal(f.resultRevision,model.draftRevision);assert.equal(f.calculationVersion,model.calculationVersion);assert(!renderReportFigure(f).includes('図表を表示できません'));}
 for(const layoutId of ['standard','magazine']){const html=render({...model,layoutId},definition.pageDefinitionId);assert(html.includes(`data-figure-type="${result.figures[0].type}"`));assert(html.includes('正式発行：不可'));assert(!html.includes('undefined'));}
 assert.equal(assessReportPageAvailability(definition,snapshot.fourPillarsCalculation).available,false);
}
assert.equal(JSON.stringify(snapshot),before);
assert.equal(figure('BAZ-01').data.rows.length,4);
assert.equal(figure('BAZ-03').data.denominator,8);assert.deepEqual(figure('BAZ-03').data.items.map(i=>i.value),[0,1,2,2,3]);
const graph=figure('BAZ-04');assert.equal(graph.data.nodes[0].id,'日主');assert.equal(graph.data.nodes[0].value,'己');assert.equal(graph.data.scoreAxis,false);assert(graph.data.edges.every(e=>e.from==='日主'));assert(!graph.data.nodes.some(n=>n.id==='日柱・天干'));
assert.equal(figure('BAZ-06').data.rows.length,10);assert.equal(figure('BAZ-07').data.items.length,2);
assert.deepEqual(figure('BAZ-08').subjectRefs,['figure-a','figure-b']);assert(figure('BAZ-08').alt.includes('0件'));assert(figure('BAZ-12').alt.includes('本人：親'));
assert.equal(figure('BAZ-13').data.items.length,4);assert(figure('BAZ-13').data.items.every(i=>Date.parse(i.end)>Date.parse(i.start)));
const boundary=figure('BAZ-14');assert.equal(boundary.data.items[0].end,boundary.data.items[1].start);assert(boundary.data.unit.includes('満81歳'));
const noWealth=structuredClone(page('BAZ-11'));noWealth.state='valid-zero';noWealth.data.wealthPlacements=[];assert.equal(figures(noWealth,model).figures[0].state,'empty');
delete noWealth.data.wealthPlacements;assert.equal(figures(noWealth,model).available,false);
for(const badScope of [{...model,methodKey:'tarot'},{...model,publicationAllowed:true},{...model,subjectId:'wrong'},{...model,partnerSubjectId:'wrong'}])assert.equal(figures(page('BAZ-08'),badScope).available,false);
const malformed=[['BAZ-01',d=>d.pillars.year='甲丑'],['BAZ-02',d=>d.pillars.month='乙子'],['BAZ-06',d=>d.intervals[0].ganzhi='甲丑'],['BAZ-08',d=>d.partnerPillars.day='甲丑'],['BAZ-09',d=>delete d.dayBranch],['BAZ-03',d=>delete d.visibleElementCounts.wood],['BAZ-06',d=>d.intervals.pop()],['BAZ-06',d=>d.intervals[0].endExclusiveStandard='not-a-date'],['BAZ-08',d=>delete d.matches],['BAZ-13',d=>d.years.pop()],['BAZ-13',d=>d.years[0].correspondingDayun=[]],['BAZ-14',d=>d.boundaryStandard='2000-01-01']];
for(const [id,mutate] of malformed){const bad=structuredClone(page(id));mutate(bad.data);assert.equal(figures(bad,model).available,false,id);}
const unknown=attach({...snapshot,fourPillarsInput:{...snapshot.fourPillarsInput,birthClock:{...clock,date:'2000-01-07',time:null,offsetChoiceMinutes:null}}});
const unknownModel=build(unknown,defs),unknownPage=id=>unknownModel.pages.find(p=>p.definition.pageDefinitionId===id).projection;
assert.equal(figures(unknownPage('BAZ-01'),unknownModel).figures[0].data.rows.length,3);assert.equal(figures(unknownPage('BAZ-03'),unknownModel).figures[0].data.denominator,6);assert.equal(figures(unknownPage('BAZ-06'),unknownModel).available,false);
assert.equal(figures(page('BAZ-11'),{...model,includedPillars:[]}).available,false);
const changed=structuredClone(snapshot);changed.fourPillarsCalculation.calculation.pages[0].data.pillars.year='甲子';assert.notEqual(build(changed,defs).draftRevision,model.draftRevision);
const free=build(snapshot,reportPageDefinitionsFor('four-pillars','free'));assert.equal(free.pages.length,5);assert(!render(free,'BAZ-14').includes('data-figure-type'));
console.log('Four Pillars figures: canonical 14-page type mapping, actual draft values, shared renderer/validation, placement-only edges, complete intervals/pair scope, six/eight counts, zero/missing, provenance identity, Free filtering and no formal approval PASS.');
