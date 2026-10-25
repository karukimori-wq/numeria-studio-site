import { SearchSunLongitude } from "astronomy-engine";

export const KIGAKU_SOLAR_VERSION = "ns.kigaku.solar-jst.v1";
const JST_MINUTES = 9 * 60;
const JIAN_MONTH_LONGITUDES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];

function checkedYear(year) {
  if (!Number.isInteger(year) || year < 1900 || year > 2101) throw new RangeError("KIGAKU_YEAR_OUT_OF_RANGE");
}

function jstDate(instant) {
  return new Date(instant.getTime() + JST_MINUTES * 60_000).toISOString().slice(0, 10);
}

function searchLongitude(year, month, longitude) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const time = SearchSunLongitude(longitude, start, 12);
  if (!time) throw new Error(`SOLAR_TERM_NOT_FOUND:${year}-${month}:${longitude}`);
  return time.date;
}

export function kigakuSolarTerms(year) {
  checkedYear(year);
  const terms = JIAN_MONTH_LONGITUDES.map((longitude, solarMonthIndex) => {
    const calendarMonth = ((solarMonthIndex + 1) % 12) + 1;
    const instant = searchLongitude(year, calendarMonth, longitude);
    return {
      solarMonthIndex,
      name: ["立春", "啓蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"][solarMonthIndex],
      longitude,
      instant: instant.toISOString(),
      jstDate: jstDate(instant),
    };
  });
  return terms;
}

function mod(value, base) {
  return ((value % base) + base) % base;
}

export function kigakuAnnualCenter(kiYear) {
  return mod(11 - kiYear, 9) || 9;
}

export function kigakuYearBranch(kiYear) {
  return mod(kiYear - 4, 12);
}

export function kigakuMonthCenter(kiYear, solarMonthIndex) {
  if (!Number.isInteger(solarMonthIndex) || solarMonthIndex < 0 || solarMonthIndex > 11) throw new RangeError("KIGAKU_SOLAR_MONTH_INVALID");
  const tigerCenter = [8, 5, 2][kigakuYearBranch(kiYear) % 3];
  return mod(tigerCenter - solarMonthIndex - 1, 9) + 1;
}

export function kigakuSolarPeriod(instantInput) {
  const instant = new Date(instantInput);
  if (!Number.isFinite(instant.getTime())) throw new TypeError("KIGAKU_INSTANT_INVALID");
  const year = new Date(instant.getTime() + JST_MINUTES * 60_000).getUTCFullYear();
  const candidates = [...kigakuSolarTerms(year - 1), ...kigakuSolarTerms(year), ...kigakuSolarTerms(year + 1)];
  const ordered = candidates.map((term) => ({ ...term, start: new Date(term.instant) })).sort((a, b) => a.start - b.start);
  const index = ordered.findIndex((term, i) => term.start <= instant && (i === ordered.length - 1 || instant < ordered[i + 1].start));
  if (index < 0 || index === ordered.length - 1) throw new RangeError("KIGAKU_PERIOD_OUT_OF_RANGE");
  const current = ordered[index];
  const annualKiYear = current.solarMonthIndex === 0 ? current.start.getUTCFullYear() : (current.start.getUTCMonth() >= 1 ? current.start.getUTCFullYear() : current.start.getUTCFullYear() - 1);
  const yearBoard = kigakuAnnualCenter(annualKiYear);
  const monthBoard = kigakuMonthCenter(annualKiYear, current.solarMonthIndex);
  return {
    calculationVersion: KIGAKU_SOLAR_VERSION,
    period: { index: current.solarMonthIndex, name: current.name, startInclusive: current.start.toISOString(), endExclusive: ordered[index + 1].start.toISOString() },
    year: { kiYear: annualKiYear, centerStar: yearBoard, board: kigakuBoardFromCenter(yearBoard) },
    month: { kiYear: annualKiYear, solarMonthIndex: current.solarMonthIndex, centerStar: monthBoard, board: kigakuBoardFromCenter(monthBoard) },
  };
}

export function kigakuBoardFromCenter(centerStar) {
  if (!Number.isInteger(centerStar) || centerStar < 1 || centerStar > 9) throw new RangeError("KIGAKU_CENTER_STAR_INVALID");
  const order = ["C", "NW", "W", "NE", "S", "N", "SW", "E", "SE"];
  return Object.fromEntries(order.map((palace, index) => [palace, mod(centerStar - 1 + index, 9) + 1]));
}
