import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const validSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
const databasePath = path => path.startsWith('migrations/') || ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml'].includes(path);

export function productionMigrationPlan({ baselineSha, headSha, changedPaths = [] }) {
  if (!validSha(headSha)) throw new Error('A complete production head SHA is required.');
  // Without a successful deployment baseline, retain the original migrate-first behavior.
  if (!baselineSha) return { required: true, reason: 'no-successful-production-baseline' };
  if (!validSha(baselineSha)) throw new Error('Invalid successful production baseline SHA.');
  if (!Array.isArray(changedPaths) || changedPaths.some(path => typeof path !== 'string')) throw new Error('Changed paths must be a string array.');
  const required = changedPaths.some(databasePath);
  return { required, reason: required ? 'database-source-changed' : 'database-source-unchanged' };
}

export function changedProductionDatabasePaths(baselineSha, headSha, { cwd } = {}) {
  productionMigrationPlan({ baselineSha, headSha });
  if (!baselineSha) return [];
  return execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', baselineSha, headSha, '--', 'migrations', 'wrangler.json', 'wrangler.jsonc', 'wrangler.toml'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baselineSha, headSha] = process.argv.slice(2);
  // Validate before either SHA reaches git. Failed history/API reads never imply a safe skip.
  productionMigrationPlan({ baselineSha, headSha });
  const changedPaths = changedProductionDatabasePaths(baselineSha, headSha);
  const plan = productionMigrationPlan({ baselineSha, headSha, changedPaths });
  process.stdout.write(`required=${plan.required}\nreason=${plan.reason}\n`);
}
