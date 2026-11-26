import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { kigakuPersonRelation, KIGAKU_RELATION_VERSION } from '../src/kigaku-person-relation.js';
const fixturePath = 'test-fixtures/kigaku-person-relations.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const rows = [];
for (let self = 1; self <= 9; self++) for (let partner = 1; partner <= 9; partner++) {
  const expected = fixture.expectedRows[self][partner - 1];
  const actual = kigakuPersonRelation(self, partner);
  assert.equal(actual, expected, `${self}:${partner}`);
  rows.push({ input: { self, partner }, expected, actual, passed: true });
}
for (const n of [null, 0, 10, 1.5, '1']) assert.throws(() => kigakuPersonRelation(n, 1));
if (process.argv.includes('--record')) {
  const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  writeFileSync('docs/block-editor/evidence/kigaku-pair-run-2026-11-09.json', JSON.stringify({ calculatorVersion: KIGAKU_RELATION_VERSION,
    fixtureSHA256: sha(fixturePath), moduleSHA256: sha('src/kigaku-person-relation.js'), source: fixture.source, kind: fixture.kind, scope: fixture.scope, rows }, null, 2) + '\n');
}
console.log('Kigaku pair references: 81 manual Notion-rule expectations PASS; natal stars and page acceptance unverified.');
