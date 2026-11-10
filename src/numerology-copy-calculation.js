import { calculateNumerology, NUMEROLOGY_CALCULATION_VERSION } from "./numerology-calculator.js";
import { NUMEROLOGY_NAME_INPUT_VERSION } from "./numerology-name-input.js";

// Compatibility projection for recovered selectors/figures. The current calculator
// remains the only numeric authority; no second calculator is imported.
export const NUMEROLOGY_VERSION = NUMEROLOGY_CALCULATION_VERSION;
export const NAME_NORMALIZATION_VERSION = NUMEROLOGY_NAME_INPUT_VERSION;
export const CORE_NUMBER_KEYS = Object.freeze(["lifePath", "birthdayNumber", "attitude", "destiny", "soul", "personality", "maturity", "personalYear"]);
export function createNumerologySnapshot(input = {}) {
  const confirmed = input.romanNameConfirmed === true;
  const selectedName = confirmed && typeof input.selectedName === "string" ? input.selectedName : "";
  let calculation = calculateNumerology({ birthday: input.birthDate, referenceDate: input.referenceDate, romanName: selectedName });
  if (calculation.code === "NUMEROLOGY_NAME_INVALID") calculation = calculateNumerology({ birthday: input.birthDate, referenceDate: input.referenceDate });
  const result = value => value === null || value === undefined ? { state: "missing_input", value: null, reason: "CONFIRMED_INPUT_REQUIRED" } : { state: "ready", value, reason: null };
  const results = Object.fromEntries(CORE_NUMBER_KEYS.map(key => [key, result(calculation.coreNumbers?.[key])]));
  Object.assign(results, {
    nameDigitCounts: result(calculation.nameDigitCounts ? Object.values(calculation.nameDigitCounts) : null),
    missingDigits: result(calculation.missingDigits), mostFrequentDigits: result(calculation.mostFrequentDigits),
    personalYearSequence: result(calculation.personalYears?.map(item => ({ ...item, state: "ready" }))),
    personalMonth: result(calculation.personalMonth), pinnacleNumbers: result(calculation.pinnacles?.map(item => item.value)),
    pinnaclePeriods: result(calculation.pinnacles), challengeNumbers: result(calculation.challengeNumbers?.map(item => item.value)),
  });
  return { schemaVersion: 1, calculationVersion: NUMEROLOGY_VERSION, nameNormalizationVersion: NAME_NORMALIZATION_VERSION,
    birthDate: input.birthDate ?? null, referenceDate: input.referenceDate ?? null,
    selectedNameSource: input.selectedNameSource === "current" ? "current" : "birth", selectedName,
    romanNameConfirmed: confirmed, results };
}
