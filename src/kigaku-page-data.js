import { createKigakuResultFromClock } from './kigaku-result.js';
import { createKigakuDirectionResult, KIGAKU_DIRECTIONS } from './kigaku-directions.js';
import { createKigakuPeriodSeries } from './kigaku-period-series.js';
import { KIGAKU_SOLAR_VERSION, kigakuSolarTerms, kigakuSolarPeriod } from './kigaku-solar-calendar.js';
import { KIGAKU_DAYBOARD_VERSION } from './kigaku-dayboard.js';
import { kigakuPersonRelation, KIGAKU_RELATION_VERSION } from './kigaku-person-relation.js';

export const KIGAKU_PAGE_DATA_VERSION = 'numeria.kigaku.f4-page-data.v1';
export const KIGAKU_RESULT_STATES = Object.freeze([
  'available', 'optional-missing', 'valid-zero', 'required-missing', 'calculation-error',
  'unconnected', 'source-missing', 'asset-missing', 'review-required',
]);
// These are calculator source paths, never invented formal Result Keys.
export const KIGAKU_PAGE_SOURCE_PATHS = Object.freeze({
  'KIG-01': ['natal.mainStar', 'natal.monthStar'],
  'KIG-02': ['natal.mainStar', 'natal.monthStar'],
  'KIG-03': ['year.board', 'natal.mainStar'],
  'KIG-04': ['month.board', 'natal.mainStar'],
  'KIG-05': ['day.board', 'day.date'],
  'KIG-06': ['analysis.year', 'analysis.month', 'analysis.common'],
  'KIG-07': ['months.rows'],
  'KIG-08': ['natal.mainStar', 'partnerResult.natal.mainStar', 'natal.monthStar', 'partnerResult.natal.monthStar'],
  'KIG-09': ['natal.mainStar', 'partnerResult.natal.mainStar'],
  'KIG-10': ['natal.mainStar', 'partnerResult.natal.mainStar'],
  'KIG-11': ['year.board', 'month.board', 'natal.mainStar'],
  'KIG-12': ['analysis.selected', 'analysis.common'],
  'KIG-13': ['natal.mainStar', 'partnerResult.natal.mainStar'],
  'KIG-14': ['years.rows'],
});
const natalInputs = ['referenceInstant', 'birthClock.date', 'birthClock.countryCode', 'birthClock.zoneId', 'birthClock.zoneConfirmed'];
const pairInputs = [...natalInputs, 'subjectId', 'partnerSubjectId', 'partnerBirthClock.date', 'partnerBirthClock.countryCode', 'partnerBirthClock.zoneId', 'partnerBirthClock.zoneConfirmed'];
export const KIGAKU_PAGE_INPUT_REQUIREMENTS = Object.freeze(Object.fromEntries(
  Array.from({ length: 14 }, (_, i) => {
    const n = i + 1, pair = [8, 9, 10, 13].includes(n);
    const context = { 9: ['loveRelationship'], 10: ['workRelationship'], 11: ['workTheme'], 12: ['selectedDirection', 'directionPurpose'], 13: ['familyRelationship'] }[n] || [];
    return [`KIG-${String(n).padStart(2, '0')}`, {
      required: [...(n === 5 ? ['referenceInstant'] : pair ? pairInputs : natalInputs), ...context],
      optional: n === 5 ? [] : pair
        ? ['birthClock.time (boundary-dependent)', 'partnerBirthClock.time (boundary-dependent)', 'monthComparison (both month stars must be certain)']
        : ['birthClock.time (unknown allowed only when required stars are certain)'],
    }];
  }),
));
const ELEMENTS = [null, 'water', 'earth', 'wood', 'wood', 'earth', 'metal', 'metal', 'earth', 'fire'];
const text = value => typeof value === 'string' && Boolean(value.trim());
const periodWithinRange = period => Date.parse(period.startInclusive) >= Date.parse('1901-01-01T00:00:00+09:00')
  && Date.parse(period.endExclusive) <= Date.parse('2101-01-01T00:00:00+09:00');

