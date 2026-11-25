import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
let source = readFileSync('assets/numeria-app-Cckhajir.js', 'utf8');
const legacyPatch = readFileSync('scripts/patch-legacy-static-assets.mjs', 'utf8').replace(/^import .*;\n/, '');
vm.runInNewContext(legacyPatch, { readFileSync: () => source, writeFileSync: (_p, value) => { source = value; }, console: { log() {} } });
const patch = readFileSync('scripts/patch-reading-session-transition.mjs', 'utf8').replace(/^import .*;\n/, '');
vm.runInNewContext(patch, { readdirSync: () => ['numeria-app-fixture.js'], readFileSync: () => source, writeFileSync: (_p, value) => { source = value; }, console: { log() {} } });
const start = source.indexOf('onClick:()=>{if(n?.snapshot?.id){window.NumeriaAppRoutes.navigate(');
assert.ok(start > 0);
const click = source.slice(start + 'onClick:'.length, source.indexOf(',children:[', start));
for (const snapshot of [undefined, { id: 'saved', divination: 'numerology', message: 'saved writing' }]) {
  const calls = [];
  const context = { window: { NumeriaAppRoutes: { navigate: path => calls.push(['navigate', path]) } }, e: { id: 'target' }, n: { snapshot, divination: 'numerology' }, na: [{ id: 'numerology', defaultMenuName: '数秘術鑑定', defaultPrice: 8800 }] };
  for (const name of ['Y', 'hi', 'u', 'Ce', 'Te']) context[name] = (...args) => calls.push([name, ...args]);
  vm.runInNewContext(`(${click})()`, context);
  if (snapshot) assert.deepEqual(calls, [['navigate', '/app/readings/saved']], 'Saved row must restore the original snapshot and never create a new session.');
  else assert.deepEqual(calls, [['u', 'numerology'], ['hi', 'target'], ['Ce', '数秘術鑑定'], ['Te', 8800]]);
}
const offset = source.indexOf('hi=e=>{');
const handler = source.slice(offset + 3, source.indexOf(',gi=', offset));
const state = {}, context = { d: [{ id: 'target', name: '架空', birthName: 'TEST', birthday: '2000-01-02' }], W: { defaultMenuName: 'new', defaultPrice: 0 }, Qo: () => ({}), $o: () => ({ own: 'new result' }) };
for (const name of ['ut','ft','Rt','le','ue','fe','me','ge','ve','Fe','Le','ze','Ve','Ge','Ue','qe','je','Ne','De','ke','Bt','ie','oe','se','mt','V','ye','xe','Ce','Te','Sn','wn','Tn','k','re']) context[name] = value => { state[name] = value; };
vm.runInNewContext(`(${handler})('target')`, context);
for (const name of ['ut','ft','Fe','ue','fe','me','ge','je','Ne','ye']) assert.equal(state[name], '', `Previous personal content must clear: ${name}`);
for (const name of ['Ge','Ve','Ue','qe']) assert.ok(Object.values(state[name]).every(value => value === ''));
assert.equal(state.Ue.meishiki, '');assert.equal(state.qe.intro, '');
assert.equal(state.Rt.length, 0);assert.equal(state.le, false);assert.equal(state.V, null);assert.equal(state.Bt, 'target');assert.equal(state.ie, '架空');assert.equal(state.mt.own, 'new result');
assert.equal(state.Le.points, '');assert.equal(state.Le.realization, '');assert.equal(state.Le.encouragement, '');
console.log('Actual dashboard handler restores saved snapshots; customer-only transition clears prior writing, partner, birth inputs, and session identity.');

// Execute the real restore handler with nonempty previous state and blank/missing
// saved inputs. This catches both truthy-only restoration and stale object merges.
const resumeOffset = source.indexOf('Y=(e,t)=>{');
const resumeHandler = source.slice(resumeOffset + 2, source.indexOf(',Li=', resumeOffset));
for (const saved of [{}, { intro: undefined, advice: undefined, customReportItems: undefined }, { manticBirthTime: '', manticBirthPlace: '', fourPillarsComments: { meishiki: 'saved comment' }, manticReadingText: 'saved body' }]) {
  const restored = {}, restoreContext = { d: [], ar: 'pro', tr: 'admin', window: { setTimeout() {} }, Ie: { points: 'old' }, We: { overview: 'old' }, He: { elements: 'old' }, Ke: { intro: 'old' } };
  for (const name of ['Bt','V','ie','oe','se','ye','ut','ft','mt','ht','_t','yt','xt','Ct','Tt','Dt','L','At','Mt','Pt','It','Rt','le','ue','fe','me','ge','ve','Zt','xe','Ce','Te','u','je','Ne','De','ke','Fe','Le','ze','Ve','Ge','Ye','Ze','$e','tt','rt','at','Ue','qe','Sn','wn','Tn','k','re','R']) restoreContext[name] = value => { restored[name] = value; };
  const snapshot = { id: 'saved', name: 'saved name', divination: 'numerology', intro: 'saved intro', advice: 'saved advice', drafts: { overview: 'saved section' }, customReportItems: [], reportTypography: {}, ...saved };
  vm.runInNewContext(`(${resumeHandler})('target', session)`, { ...restoreContext, session: { snapshot, date: '2026.11.25' } });
  assert.equal(restored.je, '');assert.equal(restored.Ne, '');assert.equal(restored.Le.points, '');assert.equal(restored.Ge.overview, '');assert.equal(restored.Ue.elements, '');assert.equal(restored.qe.intro, '');
  assert.equal(restored.Ue.meishiki, saved.fourPillarsComments?.meishiki || '');assert.equal(restored.Fe, saved.manticReadingText || '');
  assert.equal(restored.ut, Object.hasOwn(saved, 'intro') ? '' : 'saved intro');assert.equal(restored.ft, Object.hasOwn(saved, 'advice') ? '' : 'saved advice');
  for (const key of ['ue','fe','me','ge','ve']) assert.equal(restored[key], '');
  assert.equal(restored.le, false);assert.equal(restored.mt.overview, 'saved section');assert.equal(restored.V, 'saved');
}
console.log('Actual saved-session restore preserves saved writing and clears blank/missing birth inputs and partial comments.');

const prepareStart = source.indexOf('Ci=async()=>{');
const prepareHandler = source.slice(prepareStart + 3, source.indexOf(',wi=', prepareStart));
let savedExisting = 0;
await vm.runInNewContext(`(${prepareHandler})()`, { Dn: 'restored-id', Ii: () => { savedExisting++; return 'saved'; } });
assert.equal(savedExisting, 1, 'Resumed mantic save must use the existing-ID editor path, not allocate a new appraisal.');
