import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('real screen handlers retain edits made while saving and preserve inputs on conflicts', async () => {
  const source=readFileSync(new URL('../src/app-route-runtime.js',import.meta.url),'utf8');
  const start=source.indexOf('  async function showCharacters('),end=source.indexOf('  function reportListBody(',start);
  const element=()=>({children:[],append(...nodes){this.children.push(...nodes);},setAttribute(){},replaceChildren(...nodes){this.children=[...nodes];},textContent:'',disabled:false});
  const ids=Object.fromEntries(['character-feedback','character-official','character-custom','character-create'].map(id=>[id,element()]));
  let resolveSave, rejectSave, submitted, blankFailure=false, requests=0;
  const context=vm.createContext({document:{getElementById:id=>ids[id],createElement:element},dispatchSequence:1,renderLoading(){},renderSurface(){},renderError(){throw Error('unexpected screen error');},escapeHtml:String,
    apiJson:async(path,init)=>{
      requests++;
      if(path==='/api/characters' && init?.method==='POST'){if(blankFailure)throw {status:409,body:{errorCode:'CHARACTER_LIMIT_REACHED'}};submitted=JSON.parse(init.body);return {character:{characterId:'blank',versions:[{version:1,name:submitted.name,surfaceParameters:submitted.surfaceParameters}]}};}
      if(path==='/api/characters/duplicate'){submitted=JSON.parse(init.body);return {character:{characterId:'copy',versions:[{version:1,name:submitted.name,surfaceParameters:Array(9).fill(50)}]}};}
      if(init?.method==='PUT'){submitted=JSON.parse(init.body);return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;});}
      if(path.endsWith('/versions'))return {character:{characterId:'custom',versions:[{version:5,name:'Server name',surfaceParameters:Array(9).fill(80)}]}};
      if(path.endsWith('/official'))return {characters:[{characterId:'official',characterVersion:'1',name:'Official'}]};
      if(path.endsWith('/selection'))return {selection:null};
      return {capabilities:{canCreate:true},characters:[{characterId:'custom',versions:[{version:1,name:'Original',surfaceParameters:Array(9).fill(50)}]}]};
    }});
  vm.runInContext(source.slice(start,end)+';globalThis.show=showCharacters;',context);
  await context.show(1);
  const [label,status,save]=ids['character-custom'].children[0].children,input=label.children[0];
  input.value='First';input.oninput();const pending=save.onclick();
  assert.equal(save.disabled,true);assert.equal(submitted.name,'First');
  input.value='Later';input.oninput();
  resolveSave({character:{latestVersion:2}});await pending;
  assert.equal(input.value,'Later');assert.match(status.textContent,/未保存/);assert.equal(save.disabled,false);
  const retry=save.onclick();assert.equal(submitted.expectedVersion,2);assert.equal(submitted.name,'Later');resolveSave({character:{latestVersion:3}});await retry;
  assert.match(status.textContent,/保存済み/);
  input.value='Keep on conflict';const conflict=save.onclick();rejectSave({status:409});await conflict;assert.equal(input.value,'Keep on conflict');assert.match(status.textContent,/保存競合/);
  const card=ids['character-custom'].children[0];await card.children[5].onclick();assert.match(card.children[6].children[0].textContent,/Server name/);card.children[6].children[1].onclick();assert.equal(input.value,'Keep on conflict');const rebased=save.onclick();assert.equal(submitted.expectedVersion,5);assert.deepEqual(submitted.surfaceParameters,Array(9).fill(80));rejectSave({status:409});await rebased;assert.equal(input.value,'Keep on conflict');
  const blank=ids['character-create'].children,blankName=blank[0].children[0];blankName.value='Blank';await blank[2].onclick();assert.equal(submitted.name,'Blank');assert.deepEqual(submitted.surfaceParameters,Array(9).fill(50));assert.equal(blankName.value,'');assert.equal(input.value,'Keep on conflict');
  blankFailure=true;blankName.value='Retained';await blank[2].onclick();assert.equal(blankName.value,'Retained');assert.match(ids['character-feedback'].textContent,/登録上限/);blankFailure=false;
  const official=ids['character-official'].children;const name=official[1].children[0],duplicate=official[2];name.value='My copy';await duplicate.onclick();assert.equal(submitted.sourceCharacterId,'official');assert.equal(submitted.sourceCharacterVersion,'1');assert.equal(submitted.name,'My copy');assert.equal(ids['character-custom'].children.length,3);assert.equal(ids['character-custom'].children[2].children[0].children[0].value,'My copy');
  const pendingNavigation=save.onclick();const before=status.textContent;context.dispatchSequence=2;resolveSave({character:{latestVersion:99}});await pendingNavigation;assert.equal(status.textContent,before);const count=requests;await save.onclick();await card.children[5].onclick();await blank[2].onclick();await duplicate.onclick();assert.equal(requests,count,'detached controls must not send requests');
});
