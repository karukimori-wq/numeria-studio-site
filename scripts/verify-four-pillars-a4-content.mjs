import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fixtureDocument,FixtureElement} from './lib/html-fixture-dom.mjs';
import {withFourPillarsCalculationCheckpoint as attach} from '../src/four-pillars-calculation-checkpoint.js';
import {buildFourPillarsDraftPreview as build,renderFourPillarsDraftPage as render} from '../src/four-pillars-draft-preview.js';
import {reportPageDefinitionsFor} from '../src/report-page-definitions.js';
const clock={date:'1948-09-12',time:'00:30:45',countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:600};
const snapshot=attach({id:'a4-content-synthetic',divination:'four-pillars',fourPillarsInput:{methodKey:'four-pillars',subjectId:'a',partnerSubjectId:'b',birthClock:clock,partnerBirthClock:{...clock,offsetChoiceMinutes:540},referenceDate:'2026-11-20',calculationSex:'female',familyContext:'parent-child',parentDirection:'a-parent'}});
const model=build(snapshot,reportPageDefinitionsFor('four-pillars','pro'));
const normalize=value=>value.replace(/\s+/g,'');
for(const {definition} of model.pages){
 const html=render(model,definition.pageDefinitionId),document=fixtureDocument(html),source=document.root.children[0];
 const context=vm.createContext({document});vm.runInContext(readFileSync('scripts/four-pillars-a4-runtime.js','utf8'),context);context.source=source;
 const units=vm.runInContext('baziA4SourceUnits(source)',context),clean=vm.runInContext('baziA4Clone(source)',context);
 for(const name of ['data','copy']){
  const target=new FixtureElement('div');if(name==='copy')units.copyPrefix.forEach(node=>target.append(node.cloneNode(true)));
  context.target=target;context.indices=Array.from({length:units[name].length},(_,i)=>i);context.units=units[name];vm.runInContext('baziA4AppendUnits(target,indices,units)',context);
  assert.equal(normalize(target.textContent),normalize(clean.querySelector(`.nbdp-${name}`).textContent),`${definition.pageDefinitionId} ${name} content lost or reordered`);
  if(name==='data')assert.equal(target.querySelectorAll('svg').length,source.querySelectorAll('svg').length);
  if(definition.pageDefinitionId==='BAZ-14'&&name==='data'){assert(target.textContent.includes('満81歳'));assert(target.textContent.includes('2029-12-24'));assert(target.textContent.includes('Asia/Tokyo'));}
 }
 if(definition.pageDefinitionId==='BAZ-06'){
  const tableUnits=units.data.filter(unit=>!unit.atomic);assert.equal(tableUnits.length,10);
  for(const unit of [tableUnits[0],tableUnits[9]]){const group=unit.create();unit.append(group);assert.equal(group.querySelectorAll('thead').length,1);assert.equal(group.querySelectorAll('tbody > tr').length,1);}
 }
}
console.log('Actual renderer HTML to A4 units: all 14 data/copy texts and SVG counts preserved, list suffix unit/timezone/boundary/full age retained, repeated table headers and rows PASS. Geometry is checked separately in-browser.');
