import { Solar } from "lunar-typescript";
import { Body, GeoVector, Ecliptic } from "astronomy-engine";
import { astro } from "iztro";

export const CALENDAR_DEPENDENCY_VERSIONS = Object.freeze({ lunar: "1.8.6", astronomy: "2.1.19", ziwei: "2.6.3" });
const incomplete = code => ({ status: "input-incomplete", code });
const mod = (value, size) => ((value % size) + size) % size;
const cycle = value => mod(value - 1, 9) + 1;
const msDay = 86400000;
function calendarDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1901-01-01" || date > "2100-12-31") return null;
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) === date ? value : null;
}
function knownInstant(instant) {
  if (typeof instant !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(instant)) return null;
  const value = new Date(instant);
  if (!Number.isFinite(value.getTime()) || value.toISOString().replace(".000Z", "Z") !== instant.replace(".000Z", "Z")) return null;
  return calendarDate(new Date(value.getTime() + 9 * 3600000).toISOString().slice(0, 10)) ? value : null;
}

export function calculateChineseCalendarDate(date) {
  if (!calendarDate(date)) return incomplete("CALENDAR_DATE_INVALID");
  const [year, month, day] = date.split("-").map(Number), lunar = Solar.fromYmd(year, month, day).getLunar();
  return { status: "calculated", calculationVersion: "lunar-typescript@1.8.6", sourceDate: date, calendar: "chinese-date-mapping", year: lunar.getYear(), month: Math.abs(lunar.getMonth()), day: lunar.getDay(), isLeap: lunar.getMonth() < 0 };
}
function termTable(year) { return Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable(); }
function termInstant(solar) { return new Date(solar.toYmdHms().replace(" ", "T") + "+08:00"); }
function jstDate(instant) { return new Date(instant.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
export function calculateCoreSolarTerms(year) {
  if (!Number.isInteger(year) || year < 1901 || year > 2100) return incomplete("CALENDAR_YEAR_INVALID");
  const table = termTable(year);
  return { status: "calculated", calculationVersion: "lunar-typescript@1.8.6", terms: Object.entries({ lichun: table["立春"], summer: table["夏至"], winter: table.DONG_ZHI }).map(([event, solar]) => {
    const instant = termInstant(solar);
    return { event, instantUTC: instant.toISOString(), instantJST: new Date(instant.getTime() + 9 * 3600000).toISOString().replace("Z", "+09:00") };
  }) };
}

export function calculatePlanetPositions(instant) {
  const date = knownInstant(instant);
  if (!date) return incomplete("EXACT_INSTANT_REQUIRED");
  const bodies = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const planets = bodies.map(body => { const position = Ecliptic(GeoVector(Body[body], date, true)); return { body, longitudeDegrees: position.elon, latitudeDegrees: position.elat }; });
  if (planets.some(item => !Number.isFinite(item.longitudeDegrees) || !Number.isFinite(item.latitudeDegrees))) return { status: "calculation-failed", code: "PLANET_POSITION_INVALID" };
  return { status: "calculated", calculationVersion: "astronomy-engine@2.1.19", instantUTC: date.toISOString(), frame: "apparent true ecliptic of date", center: "geocentric", planets, houses: null, houseStatus: "unconnected" };
}

export function calculateZiWeiBirth({ birthDate, standardHour, standardTimeConfirmed = false, gender, referenceDate } = {}) {
  if (!calendarDate(birthDate) || !calendarDate(referenceDate) || birthDate > referenceDate) return incomplete("BIRTH_DATE_INVALID");
  if (standardTimeConfirmed !== true || !Number.isInteger(standardHour) || standardHour < 0 || standardHour > 23) return incomplete("CONFIRMED_JST_STANDARD_TIME_REQUIRED");
  if (!["male", "female"].includes(gender)) return incomplete("GENDER_REQUIRED");
  const config = { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", dayDivide: "current", ageDivide: "normal" };
  const timeIndex = standardHour === 23 ? 12 : Math.floor((standardHour + 1) / 2);
  const chart = astro.withOptions({ type: "solar", dateStr: birthDate, timeIndex, gender, fixLeap: true, language: "zh-CN", config });
  return { status: "calculated", calculationVersion: "iztro@2.6.3", birthDate, standardHour, timeIndex, config, fixLeap: true, lunar: calculateChineseCalendarDate(birthDate), soulBranch: chart.earthlyBranchOfSoulPalace, bodyBranch: chart.earthlyBranchOfBodyPalace, rawChart: chart.toJSON(), independentValidation: "partial" };
}

export function nineStarIntervalValue({ period, length, offsetDays }) {
  if (!["winter", "summer"].includes(period) || ![180, 240].includes(length) || !Number.isInteger(offsetDays) || offsetDays < 0 || offsetDays >= length) return null;
  const start = period === "winter" ? 1 : 9, direction = period === "winter" ? 1 : -1;
  return length === 240 && offsetDays >= 210 ? cycle(cycle(start + direction * 209) - direction * (offsetDays - 210)) : cycle(start + direction * offsetDays);
}
const plateOrder = ["center", "NW", "W", "NE", "S", "N", "SW", "E", "SE"];
const plateFor = center => plateOrder.map((direction, index) => ({ direction, star: cycle(center + index) }));
export function calculateNineStarDay(date) {
  const day = calendarDate(date);
  if (!day) return incomplete("CALENDAR_DATE_INVALID");
  const year = Number(date.slice(0, 4)), anchors = [];
  for (const auxiliaryYear of [year - 1, year, year + 1]) {
    const table = termTable(auxiliaryYear);
    for (const [period, solar] of [["summer", table["夏至"]], ["winter", table.DONG_ZHI]]) {
      const termDay = new Date(`${jstDate(termInstant(solar))}T00:00:00Z`), jdn = Math.floor(termDay.getTime() / msDay) + 2440588;
      const index = mod(jdn + 49, 60), delta = index <= 29 ? -index : 60 - index;
      anchors.push({ period, time: termDay.getTime() + delta * msDay });
    }
  }
  anchors.sort((a, b) => a.time - b.time);
  const index = anchors.findLastIndex(anchor => anchor.time <= day.getTime()), start = anchors[index], end = anchors[index + 1];
  if (!start || !end) return { status: "calculation-failed", code: "CALENDAR_ANCHOR_INVALID" };
  const length = (end.time - start.time) / msDay, offsetDays = (day.getTime() - start.time) / msDay;
  const center = nineStarIntervalValue({ period: start.period, length, offsetDays });
  if (center === null) return { status: "calculation-failed", code: "CALENDAR_ANCHOR_INVALID" };
  return { status: "calculated", calculationVersion: "ns.kigaku.koyomi8-jst.v1", date, center, plate: plateFor(center), period: start.period, anchorDate: new Date(start.time).toISOString().slice(0, 10), intervalDays: length, offsetDays };
}

export function calculateNineStarPlates(instant) {
  const date = knownInstant(instant);
  if (!date) return incomplete("EXACT_INSTANT_REQUIRED");
  const targetDay = jstDate(date), year = Number(targetDay.slice(0, 4));
  const effectiveYear = date < termInstant(termTable(year)["立春"]) ? year - 1 : year;
  const table = termTable(effectiveYear), keys = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "XIAO_HAN"];
  const monthIndex = keys.findLastIndex(key => date >= termInstant(table[key]));
  if (monthIndex < 0) return { status: "calculation-failed", code: "SOLAR_MONTH_INVALID" };
  const yearBranchIndex = mod(effectiveYear - 4, 12), first = [0, 3, 6, 9].includes(yearBranchIndex) ? 8 : [1, 4, 7, 10].includes(yearBranchIndex) ? 5 : 2;
  const yearCenter = cycle(11 - mod(effectiveYear, 9)), monthCenter = cycle(first - monthIndex);
  return { status: "calculated", calculationVersion: "ns.kigaku.koyomi8-jst.v1", instantUTC: date.toISOString(), effectiveYear, yearBranchIndex, solarMonthIndex: monthIndex, monthBranchIndex: mod(monthIndex + 2, 12), year: { center: yearCenter, plate: plateFor(yearCenter) }, month: { center: monthCenter, plate: plateFor(monthCenter) }, day: calculateNineStarDay(targetDay) };
}

export function calculateZiWeiNominalAge(birthLunarYear, referenceDate) {
  const date = calculateChineseCalendarDate(referenceDate);
  return date.status === "calculated" && Number.isInteger(birthLunarYear) && birthLunarYear >= 1900 && birthLunarYear <= date.year ? { status: "calculated", nominalAge: date.year - birthLunarYear + 1 } : incomplete("AGE_INPUT_INVALID");
}

export function commonNineStarDirections(yearGood, monthGood) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  if (![yearGood, monthGood].every(items => Array.isArray(items) && items.every(item => directions.includes(item)))) return incomplete("DIRECTION_INPUT_INVALID");
  const commonGood = directions.filter(direction => yearGood.includes(direction) && monthGood.includes(direction));
  return { commonGood, state: commonGood.length ? "calculated" : "empty", isCalculationError: false };
}
