// Asia/Tokyo rules, restricted to the product's 1901–2100 birth-date range.
// Source: IANA tz, asia, Rule Japan (1948–1951), https://github.com/eggert/tz/blob/main/asia
export const JAPAN_BIRTH_TIME_VERSION = "ns.japan-clock-1901-2100.v1";
const hour = 3600000;
// The end rule is Saturday 25:00 daylight time, i.e. Sunday 00:00 standard time.
const daylightIntervals = [
  ["1948-05-01T15:00:00Z", "1948-09-11T15:00:00Z"],
  ["1949-04-02T15:00:00Z", "1949-09-10T15:00:00Z"],
  ["1950-05-06T15:00:00Z", "1950-09-09T15:00:00Z"],
  ["1951-05-05T15:00:00Z", "1951-09-08T15:00:00Z"],
].map(pair => pair.map(Date.parse));
const offsetAt = instant => daylightIntervals.some(([start, end]) => instant >= start && instant < end) ? 600 : 540;
export function normalizeJapanBirthTime({ birthDate, clockTime = null, utcOffsetMinutes = null } = {}) {
  const base = { calculationVersion: JAPAN_BIRTH_TIME_VERSION, originalBirthDate: birthDate, originalClockTime: clockTime, timeZone: "Asia/Tokyo", trueSolarTimeCorrection: false };
  const failure = code => ({ ...base, status: "input-incomplete", code, utc: null, standardDate: null, standardTime: null });
  if (typeof birthDate !== "string" || !/^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/.test(birthDate) || birthDate < "1901-01-01") return failure("BIRTH_DATE_INVALID");
  const midnight = Date.parse(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== birthDate) return failure("BIRTH_DATE_INVALID");
  if (clockTime === null || clockTime === "") return { ...failure("BIRTH_TIME_UNKNOWN"), status: "date-only" };
  if (typeof clockTime !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(clockTime)) return failure("CLOCK_TIME_INVALID");
  if (utcOffsetMinutes !== null && ![540, 600].includes(utcOffsetMinutes)) return failure("OFFSET_INVALID");
  const clock = Date.parse(`${birthDate}T${clockTime}Z`);
  const candidates = [540, 600].map(offset => ({ offset, instant: clock - offset * 60000 })).filter(candidate => offsetAt(candidate.instant) === candidate.offset);
  if (!candidates.length) return failure("CLOCK_TIME_NONEXISTENT");
  if (candidates.length > 1 && utcOffsetMinutes === null) return { ...failure("CLOCK_TIME_AMBIGUOUS"), availableUtcOffsets: candidates.map(candidate => candidate.offset) };
  const selected = candidates.find(candidate => utcOffsetMinutes === null || candidate.offset === utcOffsetMinutes);
  if (!selected) return failure("OFFSET_MISMATCH");
  const standard = new Date(selected.instant + 9 * hour).toISOString();
  return { ...base, status: "calculated", utcOffsetMinutes: selected.offset, daylightSavingMinutes: selected.offset - 540, utc: new Date(selected.instant).toISOString(), standardDate: standard.slice(0, 10), standardTime: standard.slice(11, 19), offsetSelectionRequired: candidates.length > 1 };
}
