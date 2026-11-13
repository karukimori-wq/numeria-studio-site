import { fixedPillarDetails, FOUR_PILLARS_TABLE_VERSION } from "./four-pillars-fixed-tables.js";
import { fourPillarsFromBirthClock } from './four-pillars-birth-clock.js';

export const FOUR_PILLARS_PAGE_DATA_VERSION = 'numeria.bazi.page-data.v1';
// Source paths describe implemented calculations, not approved formal result keys.
export const FOUR_PILLARS_PAGE_SOURCE_PATHS = Object.freeze({
  'BAZ-01': ['pillars.year', 'pillars.month', 'pillars.day', 'pillars.hour'],
  'BAZ-02': ['pillars.day', 'pillars'],
  'BAZ-03': ['elements.data.visibleElementCounts', 'elements.data.includedPillars'],
  'BAZ-04': ['details.rows', 'details.placements'],
  'BAZ-05': ['details.rows.twelveStage'],
  'BAZ-09': ['details.dayStem', 'details.dayBranch', 'details.placements'],
  'BAZ-10': ['details.dayStem', 'details.placements'],
  'BAZ-11': ['details.dayStem', 'details.wealthPlacements'],
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
  for (const page of pages.filter(page => Object.hasOwn(FOUR_PILLARS_PAGE_SOURCE_PATHS, page.pageDefinitionId))) {
    page.state = result.state;
    page.reason = result.reason ?? null;
  }
  if (result.state !== 'available') return envelope;
  const includedPillars = result.elements.data.includedPillars;
  pages[0].data = { pillars: result.pillars, includedPillars, hourState: result.pillars.hour ? 'available' : 'optional-missing' };
  pages[1].data = { dayStem: result.pillars.day[0], pillars: result.pillars };
  pages[2].data = result.elements.data;
  const details = fixedPillarDetails(result.pillars);
  envelope.fixedTablesVersion = FOUR_PILLARS_TABLE_VERSION;
  if (details.state !== 'available') {
    for (const index of [3, 4, 8, 9, 10]) Object.assign(pages[index], { state: details.state, reason: details.reason, data: null });
    return envelope;
  }
  pages[3].data = { dayStem: details.data.dayStem, rows: details.data.rows, placements: details.data.placements };
  pages[4].data = { dayStem: details.data.dayStem, includedPillars, rows: details.data.rows.map(row => ({ pillar: row.pillar, branch: row.branch, twelveStage: row.twelveStage })) };
  pages[8].data = { dayStem: details.data.dayStem, dayBranch: details.data.dayBranch, placements: details.data.placements };
  pages[9].data = { dayStem: details.data.dayStem, placements: details.data.placements };
  pages[10].data = { dayStem: details.data.dayStem, wealthPlacements: details.data.wealthPlacements };
  if (!details.data.wealthPlacements.length) pages[10].state = 'valid-zero';
  return envelope;
}
