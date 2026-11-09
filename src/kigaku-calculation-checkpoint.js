import { buildKigakuPageData } from './kigaku-page-data.js';

export const KIGAKU_CHECKPOINT_VERSION = 'numeria.kigaku.calculation-checkpoint.v1';
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
// Draft-only additive storage. No legacy birthday/time is silently promoted to a confirmed Japan clock.
export function withKigakuCalculationCheckpoint(snapshot) {
  if (!isObject(snapshot) || snapshot.divination !== 'nine-star-ki' || !isObject(snapshot.kigakuInput)) return snapshot;
  if (['confirmed', 'completed'].includes(snapshot.status)) return snapshot;
  if (snapshot.kigakuInput.methodKey !== 'nine-star-ki') return snapshot;
  const source = structuredClone(snapshot.kigakuInput);
  const calculation = buildKigakuPageData(source);
  const checkpoint = { schemaVersion: KIGAKU_CHECKPOINT_VERSION, methodKey: 'nine-star-ki',
    status: 'draft', verificationState: 'review-required', publicationAllowed: false,
    source, calculation };
  return { ...snapshot, kigakuCalculation: checkpoint };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
// Recalculation detects stale/tampered draft checkpoints; it is not independent verification.
export function validateKigakuCalculationCheckpoint(snapshot) {
  const stop = code => ({ ok: false, code });
  if (snapshot?.divination !== 'nine-star-ki') return stop('METHOD_MISMATCH');
  if (!isObject(snapshot.kigakuInput) || snapshot.kigakuInput.methodKey !== 'nine-star-ki') return stop('KIGAKU_INPUT_REQUIRED');
  if (snapshot.kigakuCalculation?.schemaVersion !== KIGAKU_CHECKPOINT_VERSION) return stop('CHECKPOINT_SCHEMA_MISMATCH');
  const expected = withKigakuCalculationCheckpoint({ ...snapshot, status: 'draft' }).kigakuCalculation;
  try {
    if (JSON.stringify(canonical(snapshot.kigakuCalculation)) !== JSON.stringify(canonical(expected))) return stop('CHECKPOINT_SCOPE_OR_VALUES_MISMATCH');
  } catch { return stop('CHECKPOINT_INVALID'); }
  return { ok: true, code: 'DRAFT_CHECKPOINT_MATCHED', publicationAllowed: false };
}
