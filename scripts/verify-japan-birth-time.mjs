import assert from "node:assert/strict";
import { normalizeJapanBirthTime as normalize } from "../src/japan-birth-time.js";
import { calculateFourPillarsFromClock } from "../src/four-pillars-calculator.js";

const ordinary = normalize({ birthDate: "2000-01-07", clockTime: "23:30:00" });
assert.equal(ordinary.utc, "2000-01-07T14:30:00.000Z");
assert.equal(ordinary.standardTime, "23:30:00");
assert.equal(ordinary.utcOffsetMinutes, 540);
// Independent oracle: IANA tz asia Japan rules, starts at Saturday 24:00,
// ends at Saturday 25:00. These explicit dates exercise all four rule years.
for (const [start, end] of [["1948-05-02", "1948-09-12"], ["1949-04-03", "1949-09-11"], ["1950-05-07", "1950-09-10"], ["1951-05-06", "1951-09-09"]]) {
  assert.equal(normalize({ birthDate: start, clockTime: "00:30:00" }).code, "CLOCK_TIME_NONEXISTENT");
  assert.equal(normalize({ birthDate: start, clockTime: "01:00:00" }).utcOffsetMinutes, 600);
  assert.equal(normalize({ birthDate: end, clockTime: "00:30:00" }).code, "CLOCK_TIME_AMBIGUOUS");
  const earlier = normalize({ birthDate: end, clockTime: "00:30:00", utcOffsetMinutes: 600 });
  const later = normalize({ birthDate: end, clockTime: "00:30:00", utcOffsetMinutes: 540 });
  assert.equal(Date.parse(later.utc) - Date.parse(earlier.utc), 3600000);
  assert.equal(earlier.standardTime, "23:30:00");
  assert.ok(earlier.standardDate < end);
  assert.equal(later.standardDate, end);
  assert.equal(later.standardTime, "00:30:00");
  assert.equal(normalize({ birthDate: end, clockTime: "01:00:00" }).utcOffsetMinutes, 540);
}
for (const birthDate of ["1900-01-01", "2101-01-01", "2001-02-29", "2000-13-01"]) assert.equal(normalize({ birthDate, clockTime: "00:00:00" }).code, "BIRTH_DATE_INVALID");
assert.equal(normalize({ birthDate: "2000-01-01", clockTime: "24:00:00" }).code, "CLOCK_TIME_INVALID");
assert.equal(normalize({ birthDate: "2000-01-01", clockTime: "12:00:00", utcOffsetMinutes: 600 }).code, "OFFSET_MISMATCH");
assert.equal(normalize({ birthDate: "2000-01-01" }).utc, null);
const birth = { birthDate: "1948-09-12", clockTime: "00:30:00", referenceDate: "2026-11-10" };
assert.equal(calculateFourPillarsFromClock(birth).code, "CLOCK_TIME_AMBIGUOUS");
const a = calculateFourPillarsFromClock({ ...birth, utcOffsetMinutes: 600 });
const b = calculateFourPillarsFromClock({ ...birth, utcOffsetMinutes: 540 });
assert.equal(a.birthStandardDate, "1948-09-11");
assert.equal(b.birthStandardDate, "1948-09-12");
assert.notEqual(a.dayPillar, b.dayPillar);
assert.equal(a.birthTime.originalBirthDate, "1948-09-12");
assert.equal(calculateFourPillarsFromClock({ ...birth, clockTime: null }).code, "STANDARD_BIRTH_DATE_UNCERTAIN");
assert.equal(calculateFourPillarsFromClock({ ...birth, birthDate: "1948-07-01", clockTime: null }).code, "STANDARD_BIRTH_DATE_UNCERTAIN");
assert.equal(calculateFourPillarsFromClock({ birthDate: "2000-01-07", referenceDate: "2026-11-10" }).hourPillar, null);
console.log("Japanese birth clock: four DST years, gaps/folds, explicit offsets, original/standard/UTC provenance, four-pillars day rollover and unknown-time refusal verified.");
