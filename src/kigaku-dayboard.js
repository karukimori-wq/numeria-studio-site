import { Seasons } from "astronomy-engine";
import { kigakuBoardFromCenter } from "./kigaku-solar-calendar.js";

export const KIGAKU_DAYBOARD_VERSION = "ns.kigaku.koyomi8-jst.v1";
export const KIGAKU_DAYBOARD_SCHEMA = "numeria.kigaku.dayboard.v1";
const DAY_MS = 86_400_000;
const JST_MS = 9 * 60 * 60_000;
const MIN_DATE = "1901-01-01";
const MAX_DATE = "2100-12-31";

function mod(value, base) {
  return ((value % base) + base) % base;
}

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("KIGAKU_DATE_INVALID");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new TypeError("KIGAKU_DATE_INVALID");
  if (value < MIN_DATE || value > MAX_DATE) throw new RangeError("KIGAKU_DATE_OUT_OF_RANGE");
  return date;
}

function jdn(date) {
  return Math.floor(date.getTime() / DAY_MS) + 2_440_588;
}

function sexagenaryIndex(date) {
  return mod(jdn(date) + 49, 60);
}

function nearestJiaZi(date) {
  const k = sexagenaryIndex(date);
  const delta = k <= 29 ? -k : 60 - k;
  return new Date(date.getTime() + delta * DAY_MS);
}

function jstCivilDate(instant) {
  return new Date(instant.getTime() + JST_MS).toISOString().slice(0, 10);
}

function anchorsAround(year) {
  const seasons = Seasons(year);
  const winter = new Date(jstCivilDate(seasons.dec_solstice.date) + "T00:00:00.000Z");
  const summer = new Date(jstCivilDate(seasons.jun_solstice.date) + "T00:00:00.000Z");
  return [
    { date: nearestJiaZi(winter), solsticeDate: winter.toISOString().slice(0, 10), season: "winter", initialStar: 1, direction: 1 },
    { date: nearestJiaZi(summer), solsticeDate: summer.toISOString().slice(0, 10), season: "summer", initialStar: 9, direction: -1 },
  ];
}

function cycleAnchors(year) {
  return [year - 1, year, year + 1].flatMap(anchorsAround).sort((a, b) => a.date - b.date);
}

function centerFor(anchor, dayIndex, intervalLength) {
  if (intervalLength === 240 && dayIndex >= 210) {
    const star209 = mod(anchor.initialStar - 1 + anchor.direction * 209, 9) + 1;
    return mod(star209 - 1 - anchor.direction * (dayIndex - 210), 9) + 1;
  }
  return mod(anchor.initialStar - 1 + anchor.direction * dayIndex, 9) + 1;
}

export function kigakuDayboard(dateInput) {
  const target = parseDate(dateInput);
  const anchors = cycleAnchors(target.getUTCFullYear());
  const dayNumber = target.getTime() / DAY_MS;
  const index = anchors.findIndex((anchor, i) => anchor.date.getTime() / DAY_MS <= dayNumber && dayNumber < anchors[i + 1]?.date.getTime() / DAY_MS);
  if (index < 0) throw new RangeError("CALENDAR_ANCHOR_NOT_FOUND");
  const anchor = anchors[index];
  const next = anchors[index + 1];
  const intervalLength = (next.date.getTime() - anchor.date.getTime()) / DAY_MS;
  if (intervalLength !== 180 && intervalLength !== 240) throw new RangeError("CALENDAR_ANCHOR_INVALID");
  const dayIndex = dayNumber - anchor.date.getTime() / DAY_MS;
  const centerStar = centerFor(anchor, dayIndex, intervalLength);
  return {
    schemaVersion: KIGAKU_DAYBOARD_SCHEMA,
    calculationVersion: KIGAKU_DAYBOARD_VERSION,
    source: { library: "astronomy-engine", version: "2.1.19", solstice: anchor.solsticeDate },
    date: dateInput,
    sexagenaryDayIndex: sexagenaryIndex(target),
    interval: {
      anchorDate: anchor.date.toISOString().slice(0, 10),
      nextAnchorDate: next.date.toISOString().slice(0, 10),
      season: anchor.season,
      lengthDays: intervalLength,
      dayIndex,
      initialStar: anchor.initialStar,
      direction: anchor.direction === 1 ? "yang-forward" : "yin-reverse",
      leapRule: intervalLength === 240 && dayIndex >= 210 ? "repeat-209-then-reverse" : "normal",
    },
    centerStar,
    board: kigakuBoardFromCenter(centerStar),
    verificationStatus: "calculated-not-independently-verified",
  };
}
