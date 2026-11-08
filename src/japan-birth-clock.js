export const JAPAN_BIRTH_CLOCK_VERSION = "ns.clock.asia-tokyo.iana2025b.v1";
const KNOWN_JAPAN_DST_TRANSITIONS = [
  ["1948-05-01T15:00:00.000Z", 600], ["1948-09-11T15:00:00.000Z", 540],
  ["1949-04-02T15:00:00.000Z", 600], ["1949-09-10T15:00:00.000Z", 540],
  ["1950-05-06T15:00:00.000Z", 600], ["1950-09-09T15:00:00.000Z", 540],
  ["1951-05-05T15:00:00.000Z", 600], ["1951-09-08T15:00:00.000Z", 540],
].map(([instant, offsetMinutes]) => ({ instant: Date.parse(instant), offsetMinutes }));

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

function offsetAt(utcMs) {
  return KNOWN_JAPAN_DST_TRANSITIONS.filter((row) => utcMs >= row.instant).at(-1)?.offsetMinutes ?? 540;
}

export function normalizeJapanBirthClock(input) {
  const allowed = ["date", "time", "countryCode", "zoneId", "zoneConfirmed", "offsetChoiceMinutes"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key)) || (input.zoneConfirmed !== true && input.zoneConfirmed !== false) || (input.offsetChoiceMinutes != null && ![540, 600].includes(input.offsetChoiceMinutes))) {
    throw new TypeError("BIRTH_CLOCK_INPUT_INVALID");
  }
  if (typeof input.countryCode !== "string" || input.countryCode.length !== 2 || typeof input.zoneId !== "string" || input.zoneId.length > 64) throw new TypeError("BIRTH_CLOCK_INPUT_INVALID");
  const original = { ...input };
  const base = { schemaVersion: "numeria.birth-clock.v1", calculationVersion: JAPAN_BIRTH_CLOCK_VERSION, source: "IANA-tzdb-2025b-Japan-rules", original, candidates: [], intervals: [] };
  if (!input || !validDate(input.date)) return { ...base, state: "invalid", reasonCode: "BIRTH_DATE_INVALID", selected: null };
  if (input.countryCode !== "JP" || input.zoneId !== "Asia/Tokyo") return { ...base, state: "unsupported", reasonCode: "BIRTH_CLOCK_ZONE_UNSUPPORTED", selected: null };
  if (input.zoneConfirmed !== true) return { ...base, state: "missing_input", reasonCode: "BIRTH_CLOCK_ZONE_CONFIRMATION_REQUIRED", selected: null };
  if (input.time !== null && !validTime(input.time)) return { ...base, state: "invalid", reasonCode: "BIRTH_CLOCK_TIME_INVALID", selected: null };
  if (input.offsetChoiceMinutes != null && input.time === null) throw new TypeError("BIRTH_CLOCK_OFFSET_CHOICE_UNEXPECTED");
  if (input.date < "1901-01-01" || input.date > "2100-12-31") throw new RangeError("BIRTH_DATE_OUT_OF_RANGE");
  if (input.time === null) {
    const start = Date.parse(`${input.date}T00:00:00Z`);
    const end = start + 86_400_000;
    const eras = [{ instant: -Infinity, offsetMinutes: 540 }, ...KNOWN_JAPAN_DST_TRANSITIONS];
    const intervals = eras.flatMap((era, i) => {
      const from = Math.max(start - era.offsetMinutes * 60_000, era.instant);
      const to = Math.min(end - era.offsetMinutes * 60_000, eras[i + 1]?.instant ?? Infinity);
      return from < to ? [{ startInclusiveUtc: new Date(from).toISOString(), endExclusiveUtc: new Date(to).toISOString(), appliedOffsetMinutes: era.offsetMinutes }] : [];
    });
    return { ...base, state: "missing_input", reasonCode: "BIRTH_CLOCK_TIME_UNKNOWN", selected: null, intervals };
  }
  const time = input.time.length === 5 ? `${input.time}:00` : input.time;
  const localMs = Date.parse(`${input.date}T${time}.000Z`);
  const offsets = [540, 600];
  const candidates = offsets.map((offset) => {
    const utcMs = localMs - offset * 60_000;
    return { utcInstant: new Date(utcMs).toISOString(), appliedOffsetMinutes: offset, daylightSavingMinutes: offset - 540, standardDate: new Date(utcMs + 540 * 60_000).toISOString().slice(0, 10), standardTime: new Date(utcMs + 540 * 60_000).toISOString().slice(11, 19) };
  }).filter((candidate) => offsetAt(Date.parse(candidate.utcInstant)) === candidate.appliedOffsetMinutes);
  if (!candidates.length) return { ...base, state: "invalid", reasonCode: "BIRTH_CLOCK_TIME_NONEXISTENT", selected: null };
  if (candidates.length > 1) {
    if (![540, 600].includes(input.offsetChoiceMinutes)) return { ...base, state: "missing_input", reasonCode: "BIRTH_CLOCK_TIME_AMBIGUOUS", selected: null, candidates };
    const selected = candidates.find((candidate) => candidate.appliedOffsetMinutes === input.offsetChoiceMinutes) || null;
    return selected ? { ...base, state: "ready", reasonCode: null, selected, candidates } : { ...base, state: "invalid", reasonCode: "BIRTH_CLOCK_OFFSET_CHOICE_INVALID", selected: null, candidates };
  }
  if (input.offsetChoiceMinutes != null) throw new TypeError("BIRTH_CLOCK_OFFSET_CHOICE_UNEXPECTED");
  const selected = candidates[0];
  return { ...base, state: "ready", reasonCode: null, selected, candidates };
}
