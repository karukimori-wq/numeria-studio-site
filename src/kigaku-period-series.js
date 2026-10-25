import { kigakuSolarTerms, kigakuAnnualCenter, kigakuMonthCenter, kigakuBoardFromCenter, KIGAKU_SOLAR_VERSION } from './kigaku-solar-calendar.js';
const min = Date.parse('1901-01-01T00:00:00+09:00');
const max = Date.parse('2101-01-01T00:00:00+09:00');
export function createKigakuPeriodSeries(kiYear, mainStar) {
  if (!Number.isInteger(kiYear) || kiYear < 1900 || kiYear > 2100 || !Number.isInteger(mainStar) || mainStar < 1 || mainStar > 9) throw new TypeError('KIGAKU_SERIES_INPUT_INVALID');
  const cache = new Map();
  const terms = year => { if (!cache.has(year)) cache.set(year, kigakuSolarTerms(year)); return cache.get(year); };
  const spring = year => terms(year).find(t => t.solarMonthIndex === 0).instant;
  const row = (year, index, startInclusive, endExclusive) => {
    const centerStar = index === null ? kigakuAnnualCenter(year) : kigakuMonthCenter(year, index);
    const board = kigakuBoardFromCenter(centerStar);
    return { kiYear: year, solarMonthIndex: index, startInclusive, endExclusive, mainStar, centerStar, board, honmeiPosition: Object.keys(board).find(key => board[key] === mainStar), calculationVersion: KIGAKU_SOLAR_VERSION };
  };
  const unavailable = () => ({ state: 'unavailable', reasonCode: 'FULL_PERIOD_OUT_OF_RANGE', rows: [] });
  const check = (rows, count) => rows.length !== count || rows.some((r,i) => Date.parse(r.startInclusive) < min || Date.parse(r.endExclusive) > max || r.startInclusive >= r.endExclusive || (i > 0 && rows[i-1].endExclusive !== r.startInclusive)) ? unavailable() : { state: 'ready', reasonCode: null, rows };
  const ordered = [...terms(kiYear), ...terms(kiYear+1)].filter(t => t.instant >= spring(kiYear) && t.instant <= spring(kiYear+1)).sort((a,b) => a.instant.localeCompare(b.instant));
  const months = check(ordered.slice(0,12).map((t,i) => row(kiYear,t.solarMonthIndex,t.instant,ordered[i+1].instant)),12);
  const years = kiYear+9 > 2101 ? unavailable() : check(Array.from({length:9},(_,i) => row(kiYear+i,null,spring(kiYear+i),spring(kiYear+i+1))),9);
  return { months, years };
}
