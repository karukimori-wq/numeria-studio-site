import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { build } from 'vite';
import { buildNumerologyRegisteredDraft } from '../src/numerology-registered-draft.js';
import { normalizeNumerologyNameInputs, updateNumerologyNameInputs } from '../src/numerology-name-input.js';
import { numerologyA4Units } from '../src/numerology-a4.js';

// Synthetic, offline layout verification. This grants no account entitlement.
const reading = { id: 'numerology-a4-lab', divination: 'numerology', name: '架空A', birthday: '2009-11-11', visitDate: '2026-11-26', includeCompatibility: true, partnerName: '架空B', partnerBirthday: '1990-01-01', numerologyFamilyInput: { context: 'parent-child', parentDirection: 'b-parent' }, numerologyNameInputs: normalizeNumerologyNameInputs(null) };
for (const [role, romanName] of [['subject', 'TARO YAMADA'], ['partner', 'HANAKO SATO']]) for (const change of [{ operation: 'edit', romanName }, { operation: 'confirm' }]) reading.numerologyNameInputs = updateNumerologyNameInputs(reading.numerologyNameInputs, { role, ...change }, reading).value;
const scenarios = [
  ['complete', reading],
  ['unconfirmed-name', { ...reading, numerologyNameInputs: null }],
  ['no-partner', { ...reading, includeCompatibility: false }],
  ['no-parent-direction', { ...reading, numerologyFamilyInput: { context: 'parent-child' } }],
  ['invalid-date', { ...reading, birthday: '2000-02-30' }],
];
const hash = value => createHash('sha256').update(value).digest('hex');
const cases = [];
for (const [scenario, input] of scenarios) {
  const draft = await buildNumerologyRegisteredDraft(input, 'pro');
  assert.equal(draft.pages.length, 14);
  assert.equal(draft.officialAllowed, false);
  if (scenario === 'complete') assert.ok(draft.pages.every(page => page.state === 'preview_ready'));
  if (scenario === 'unconfirmed-name') assert.deepEqual(draft.pages.filter(page => page.state === 'preview_ready').map(page => page.pageId), ['NUM-06', 'NUM-08', 'NUM-12', 'NUM-13', 'NUM-14']);
  if (scenario === 'no-partner') assert.deepEqual(draft.pages.filter(page => page.state !== 'preview_ready').map(page => page.pageId), ['NUM-08', 'NUM-12']);
  if (scenario === 'no-parent-direction') assert.deepEqual(draft.pages.filter(page => page.state !== 'preview_ready').map(page => page.pageId), ['NUM-12']);
  if (scenario === 'invalid-date') assert.ok(draft.pages.every(page => page.state === 'unavailable'));
  for (const layout of ['standard', 'magazine']) for (const page of draft.pages) {
    const units = numerologyA4Units(page, draft);
    cases.push({ scenario, id: page.pageId, layout, state: page.state, draftSha256: hash(JSON.stringify(draft)), draft: { ...draft, pages: [page], exampleOnly: true }, expected: { text: units.text.map(unit => ({ id: unit.id, text: unit.text, annotation: unit.annotation })), figures: units.figures.map(unit => unit.id) } });
  }
}
const dir = resolve('output/numerology-a4-lab');
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/index.html`, '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>数秘術 ローカルA4検査</title><div id="root"></div><script type="module" src="./entry.js"></script></html>');
const sourceFiles = ['scripts/build-numerology-a4-lab.mjs', 'scripts/numerology-a4-lab-runtime.js', 'src/report-page-definitions.js', 'package.json', ...readdirSync('src').filter(name => name.startsWith('numerology-') && name.endsWith('.js')).map(name => `src/${name}`)];
const provenance = {
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceHashes: Object.fromEntries(sourceFiles.map(path => [path, hash(readFileSync(path))])),
  casesSha256: hash(JSON.stringify(cases)),
  dependencies: Object.fromEntries(['react', 'react-dom', 'vite'].map(name => [name, JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version])),
};
writeFileSync(`${dir}/entry.js`, `const cases=${JSON.stringify(cases).replace(/</g, '\\u003c')};const provenance=${JSON.stringify(provenance)};\n` + readFileSync('scripts/numerology-a4-lab-runtime.js', 'utf8'));
await build({ configFile: false, root: dir, logLevel: 'warn', base: './', build: { outDir: `${dir}/dist`, emptyOutDir: true } });
console.log('Built output/numerology-a4-lab/dist: 140 synthetic layout cases; not authenticated Pro acceptance.');
