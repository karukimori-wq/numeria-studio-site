import { buildFourPillarsPageData } from './four-pillars-page-data.js';

export const FOUR_PILLARS_CHECKPOINT_VERSION = 'numeria.bazi.calculation-checkpoint.v1';
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
// Recompute draft data from explicit clocks at the save boundary. Client-sent
// status, calculated values and permission flags are never proof of approval.
export function withFourPillarsCalculationCheckpoint(snapshot) {
  if (!isObject(snapshot) || snapshot.divination !== 'four-pillars') return snapshot;
  if (!isObject(snapshot.fourPillarsInput) || snapshot.fourPillarsInput.methodKey !== 'four-pillars') {
    if (!snapshot.fourPillarsCalculation && !['confirmed', 'completed'].includes(snapshot.status)) return snapshot;
    const { fourPillarsCalculation, ...draft } = snapshot;
    return { ...draft, status: 'draft' };
  }
  const source = structuredClone(snapshot.fourPillarsInput);
  return { ...snapshot, status: 'draft', fourPillarsCalculation: {
    schemaVersion: FOUR_PILLARS_CHECKPOINT_VERSION, methodKey: 'four-pillars', status: 'draft',
    verificationState: 'review-required', publicationAllowed: false,
    source, calculation: buildFourPillarsPageData(source),
  } };
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function validateFourPillarsCalculationCheckpoint(snapshot) {
  const stop = code => ({ ok: false, code });
  if (snapshot?.divination !== 'four-pillars') return stop('METHOD_MISMATCH');
  if (!isObject(snapshot.fourPillarsInput) || snapshot.fourPillarsInput.methodKey !== 'four-pillars') return stop('FOUR_PILLARS_INPUT_REQUIRED');
  if (snapshot.fourPillarsCalculation?.schemaVersion !== FOUR_PILLARS_CHECKPOINT_VERSION) return stop('CHECKPOINT_SCHEMA_MISMATCH');
  try {
    const expected = withFourPillarsCalculationCheckpoint(snapshot).fourPillarsCalculation;
    if (JSON.stringify(canonical(snapshot.fourPillarsCalculation)) !== JSON.stringify(canonical(expected))) return stop('CHECKPOINT_SCOPE_OR_VALUES_MISMATCH');
  } catch { return stop('CHECKPOINT_INVALID'); }
  return { ok: true, code: 'DRAFT_CHECKPOINT_MATCHED', publicationAllowed: false };
}
