import assert from 'node:assert/strict';
import { createKigakuReadingClient } from '../src/kigaku-reading-client.js';
import { createKigakuReading } from '../src/kigaku-reading.js';
const pending = [];
const client = createKigakuReadingClient({ referenceInstant: '2026-10-24T03:00:00Z', onChange() {}, request: (path, body) => new Promise((resolve, reject) => pending.push({ path, body, resolve, reject })) });
const calculate = () => { const promise = client.calculate(); const call = pending.shift(); return { promise, call }; };
let first = calculate(); client.change({ question: 'new' }); first.call.resolve({ reading: createKigakuReading(first.call.body.input) }); await first.promise;
assert.equal(client.current().reading, null); assert.equal(client.current().calculation, 'idle');
const older = calculate(), newer = calculate(); newer.call.resolve({ reading: createKigakuReading(newer.call.body.input) }); await newer.promise; older.call.reject(new Error('stale')); await older.promise;
assert.equal(client.current().calculation, 'ready'); assert.equal(client.current().error, '');
let save = client.save(), call = pending.shift(); client.change({ purpose: 'changed while saving' }); call.resolve({ draftId: call.body.appraisalId, activeDraft: { snapshot: call.body.snapshot } }); await save;
assert.equal(client.current().save, 'unsaved'); assert.equal(client.current().reading, null);
first = calculate(); first.call.resolve({ reading: createKigakuReading(first.call.body.input) }); await first.promise;
save = client.save(); call = pending.shift(); call.resolve({ draftId: 'wrong', activeDraft: { snapshot: call.body.snapshot } }); await save;
assert.equal(client.current().save, 'error');
save = client.save(); call = pending.shift(); call.resolve({ draftId: call.body.appraisalId, activeDraft: { snapshot: call.body.snapshot } }); await save;
assert.equal(client.current().save, 'saved');
const stored = structuredClone(call.body), fixed = stored.snapshot.input.referenceInstant;
client.change({ referenceInstant: '2026-11-01T00:00:00Z' });
let restore = client.restore(); call = pending.shift(); call.resolve({ usage: { activeDraft: { id: stored.appraisalId, snapshot: stored.snapshot } } }); await restore;
assert.equal(client.current().input.referenceInstant, fixed); assert.equal(client.current().save, 'saved');
restore = client.restore(); call = pending.shift(); client.change({ question: 'typed while restoring' }); call.resolve({ usage: { activeDraft: { id: stored.appraisalId, snapshot: stored.snapshot } } }); await restore;
assert.equal(client.current().input.question, 'typed while restoring'); assert.equal(client.current().reading, null);
first = calculate(); client.name('edited'); first.call.resolve({ reading: createKigakuReading(first.call.body.input) }); await first.promise;
assert.equal(client.current().calculation, 'idle');
console.log('Kigaku client: stale calculations/restores, save ACK mismatch, edits during save, fixed reference restore and name edits verified.');
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { createKigakuReadingComponent } = await import('../src/kigaku-reading-ui.js');
globalThis.createKigakuReadingClient = createKigakuReadingClient;
const markup = renderToStaticMarkup(React.createElement(createKigakuReadingComponent(React)));
assert.equal((markup.match(/<details/g) || []).length, 5);
assert.match(markup, /下書きを保存/); assert.match(markup, /出生時刻（不明なら空欄）/);
assert.doesNotMatch(markup, /value="12:00"/);
assert.match(markup, /システム解説は常時掲載/);
console.log('Kigaku React render: five collapsible sections, unknown birth time and draft-only availability verified.');
const { readFileSync, readdirSync } = await import('node:fs');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.ok(pkg.scripts.build.indexOf('patch-kigaku-reading.mjs') < pkg.scripts.build.indexOf('patch-runtime-asset-versioning.mjs'));
// Build verification: inspect the asset actually referenced by the runtime loader.
if (process.argv.includes('--built')) {
  const file = readdirSync('dist/assets').find(x => /^numeria-app-runtime-.*\.js$/.test(x));
  const built = readFileSync(`dist/assets/${file}`, 'utf8');
  assert.match(built, /NumeriaCreateKigakuReadingComponent\(i\)/);
  assert.match(built, /l!==`nine-star-ki`&&A===`edit`/);
  assert.match(built, /l!==`nine-star-ki`&&A===`preview`/);
  assert.match(readFileSync('dist/original.html', 'utf8'), /numeria-kigaku-reading-style/);
  console.log('Kigaku built runtime mount and both legacy route exclusions verified.');
}

client.selectProfile({ id: 'customer-ki', name: '相談者', birthday: '1992-08-17' });
assert.equal(client.current().clientProfileId, 'customer-ki');
assert.equal(client.current().input.birthClock.time, null);
assert.equal(client.current().input.birthClock.zoneConfirmed, false);
assert.equal(client.current().input.question, undefined);
assert.equal(client.current().draftId, null);
first = calculate(); first.call.resolve({ reading: createKigakuReading(first.call.body.input) }); await first.promise;
save = client.save(); call = pending.shift();
assert.equal(call.body.clientProfileId, 'customer-ki');
call.resolve({ draftId: call.body.appraisalId, activeDraft: { snapshot: call.body.snapshot } }); await save;
restore = client.restore('different-history'); call = pending.shift(); call.resolve({ usage: { activeDraft: { id: 'current', snapshot: stored.snapshot } } }); await restore;
assert.equal(client.current().calculation, 'error');
assert.match(client.current().error, /一致しません/);
client.selectProfile(null); assert.equal(client.current().clientProfileId, null); assert.equal(client.current().input.birthClock, null);
console.log('Kigaku profile selection resets prior consultation, requires clock confirmation, and rejects mismatched history restoration.');
// Run the actual UI effects against minimal event targets to test navigation protection.
const effects = [], refs = [], listeners = new Map();
const fakeR = { ...React, useState: () => [null, () => {}], useRef: value => { const ref = { current: value }; refs.push(ref); return ref; }, useEffect: effect => effects.push(effect) };
const savedWindow = globalThis.window, savedDocument = globalThis.document;
const target = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
globalThis.window = { ...target, confirm: () => false };
globalThis.document = target;
try {
  createKigakuReadingComponent(fakeR)({ profiles: [] });
  const cleanups = effects.map(effect => effect());
  let prevented = false, stopped = false;
  const event = { target: { closest: () => ({ closest: () => null }) }, preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } };
  listeners.get('beforeunload')(event); assert.equal(prevented, false);
  refs[0].current.change({ question: '未保存' });
  listeners.get('beforeunload')(event); assert.equal(prevented, true);
  prevented = false; listeners.get('click')(event); assert.equal(prevented, true); assert.equal(stopped, true);
  prevented = false; globalThis.window.confirm = () => true; listeners.get('click')(event); assert.equal(prevented, false);
  cleanups.forEach(cleanup => cleanup?.()); assert.equal(listeners.size, 0);
} finally { globalThis.window = savedWindow; globalThis.document = savedDocument; }
console.log('Kigaku UI effects: clean navigation, unsaved unload, rejected/accepted navigation and cleanup verified with event mocks.');

first=calculate();first.call.resolve({reading:createKigakuReading(first.call.body.input)});await first.promise;
const preview=client.previewPeriods();call=pending.shift();assert.equal(call.path,'/api/kigaku/period-pages');client.change({theme:'new input'});call.resolve({pages:[{title:'stale'}]});await preview;assert.equal(client.current().periodPages,null);
console.log('Period preview stale response rejected after edit.');
