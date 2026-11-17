import { fourPillarsYunFromBirthClock } from "./four-pillars-yun-calendar.js";
import { compareFourPillars, FOUR_PILLARS_COMPARISON_VERSION } from "./four-pillars-comparison.js";
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
  'BAZ-08': ['comparison.dayStemRelation', 'comparison.matches', 'comparison.includedPillars'],
  'BAZ-12': ['comparison', 'familyContext', 'parentDirection'],
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
  envelope.yun = fourPillarsYunFromBirthClock(input);
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
  envelope.comparisonVersion = FOUR_PILLARS_COMPARISON_VERSION;
  // Recompute both people from their captured clocks. Never accept an imported
  // partner chart or replace missing partner inputs with the subject's chart.
  const partner = input.partnerBirthClock ? fourPillarsFromBirthClock({ birthClock: input.partnerBirthClock, referenceDate: input.referenceDate }) : { state: 'required-missing', reason: 'BIRTH_CLOCK_REQUIRED' };
  envelope.partner = input.partnerSubjectId ?? null;
  envelope.partnerClockNormalization = partner.clockNormalization ?? null;
  let comparison;
  if (partner.state !== 'available') comparison = { state: partner.state, reason: input.partnerBirthClock ? 'PARTNER_' + (partner.reason || 'PILLARS_REQUIRED') : 'PARTNER_BIRTH_CLOCK_REQUIRED', data: null };
  else comparison = compareFourPillars({ subjectId: input.subjectId, partnerSubjectId: input.partnerSubjectId, subjectPillars: result.pillars, partnerPillars: partner.pillars });
  for (const index of [7, 11]) Object.assign(pages[index], { state: comparison.state, reason: comparison.reason, data: comparison.data });
  if (comparison.state !== 'available') return envelope;
  // Reuse the existing explicit family context/direction convention. A/B refer
  // to the subject/partner IDs above; gender and roles are never inferred.
  if (!['parent-child', 'partners', 'other-family'].includes(input.familyContext)) {
    Object.assign(pages[11], { state: 'required-missing', reason: 'FAMILY_CONTEXT_REQUIRED', data: null });
  } else if (input.familyContext === 'parent-child' && !['a-parent', 'b-parent'].includes(input.parentDirection)) {
    Object.assign(pages[11], { state: 'required-missing', reason: 'PARENT_DIRECTION_REQUIRED', data: null });
  } else {
    const family = { context: input.familyContext, parentDirection: input.familyContext === 'parent-child' ? input.parentDirection : null };
    if (input.familyContext === 'parent-child') {
      family.subjectRole = input.parentDirection === 'a-parent' ? 'parent' : 'child';
      family.partnerRole = input.parentDirection === 'a-parent' ? 'child' : 'parent';
    }
    pages[11].data = { ...comparison.data, family };
  }
  return envelope;
}
