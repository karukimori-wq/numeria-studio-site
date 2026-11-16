import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('scripts/block-editor-runtime.js','utf8');
const helpers=source.slice(source.indexOf('const editorPages=')>=0?source.indexOf('const editorPages='):source.indexOf('const current='),source.indexOf('const isFixedPage='));
const renderer=source.slice(source.indexOf('function render(){'),source.indexOf('function bind(){'));
const page=(pageId,title,methodKey)=>({pageId,title,...(methodKey?{methodKey,pageDefinitionId:methodKey==='numerology'?'NUM-01':'TAR-01'}:{}),layoutRegions:[]});
const pages=[page('cover','共通表紙'),page('num','数秘専用','numerology'),page('tar','他占術の本文を保持','tarot'),page('free','共有自由ページ')];
const data={selectedDivination:'numerology',pages};const snapshot=JSON.stringify(data);
const root={innerHTML:'',className:''};
const context=vm.createContext({data,selected:'tar',root,T:{},DIVINATION:{numerology:{label:'数秘術',catalogSelectable:true},tarot:{label:'タロット',catalogSelectable:true}},tab:'edit',status:'fixture',history:[],future:[],insertion:null,esc:String,bind(){},remember(){},renderBlock(){throw Error('No blocks in this fixture');}});
vm.runInContext(helpers+renderer+';render();',context);
assert.ok(root.innerHTML.includes('data-page="cover"'));
assert.ok(root.innerHTML.includes('data-page="num"'));
assert.ok(root.innerHTML.includes('data-page="free"'));
assert.ok(!root.innerHTML.includes('data-page="tar"'),'A previously visited method must not leak into the selected method page list.');
assert.equal(vm.runInContext('current().pageId',context),'cover','Changing method must not keep the foreign page editable.');
assert.equal(JSON.stringify(data),snapshot,'Hiding foreign pages must not delete or change their saved content.');
assert.equal(vm.runInContext("adjacentEditorPage('num',1).pageId",context),'free','Next-page operations must skip foreign pages.');
assert.equal(vm.runInContext("adjacentEditorPage('num',-1).pageId",context),'cover');
assert.equal(vm.runInContext("adjacentEditorPage('missing',1)",context),null);
const foreignPage=data.pages[2];
vm.runInContext("selected='num';moveEditorPage(1)",context);
assert.deepEqual(data.pages.map(page=>page.pageId),['cover','free','tar','num']);
assert.equal(data.pages[2],foreignPage,'Reordering the selected method must preserve the hidden foreign page.');
vm.runInContext("selected='tar'",context);


data.selectedDivination='tarot';
vm.runInContext('render();',context);
assert.ok(root.innerHTML.includes('data-page="tar"'));assert.ok(!root.innerHTML.includes('data-page="num"'));
assert.equal(vm.runInContext('current().pageId',context),'tar');
// A scope containing no shared or matching page must show a safe loading state.
data.selectedDivination='numerology';data.pages=[pages[2]];
vm.runInContext('render();',context);
assert.equal(vm.runInContext('current()',context),null);
assert.ok(!root.innerHTML.includes('他占術の本文を保持'));
console.log('Editor method scope: page list and current page isolate methods, shared pages remain, saved foreign content survives, no-match state exposes no foreign page.');
