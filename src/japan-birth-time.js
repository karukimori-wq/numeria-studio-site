import { normalizeJapanBirthClock } from "./japan-birth-clock.js";
// Asia/Tokyo rules, restricted to the product's 1901–2100 birth-date range.
// Source: IANA tz, asia, Rule Japan (1948–1951), https://github.com/eggert/tz/blob/main/asia
export const JAPAN_BIRTH_TIME_VERSION = "ns.japan-clock-1901-2100.v1";
export function normalizeJapanBirthTime({ birthDate, clockTime = null, utcOffsetMinutes = null } = {}) {
  const base = { calculationVersion: JAPAN_BIRTH_TIME_VERSION, originalBirthDate: birthDate, originalClockTime: clockTime, timeZone: "Asia/Tokyo", trueSolarTimeCorrection: false };
  const failure = code => ({ ...base, status: "input-incomplete", code, utc: null, standardDate: null, standardTime: null });
  if (typeof birthDate !== "string" || !/^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/.test(birthDate) || birthDate < "1901-01-01") return failure("BIRTH_DATE_INVALID");
  const midnight = Date.parse(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== birthDate) return failure("BIRTH_DATE_INVALID");
  if (clockTime === null || clockTime === "") return { ...failure("BIRTH_TIME_UNKNOWN"), status: "date-only" };
  if (typeof clockTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(clockTime)) return failure("CLOCK_TIME_INVALID");
  if (utcOffsetMinutes !== null && ![540, 600].includes(utcOffsetMinutes)) return failure("OFFSET_INVALID");
  // The legacy contract accepts an explicitly matching offset outside a fold.
  // Let the shared normalizer discover candidates before applying that choice.
  let clock = normalizeJapanBirthClock({ date: birthDate, time: clockTime, countryCode: "JP", zoneId: "Asia/Tokyo", zoneConfirmed: true, offsetChoiceMinutes: null });
  if (clock.reasonCode === "BIRTH_CLOCK_TIME_NONEXISTENT") return failure("CLOCK_TIME_NONEXISTENT");
  if (clock.reasonCode === "BIRTH_CLOCK_TIME_AMBIGUOUS") {
    if (utcOffsetMinutes === null) return { ...failure("CLOCK_TIME_AMBIGUOUS"), availableUtcOffsets: clock.candidates.map(candidate => candidate.appliedOffsetMinutes) };
    clock = normalizeJapanBirthClock({ ...clock.original, offsetChoiceMinutes: utcOffsetMinutes });
  }
  const selected = clock.selected;
  if (!selected || (utcOffsetMinutes !== null && selected.appliedOffsetMinutes !== utcOffsetMinutes)) return failure("OFFSET_MISMATCH");
  return { ...base, status: "calculated", utcOffsetMinutes: selected.appliedOffsetMinutes, daylightSavingMinutes: selected.daylightSavingMinutes, utc: selected.utcInstant, standardDate: selected.standardDate, standardTime: selected.standardTime, offsetSelectionRequired: clock.candidates.length > 1 };
}
