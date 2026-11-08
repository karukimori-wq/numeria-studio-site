import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('real screen handlers retain edits made while saving and preserve inputs on conflicts', async () => {
  const source=readFileSync(new URL('../src/app-route-runtime.js',import.meta.url),'utf8');
  const start=source.indexOf('  async function showCharacters('),end=source.indexOf('  function reportListBody(',start);
  const element=()=>({children:[],append(...nodes){this.children.push(...nodes);},setAttribute(){},textContent:'',disabled:false});
  const ids=Object.fromEntries(['character-feedback','character-official','character-custom'].map(id=>[id,element()]));
  let resolveSave, rejectSave, submitted;
  const context=vm.createContext({document:{getElementById:id=>ids[id],createElement:element},dispatchSequence:1,renderLoading(){},renderSurface(){},renderError(){throw Error('unexpected screen error');},escapeHtml:String,
    apiJson:async(path,init)=>{
      if(init?.method==='PUT'){submitted=JSON.parse(init.body);return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;});}
      if(path.endsWith('/official'))return {characters:[]};
      if(path.endsWith('/selection'))return {selection:null};
      return {characters:[{characterId:'custom',versions:[{version:1,name:'Original',surfaceParameters:Array(9).fill(50)}]}]};
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
});
