import { normalizeJapanBirthClock } from "./japan-birth-clock.js";
import { calculateFourPillarsFromClock } from "./four-pillars-calculator.js";
import { countVisiblePillarElements } from "./four-pillars-elements.js";

// Use the shared strict clock contract while preserving main's JST/CST and unknown-time rules.
export function fourPillarsFromBirthClock({ birthClock, referenceDate } = {}) {
  const base = { publicationAllowed: false, verificationState: "review-required", pillars: null };
  let clock;
  try { clock = normalizeJapanBirthClock(birthClock); }
  catch (error) { return { ...base, state: "calculation-error", reason: error.message }; }
  if (!clock.selected && clock.reasonCode !== "BIRTH_CLOCK_TIME_UNKNOWN") return { ...base, state: clock.state === "invalid" ? "calculation-error" : "required-missing", reason: clock.reasonCode, clockNormalization: clock };
  const calculation = calculateFourPillarsFromClock({ birthDate: birthClock.date, clockTime: clock.selected ? clock.original.time.length === 5 ? clock.original.time + ":00" : clock.original.time : null, utcOffsetMinutes: clock.selected?.appliedOffsetMinutes ?? null, referenceDate });
  if (calculation.status !== "calculated") return { ...base, state: "required-missing", reason: calculation.code || "PILLAR_BOUNDARY_UNCERTAIN", calculation, clockNormalization: clock };
  const pillars = { year: calculation.yearPillar, month: calculation.monthPillar, day: calculation.dayPillar, hour: calculation.hourPillar };
  return { ...base, state: "available", pillars, elements: countVisiblePillarElements(pillars), calculationVersion: calculation.calculationVersion, calculation, clockNormalization: clock };
}