export function buildKigakuPageData(input = {}) {
  input = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const pages = Array.from({ length: 14 }, (_, i) => ({
    pageDefinitionId: `KIG-${String(i + 1).padStart(2, '0')}`, state: 'unconnected',
    data: null, reason: 'METHOD_NOT_SELECTED', optionalInputs: [],
    copyState: 'source-missing', assetState: 'asset-missing', reviewState: 'review-required', publicationAllowed: false,
  }));
  const envelope = {
    schemaVersion: KIGAKU_PAGE_DATA_VERSION, methodKey: 'nine-star-ki',
    calculationVersion: { solar: KIGAKU_SOLAR_VERSION, day: KIGAKU_DAYBOARD_VERSION, relation: KIGAKU_RELATION_VERSION },
    verificationState: 'review-required', publicationAllowed: false,
    revision: input.revision ?? null, subject: input.subjectId ?? null,
    partner: input.partnerSubjectId ?? null, referenceInstant: input.referenceInstant ?? null, pages,
  };
  if (input.methodKey !== 'nine-star-ki') return envelope;
  const set = (n, state, data, reason = null, optionalInputs = []) => Object.assign(pages[n - 1], { state, data, reason, optionalInputs });
  if (!text(input.referenceInstant)) {
    for (let n = 1; n <= 14; n++) set(n, 'required-missing', null, 'REFERENCE_INSTANT_REQUIRED');
    return envelope;
  }
  let result;
  try { result = createKigakuResultFromClock({ referenceInstant: input.referenceInstant, birthClock: input.birthClock ?? null }); }
  catch (error) {
    for (let n = 1; n <= 14; n++) set(n, 'calculation-error', null, error.message);
    return envelope;
  }
  const main = result.natal.mainStar, month = result.natal.monthStar;
  const series = main.state === 'ready' ? createKigakuPeriodSeries(result.year.kiYear, main.value) : null;
  for (const n of [1, 2]) {
    const ready = main.state === 'ready' && month.state === 'ready';
    set(n, ready ? 'available' : 'required-missing', ready ? {
      mainStar: main.value, monthStar: month.value,
      ...(n === 2 ? { mainElement: ELEMENTS[main.value], monthElement: ELEMENTS[month.value] } : {}),
    } : null, main.reasonCode || month.reasonCode);
  }
  for (const [n, period] of [[3, 'year'], [4, 'month']]) {
    const board = result[period].board;
    const interval = period === 'month' ? kigakuSolarPeriod(result.input.referenceInstant).period : {
      startInclusive: kigakuSolarTerms(result.year.kiYear)[0].instant,
      endExclusive: kigakuSolarTerms(result.year.kiYear + 1)[0].instant,
    };
    const inRange = periodWithinRange(interval), ready = main.state === 'ready' && inRange;
    set(n, ready ? 'available' : 'required-missing', ready ? {
      ...result[period], honmeiPosition: Object.keys(board).find(key => board[key] === main.value),
      referenceInstant: result.input.referenceInstant, interval,
    } : null, inRange ? main.reasonCode : 'FULL_PERIOD_OUT_OF_RANGE');
  }
  set(5, 'available', result.day);
  const directionResult = createKigakuDirectionResult({ sourceResult: result });
  const directions = directionResult.analysis;
  // Both full year and month intervals must be in the supported range for annual/monthly advice.
  const directionReason = directions.reasonCode || pages[2].reason || pages[3].reason;
  const directionReady = directions.state === 'ready' && !directionReason;
  set(6, directionReady ? (directions.common.directions.length ? 'available' : 'valid-zero') : 'required-missing', directionReady ? directions : null, directionReason);
  for (const [n, key] of [[7, 'months'], [14, 'years']]) {
    const ready = series?.[key].state === 'ready';
    set(n, ready ? 'available' : 'required-missing', ready ? series[key] : null, main.reasonCode || series?.[key].reasonCode);
  }

  // Do not let a missing, invalid or boundary-uncertain partner corrupt the subject's own pages.
  let partnerResult = null, partnerError = null;
  if (input.partnerBirthClock !== null && input.partnerBirthClock !== undefined) {
    try { partnerResult = createKigakuResultFromClock({ referenceInstant: input.referenceInstant, birthClock: input.partnerBirthClock }); }
    catch (error) { partnerError = error.message; }
  }
  const pairReason = main.state !== 'ready' ? main.reasonCode : partnerError ? partnerError
    : partnerResult?.natal.mainStar.state !== 'ready' ? partnerResult?.natal.mainStar.reasonCode || 'PARTNER_MAIN_STAR_REQUIRED'
      : !text(input.subjectId) ? 'SUBJECT_IDENTITY_REQUIRED' : !text(input.partnerSubjectId) ? 'PARTNER_IDENTITY_REQUIRED' : input.partnerSubjectId === input.subjectId ? 'DISTINCT_SUBJECTS_REQUIRED' : null;
  let pair = null;
  const optionalMonths = [];
  if (!pairReason) {
    const other = partnerResult.natal.mainStar.value;
    pair = { self: main.value, partner: other, selfElement: ELEMENTS[main.value], partnerElement: ELEMENTS[other],
      relation: kigakuPersonRelation(main.value, other), relationVersion: KIGAKU_RELATION_VERSION,
      subject: input.subjectId ?? null, partnerSubject: input.partnerSubjectId, referenceInstant: result.input.referenceInstant };
    if (month.state === 'ready' && partnerResult.natal.monthStar.state === 'ready') {
      pair.monthComparison = { self: month.value, partner: partnerResult.natal.monthStar.value,
        relation: kigakuPersonRelation(month.value, partnerResult.natal.monthStar.value) };
    } else {
      pair.monthComparison = null;
      optionalMonths.push({ field: 'monthComparison', state: 'optional-missing', reason: month.reasonCode || partnerResult.natal.monthStar.reasonCode });
    }
  }
  const pairState = partnerError ? 'calculation-error' : 'required-missing';
  set(8, pairReason ? pairState : 'available', pair, pairReason, optionalMonths);
  for (const [n, key] of [[9, 'loveRelationship'], [10, 'workRelationship'], [13, 'familyRelationship']]) {
    const reason = pairReason || (!text(input[key]) ? 'RELATIONSHIP_CONTEXT_REQUIRED' : null);
    set(n, reason ? pairState : 'available', reason ? null : { ...pair, context: input[key] }, reason, optionalMonths);
  }
  const careerReason = !['job-change', 'independence'].includes(input.workTheme) ? 'WORK_THEME_REQUIRED' : pages[2].reason || pages[3].reason;
  set(11, careerReason ? 'required-missing' : 'available', careerReason ? null : { workTheme: input.workTheme, year: pages[2].data, month: pages[3].data }, careerReason);
  const travelReason = !KIGAKU_DIRECTIONS.includes(input.selectedDirection) ? 'MANUAL_DIRECTION_REQUIRED'
    : !['travel', 'move'].includes(input.directionPurpose) ? 'DIRECTION_PURPOSE_REQUIRED' : directionReason;
  if (travelReason) set(12, 'required-missing', null, travelReason);
  else {
    const selected = createKigakuDirectionResult({ sourceResult: result, selectedDirection: input.selectedDirection }).analysis.selected;
    set(12, 'available', { ...selected, purpose: input.directionPurpose, directionBasis: directionResult.directionBasis, referenceInstant: result.input.referenceInstant });
  }
  return envelope;
}
