import { normalizeJapanBirthClock } from "./japan-birth-clock.js";
import { kigakuSolarPeriod, kigakuSolarTerms } from "./kigaku-solar-calendar.js";
import { kigakuDayboard } from "./kigaku-dayboard.js";

export const KIGAKU_RESULT_SCHEMA = "numeria.kigaku.clock-result.v1";
const iso = (ms) => new Date(ms).toISOString();
const jstDate = (ms) => iso(ms + 540 * 60_000).slice(0, 10);
function checkedInstant(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new TypeError("REFERENCE_INSTANT_INVALID");
  const [hours, minutes, seconds] = value.slice(11, 19).split(":").map(Number);
  const offset = value.match(/[+-](\d{2}):(\d{2})$/);
  if (hours > 23 || minutes > 59 || seconds > 59 || (offset && (+offset[1] > 23 || +offset[2] > 59))) throw new TypeError("REFERENCE_INSTANT_INVALID");
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new TypeError("REFERENCE_INSTANT_INVALID");
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== datePart) throw new TypeError("REFERENCE_INSTANT_INVALID");
  if (jstDate(ms) < "1901-01-01" || jstDate(ms) > "2100-12-31") throw new RangeError("REFERENCE_DATE_OUT_OF_RANGE");
  return ms;
}

function unavailable(reasonCode) {
  return { state: "missing_input", value: null, candidates: [], reasonCode };
}
function classify(values, reasonCode) {
  const candidates = [...new Set(values)].sort((a, b) => a - b);
  return candidates.length === 1
    ? { state: "ready", value: candidates[0], candidates, reasonCode: null }
    : { state: "missing_input", value: null, candidates, reasonCode };
}

function birthPeriods(clock) {
  if (clock.selected) return [kigakuSolarPeriod(clock.selected.utcInstant)];
  if (clock.reasonCode !== "BIRTH_CLOCK_TIME_UNKNOWN") return [];
  return clock.intervals.flatMap((interval) => {
    const start = Date.parse(interval.startInclusiveUtc);
    const end = Date.parse(interval.endExclusiveUtc);
    const year = new Date(start + 540 * 60_000).getUTCFullYear();
    const cuts = [year - 1, year, year + 1].flatMap(kigakuSolarTerms)
      .map((term) => Date.parse(term.instant)).filter((ms) => start < ms && ms < end);
    return [start, ...cuts].sort((a, b) => a - b).map((ms) => kigakuSolarPeriod(iso(ms)));
  });
}

export function createKigakuResultFromClock({ referenceInstant, birthClock = null }) {
  const referenceMs = checkedInstant(referenceInstant);
  const reference = kigakuSolarPeriod(iso(referenceMs));
  const day = kigakuDayboard(jstDate(referenceMs));
  let clock = null;
  let periods = [];
  let reasonCode = "BIRTH_INPUT_REQUIRED";
  if (birthClock) {
    clock = normalizeJapanBirthClock(birthClock);
    reasonCode = clock.reasonCode;
    if (clock.state === "ready" || clock.reasonCode === "BIRTH_CLOCK_TIME_UNKNOWN") {
      if (birthClock.date < "1901-01-01" || birthClock.date > jstDate(referenceMs)) throw new RangeError("BIRTH_DATE_OUT_OF_RANGE");
      if (clock.selected && Date.parse(clock.selected.utcInstant) > referenceMs) throw new RangeError("BIRTH_IN_FUTURE");
      if (!clock.selected && clock.intervals.some((row) => Date.parse(row.endExclusiveUtc) - 1 > referenceMs)) {
        reasonCode = "BIRTH_INTERVAL_AFTER_REFERENCE";
      } else {
        periods = birthPeriods(clock);
      }
    }
  }
  const mainStar = periods.length ? classify(periods.map((period) => period.year.centerStar), "BIRTH_YEAR_BOUNDARY_UNCERTAIN") : unavailable(reasonCode);
  const monthStar = periods.length ? classify(periods.map((period) => period.month.centerStar), "BIRTH_MONTH_BOUNDARY_UNCERTAIN") : unavailable(reasonCode);
  return {
    schemaVersion: KIGAKU_RESULT_SCHEMA,
    input: { referenceInstant: iso(referenceMs), birthClock: birthClock ? structuredClone(birthClock) : null },
    state: mainStar.state === "ready" && monthStar.state === "ready" ? "ready" : "partial",
    verificationStatus: "calculated-not-independently-verified",
    clockNormalization: clock,
    natal: { mainStar, monthStar, possiblePeriods: periods },
    year: reference.year,
    month: reference.month,
    day,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function validateKigakuResult(value) {
  if (!value || value.schemaVersion !== KIGAKU_RESULT_SCHEMA) throw new TypeError("KIGAKU_RESULT_SCHEMA_INVALID");
  const canonical = createKigakuResultFromClock(value.input || {});
  if (stableJson(canonical) !== stableJson(value)) throw new TypeError("KIGAKU_RESULT_RECOMPUTATION_MISMATCH");
  return canonical;
}
