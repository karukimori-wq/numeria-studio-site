import { countPillarElements } from './four-pillars-calculator.js';

export const FOUR_PILLARS_COMPARISON_VERSION = 'ns.bazi.corresponding-pillar-comparison.v1';
export const FOUR_PILLARS_COMPARISON_SOURCE = 'https://app.notion.com/p/3ffe71121fed81559799c75b93cd6c57';
const stems = '甲乙丙丁戊己庚辛壬癸';
const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
const pairKey = (a, b) => [a, b].sort().join('');
const adoptedPairs = [
  ['stem-combination', new Set(['甲己', '乙庚', '丙辛', '丁壬', '戊癸'].map(pair => pairKey(...pair)))],
  ['branch-combination', new Set(['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'].map(pair => pairKey(...pair)))],
  ['branch-clash', new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].map(pair => pairKey(...pair)))],
];
const validId = value => typeof value === 'string' && value.trim().length > 0;
function pillarStatus(pillars) {
  if (!pillars || ['year', 'month', 'day'].some(key => pillars[key] == null || pillars[key] === '')) return 'required-missing';
  return countPillarElements([pillars.year, pillars.month, pillars.day, ...(pillars.hour != null ? [pillars.hour] : [])]) ? 'available' : 'calculation-error';
}
// This compares already-calculated pillars. It does not confirm a result, infer
// compatibility scores, transform elements, or compare unrelated columns.
export function compareFourPillars(input = {}) {
  const { subjectId, partnerSubjectId, subjectPillars, partnerPillars } = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const base = { calculationVersion: FOUR_PILLARS_COMPARISON_VERSION, publicationAllowed: false, verificationState: 'review-required' };
  const stop = (state, reason) => ({ ...base, state, reason, data: null });
  if (!validId(subjectId) || !validId(partnerSubjectId) || subjectId.trim() === partnerSubjectId.trim()) return stop('required-missing', 'DISTINCT_SUBJECT_IDENTITIES_REQUIRED');
  for (const [role, pillars] of [['SUBJECT', subjectPillars], ['PARTNER', partnerPillars]]) {
    const state = pillarStatus(pillars);
    if (state !== 'available') return stop(state, `${role}_PILLARS_${state === 'required-missing' ? 'REQUIRED' : 'INVALID'}`);
  }
  const includedPillars = ['year', 'month', 'day', ...(subjectPillars.hour != null && partnerPillars.hour != null ? ['hour'] : [])];
  const matches = [];
  for (const pillar of includedPillars) {
    const subjectPillar = subjectPillars[pillar], partnerPillar = partnerPillars[pillar];
    for (const [kind, pairs] of adoptedPairs) {
      const index = kind === 'stem-combination' ? 0 : 1;
      const subjectValue = subjectPillar[index], partnerValue = partnerPillar[index];
      if (pairs.has(pairKey(subjectValue, partnerValue))) matches.push({ kind, pillar, subjectId, partnerSubjectId, subjectPillar, partnerPillar, subjectValue, partnerValue });
    }
  }
  const day = stems.indexOf(subjectPillars.day[0]), otherDay = stems.indexOf(partnerPillars.day[0]);
  const dayElement = Math.floor(day / 2), otherElement = Math.floor(otherDay / 2);
  const elementRelation = ['same-element', 'self-produces-other', 'self-controls-other', 'other-controls-self', 'other-produces-self'][(otherElement - dayElement + 5) % 5];
  return { ...base, state: 'available', reason: null, data: {
    subjectId, partnerSubjectId, scope: 'corresponding-confirmed-pillars', includedPillars,
    hourComparisonState: includedPillars.includes('hour') ? 'available' : 'optional-missing',
    subjectPillars: { year: subjectPillars.year, month: subjectPillars.month, day: subjectPillars.day, hour: subjectPillars.hour ?? null },
    partnerPillars: { year: partnerPillars.year, month: partnerPillars.month, day: partnerPillars.day, hour: partnerPillars.hour ?? null },
    dayStemRelation: { subjectStem: subjectPillars.day[0], partnerStem: partnerPillars.day[0], subjectElement: elements[dayElement], partnerElement: elements[otherElement], subjectPolarity: day % 2 ? 'yin' : 'yang', partnerPolarity: otherDay % 2 ? 'yin' : 'yang', elementRelation, polarityRelation: day % 2 === otherDay % 2 ? 'same-polarity' : 'different-polarity' },
    matches, matchesState: matches.length ? 'available' : 'valid-zero',
    noCombinationClash: matches.length === 0,
  } };
}
