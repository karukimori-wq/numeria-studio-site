import { countPillarElements } from './four-pillars-calculator.js';

// User-confirmed Notion decisions 84–86, fixed set A. These are rules, not
// independent natal-chart validation or approved interpretation text.
export const FOUR_PILLARS_TABLE_SOURCE = 'https://app.notion.com/p/3fee71121fed818d91b7ce187ed14428';
export const FOUR_PILLARS_TABLE_VERSION = 'ns.bazi.fixed-tables-A.2026-10-19.v1';
const stems = '甲乙丙丁戊己庚辛壬癸';
const branches = '子丑寅卯辰巳午未申酉戌亥';
const tenGods = [['比肩', '劫財'], ['食神', '傷官'], ['偏財', '正財'], ['偏官', '正官'], ['偏印', '印綬']];
const stages = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
const stageStart = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const hidden = [
  ['癸', null, null], ['己', '辛', '癸'], ['甲', '丙', '戊'], ['乙', null, null],
  ['戊', '癸', '乙'], ['丙', '庚', '戊'], ['丁', '己', null], ['己', '乙', '丁'],
  ['庚', '壬', '戊'], ['辛', null, null], ['戊', '丁', '辛'], ['壬', '甲', null],
];
const indexOf = (alphabet, value) => typeof value === 'string' && value.length === 1 ? alphabet.indexOf(value) : -1;
export function pillarTenGod(dayStem, targetStem) {
  const day = indexOf(stems, dayStem), target = indexOf(stems, targetStem);
  if (day < 0 || target < 0) return null;
  return tenGods[(Math.floor(target / 2) - Math.floor(day / 2) + 5) % 5][day % 2 === target % 2 ? 0 : 1];
}
export function pillarTwelveStage(dayStem, branch) {
  const day = indexOf(stems, dayStem), target = indexOf(branches, branch);
  if (day < 0 || target < 0) return null;
  return stages[((target - stageStart[day]) * (day % 2 === 0 ? 1 : -1) + 12) % 12];
}
export function fixedPillarDetails(pillars) {
  const includedPillars = ['year', 'month', 'day', ...(pillars?.hour != null ? ['hour'] : [])];
  if (!countPillarElements(includedPillars.map(key => pillars?.[key]))) return { state: 'calculation-error', reason: 'PILLAR_INVALID', data: null, publicationAllowed: false };
  const dayStem = pillars.day[0];
  const rows = includedPillars.map(key => {
    const stem = pillars[key][0], branch = pillars[key][1];
    return { pillar: key, stem, branch, stemTenGod: key === 'day' ? '日主' : pillarTenGod(dayStem, stem),
      twelveStage: pillarTwelveStage(dayStem, branch),
      hiddenStems: hidden[branches.indexOf(branch)].flatMap((hiddenStem, index) => hiddenStem ? [{ role: ['本気', '中気', '余気'][index], stem: hiddenStem, tenGod: pillarTenGod(dayStem, hiddenStem) }] : []) };
  });
  const placements = rows.flatMap(row => [
    ...(row.stemTenGod === '日主' ? [] : [{ pillar: row.pillar, position: '天干', stem: row.stem, tenGod: row.stemTenGod }]),
    ...row.hiddenStems.map(item => ({ pillar: row.pillar, position: item.role, stem: item.stem, tenGod: item.tenGod })),
  ]);
  return { state: 'available', calculationVersion: FOUR_PILLARS_TABLE_VERSION, data: { dayStem, dayBranch: pillars.day[1], includedPillars, rows, placements, wealthPlacements: placements.filter(item => ['偏財', '正財'].includes(item.tenGod)) }, publicationAllowed: false };
}
