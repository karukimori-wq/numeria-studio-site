import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Execute the actual built host history branch, rather than a duplicate router.
const dir='dist/assets';
const {readdirSync}=await import('node:fs');
const file=readdirSync(dir).find(name=>/^numeria-app-runtime-.*\.js$/.test(name));
assert.ok(file,'Run npm run build first');
const source=readFileSync(`${dir}/${file}`,'utf8');
const branch=source.match(/if\(t\.snapshot\?\.schemaVersion===`numeria\.kigaku\.reading\.v1`\)\{[^}]+return\}/)?.[0];
assert.ok(branch,'Host history route must contain the nine-star branch');
for(const id of ['completed-fixture','draft-fixture']) {
 const calls=[];const window={};
 const context={window,t:{id,snapshot:{schemaVersion:'numeria.kigaku.reading.v1'}},u:v=>calls.push(['divination',v]),k:v=>calls.push(['route',v]),re:v=>calls.push(['mode',v])};
 vm.runInNewContext(`(function(){${branch}})()`,context);
 assert.equal(window.NumeriaKigakuPendingRestore,id);
 assert.deepEqual(calls,[['divination','nine-star-ki'],['route','reading'],['mode','edit']]);
}
for(const snapshot of [null,{}, {schemaVersion:'legacy.v1'}]) {
 const window={};
 vm.runInNewContext(`(function(){${branch}})()`,{window,t:{id:'legacy',snapshot},u(){assert.fail('legacy intercepted')},k(){assert.fail('legacy intercepted')},re(){assert.fail('legacy intercepted')}});
 assert.equal(window.NumeriaKigakuPendingRestore,undefined);
}
console.log('Built host history branch: draft/completed IDs forwarded, nine-star route selected, legacy records untouched. Host browser clicks remain separate.');
