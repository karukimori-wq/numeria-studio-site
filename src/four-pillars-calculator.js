import { Solar } from "lunar-typescript";
import { calculateChineseCalendarDate } from "./calendar-calculators.js";
import { normalizeJapanBirthTime } from "./japan-birth-time.js";

// UI/save adapters pass the original civil clock, never silently mark it as JST.
export function calculateFourPillarsFromClock({ birthDate, clockTime = null, utcOffsetMinutes = null, referenceDate } = {}) {
  const birthTime = normalizeJapanBirthTime({ birthDate, clockTime, utcOffsetMinutes });
  if (!["calculated", "date-only"].includes(birthTime.status)) return { status: "input-incomplete", code: birthTime.code, birthTime };
  // A missing daylight-time clock may belong to the preceding standard date.
  // Until the date interval is resolved, do not assert a day pillar from the civil date.
  if (birthTime.status === "date-only") {
    const start = normalizeJapanBirthTime({ birthDate, clockTime: "00:00:00", utcOffsetMinutes: 540 });
    const end = normalizeJapanBirthTime({ birthDate, clockTime: "23:59:59", utcOffsetMinutes: 540 });
    if (start.status !== "calculated" || end.status !== "calculated" || start.offsetSelectionRequired || end.offsetSelectionRequired) return { status: "input-incomplete", code: "STANDARD_BIRTH_DATE_UNCERTAIN", birthTime };
  }
  return { ...calculateFourPillarsCore({ birthDate: birthTime.standardDate ?? birthDate, standardTime: birthTime.standardTime, standardTimeConfirmed: birthTime.status === "calculated", referenceDate }), birthTime };
}

const stems = "甲乙丙丁戊己庚辛壬癸", branches = "子丑寅卯辰巳午未申酉戌亥";
const stemElements = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const branchElements = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
export function countPillarElements(pillars) {
  if (!Array.isArray(pillars) || ![3, 4].includes(pillars.length)) return null;
  const result = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0, total: pillars.length * 2, includeHiddenStems: false };
  for (const pillar of pillars) {
    if (typeof pillar !== "string" || [...pillar].length !== 2) return null;
    const stem = stems.indexOf(pillar[0]), branch = branches.indexOf(pillar[1]);
    if (stem < 0 || branch < 0 || stem % 2 !== branch % 2) return null;
    result[stemElements[stem]]++; result[branchElements[branch]]++;
  }
  return result;
}
export function calculateFourPillarsCore({ birthDate, standardTime = null, standardTimeConfirmed = false, referenceDate } = {}) {
  if (calculateChineseCalendarDate(birthDate).status !== "calculated" || calculateChineseCalendarDate(referenceDate).status !== "calculated" || birthDate > referenceDate) return { status: "input-incomplete", code: "BIRTH_DATE_INVALID" };
  const known = standardTime !== null && standardTime !== "";
  if (known && (standardTimeConfirmed !== true || typeof standardTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(standardTime))) return { status: "input-incomplete", code: "CONFIRMED_STANDARD_TIME_REQUIRED" };
  const native = (date, time) => { const [year, month, day] = date.split("-").map(Number), [hour, minute, second] = time.split(":").map(Number); const result = Solar.fromYmdHms(year, month, day, hour, minute, second).getLunar().getEightChar(); result.setSect(2); return result; };
  const boundariesAt = time => {
    const instant = new Date(`${birthDate}T${time}+09:00`), cst = new Date(instant.getTime() + 8 * 3600000).toISOString();
    const chart = native(cst.slice(0, 10), cst.slice(11, 19));
    return { year: chart.getYear(), month: chart.getMonth() };
  };
  const start = boundariesAt(known ? standardTime : "00:00:00"), end = known ? start : boundariesAt("23:59:59");
  const dayChart = native(birthDate, known ? standardTime : "00:00:00");
  const yearPillar = start.year === end.year ? start.year : null, monthPillar = start.month === end.month ? start.month : null, dayPillar = dayChart.getDay(), hourPillar = known ? dayChart.getTime() : null;
  return { status: yearPillar && monthPillar ? "calculated" : "input-incomplete", calculationVersion: "ns.bazi-pillars-lunar-typescript-1.8.6.v1", birthStandardDate: birthDate, birthStandardTime: known ? standardTime : null, referenceDate,
    yearPillar, monthPillar, dayPillar, hourPillar, canUseDaYun: false, daYunStatus: "unconnected", noNoonSubstitution: true,
    elementCounts: yearPillar && monthPillar ? countPillarElements([yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])]) : null };
}
