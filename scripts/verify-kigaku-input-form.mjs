import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('scripts/kigaku-input-form-runtime.js','utf8');
let snapshot={id:'fixture-session',divination:'nine-star-ki',kigakuInput:{referenceInstant:'2026-11-09T12:34:56+09:00',partnerSubjectId:'retained-partner',birthClock:{date:'1990-06-15',time:null,zoneConfirmed:true}}};
let updates=[],saves=0,fail=false,resolveSave;
const fields=Object.fromEntries(['offset','partnerOffset','date','time','reference','confirm','save','status','partnerEnabled','partnerName','partnerDate','partnerTime','partnerConfirm','loveRelationship','workRelationship','familyRelationship','workTheme','selectedDirection','directionPurpose'].map(key=>[key,{value:'',checked:false,textContent:'',disabled:false}]));
const container={append(){},innerHTML:'',querySelector(selector){return fields[selector.match(/data-kigaku-(\w+)/)[1]];}};
const api={getReadingSnapshot:()=>snapshot,updateKigakuInput(input){updates.push(input);return{ok:true};},async saveReadingDraft(){saves++;if(fail)throw Error('fixture');if(resolveSave)await new Promise(resolve=>{resolveSave=resolve;});}};
const context=vm.createContext({window:{NumeriaNavigation:api},structuredClone,Date,container,document:{createElement:()=>({innerHTML:""})}});
vm.runInContext(source+';mountKigakuInputForm(container)',context);
fields.date.value='1990-06-15';fields.confirm.checked=true;
await fields.save.onclick();
assert.equal(updates[0].referenceInstant,'2026-11-09T12:34:56+09:00','Reopening must preserve saved seconds.');
assert.equal(updates[0].birthClock.time,null);
assert.equal(updates[0].partnerSubjectId,'retained-partner');
fields.date.oninput();assert.equal(fields.confirm.checked,false);
await fields.save.onclick();assert.equal(saves,1);
fields.confirm.checked=true;snapshot={...snapshot,id:'other-session'};
await fields.save.onclick();assert.equal(saves,1);assert.match(fields.status.textContent,/切り替わり/);
snapshot={...snapshot,id:'fixture-session'};fail=true;
await fields.save.onclick();assert.match(fields.status.textContent,/保存できません/);assert.equal(fields.save.disabled,false);
fail=false;resolveSave=true;const pending=fields.save.onclick();await fields.save.onclick();assert.equal(saves,3);resolveSave();await pending;
assert.equal(fields.save.disabled,false);
assert(!fields.status.textContent.includes('保存しました'));
console.log('Kigaku form VM: fixed reference seconds, unknown time, retained partner, confirmation reset, session switch, failure and duplicate-save guard PASS; not browser acceptance.');

fields.partnerEnabled.checked=true;fields.partnerName.value='架空の相手';fields.partnerDate.value='1991-09-12';fields.partnerConfirm.checked=false;
await fields.save.onclick();assert.match(fields.status.textContent,/相手/);
fields.partnerConfirm.checked=true;fields.selectedDirection.value='NE';fields.directionPurpose.value='move';resolveSave=null;
await fields.save.onclick();assert.equal(updates.at(-1).partnerBirthClock.time,null);assert.equal(updates.at(-1).selectedDirection,'NE');assert.equal(updates.at(-1).directionPurpose,'move');

assert.equal(fields.reference.readOnly,true);const count=saves;fields.reference.value='2027-01-01T00:00';await fields.save.onclick();assert.equal(saves,count);assert.match(fields.status.textContent,/新規鑑定/);

// Reopening and resaving must preserve both explicit fold choices.
snapshot={id:'fold-session',divination:'nine-star-ki',kigakuInput:{referenceInstant:'2026-11-09T12:34:56+09:00',birthClock:{date:'1948-09-12',time:'00:30:45',zoneConfirmed:true,offsetChoiceMinutes:600},partnerName:'fixture',partnerSubjectId:'fold-partner',partnerBirthClock:{date:'1948-09-12',time:'00:30:45',zoneConfirmed:true,offsetChoiceMinutes:540}}};
vm.runInContext('mountKigakuInputForm(container)',context);
assert.equal(fields.offset.value,'600'); assert.equal(fields.partnerOffset.value,'540');
fields.date.value='1948-09-12';fields.time.value='00:30:45';fields.confirm.checked=true;
await fields.save.onclick();
assert.equal(updates.at(-1).birthClock.offsetChoiceMinutes,600);assert.equal(updates.at(-1).partnerBirthClock.offsetChoiceMinutes,540);
fields.time.oninput();assert.equal(fields.offset.value,'');assert.equal(fields.confirm.checked,false);
fields.partnerTime.oninput();assert.equal(fields.partnerOffset.value,'');assert.equal(fields.partnerConfirm.checked,false);
