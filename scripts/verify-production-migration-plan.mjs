import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productionMigrationPlan as plan, changedProductionDatabasePaths } from './production-migration-plan.mjs';
const baselineSha = 'a'.repeat(40), headSha = 'b'.repeat(40);
const decide = paths => plan({ baselineSha, headSha, changedPaths: paths });
assert.equal(decide(['src/worker.js', 'docs/review.md']).required, false);
assert.equal(decide([]).required, false);
assert.equal(decide(['migrations/0002.sql']).required, true);
assert.equal(decide(['migrations/deleted.sql']).required, true);
for (const config of ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']) assert.equal(decide([config]).required, true);
assert.equal(decide(['wrangler.auth-preview.json']).required, false);
assert.equal(plan({ baselineSha: '', headSha }).required, true);
for (const input of [{ baselineSha: 'bad', headSha }, { baselineSha, headSha: '--option' }, { baselineSha, headSha, changedPaths: [null] }]) assert.throws(() => plan(input));
console.log('Production migration planning: source/config changes and first deploy require migration; unchanged database skips; invalid metadata rejects.');

// Real git output protects quoted/non-ASCII/newline names and moved-out migrations.
const directory = mkdtempSync(join(tmpdir(), 'numeria-migration-plan-'));
const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
const commit = () => { git(['add', '.']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture']); return git(['rev-parse', 'HEAD']); };
try {
  git(['init', '--quiet']);
  writeFileSync(join(directory, 'README'), 'fixture');
  const baseline = commit();
  mkdirSync(join(directory, 'migrations'));
  const unusual = 'migrations/基準 "名"\n.sql';
  writeFileSync(join(directory, unusual), 'SELECT 1;');
  const added = commit();
  const paths = changedProductionDatabasePaths(baseline, added, { cwd: directory });
  assert.deepEqual(paths, [unusual]);
  assert.equal(plan({ baselineSha: baseline, headSha: added, changedPaths: paths }).required, true);
  renameSync(join(directory, unusual), join(directory, 'moved.sql'));
  const moved = commit();
  assert.deepEqual(changedProductionDatabasePaths(added, moved, { cwd: directory }), [unusual]);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log('Real git NUL-delimited migration paths verified, including Japanese, quotes, newline and move-out.');
