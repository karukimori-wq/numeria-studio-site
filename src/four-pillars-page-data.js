import { fourPillarsFromBirthClock } from './four-pillars-birth-clock.js';

export const FOUR_PILLARS_PAGE_DATA_VERSION = 'numeria.bazi.page-data.v1';
// Source paths describe implemented calculations, not approved formal result keys.
export const FOUR_PILLARS_PAGE_SOURCE_PATHS = Object.freeze({
  'BAZ-01': ['pillars.year', 'pillars.month', 'pillars.day', 'pillars.hour'],
  'BAZ-02': ['pillars.day', 'pillars'],
  'BAZ-03': ['elements.data.visibleElementCounts', 'elements.data.includedPillars'],
});
export function buildFourPillarsPageData(input = {}) {
  const pages = Array.from({ length: 14 }, (_, i) => ({
    pageDefinitionId: `BAZ-${String(i + 1).padStart(2, '0')}`,
    state: 'unconnected', reason: 'CALCULATOR_PAGE_ADAPTER_UNCONNECTED', data: null,
    copyState: 'source-missing', assetState: 'asset-missing', reviewState: 'review-required', publicationAllowed: false,
  }));
  const envelope = { schemaVersion: FOUR_PILLARS_PAGE_DATA_VERSION, methodKey: 'four-pillars', subject: input?.subjectId ?? null, revision: input?.revision ?? null, referenceDate: input?.referenceDate ?? null, publicationAllowed: false, pages };
  if (input?.methodKey !== 'four-pillars') {
    pages.forEach(page => { page.reason = 'METHOD_NOT_SELECTED'; });
    return envelope;
  }
  const result = fourPillarsFromBirthClock(input);
  envelope.calculationVersion = result.calculationVersion ?? null;
  envelope.clockNormalization = result.clockNormalization ?? null;
  for (const page of pages.slice(0, 3)) {
    page.state = result.state;
    page.reason = result.reason ?? null;
  }
  if (result.state !== 'available') return envelope;
  const includedPillars = result.elements.data.includedPillars;
  pages[0].data = { pillars: result.pillars, includedPillars, hourState: result.pillars.hour ? 'available' : 'optional-missing' };
  pages[1].data = { dayStem: result.pillars.day[0], pillars: result.pillars };
  pages[2].data = result.elements.data;
  return envelope;
}
