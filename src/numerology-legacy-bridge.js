import { numerologyPageDataFromReading } from "./numerology-page-data.js";
import { selectedNumerologyName } from "./numerology-name-input.js";
import { calculateNumerology } from "./numerology-calculator.js";

// Zero is only the legacy view's unavailable marker (displayed as an em dash).
// The canonical checkpoint retains null; no zero is an approved calculation.
export function numerologyLegacyViewNumbers(reading) {
  const data = numerologyPageDataFromReading(reading)?.coreNumbers || {};
  return Object.fromEntries(["lifePath", "birthdayNumber", "attitude", "destiny", "soul", "personality", "maturity", "personalYear"]
    .map(key => [key, Number.isInteger(data[key]) ? data[key] : 0]));
}

export function numerologyLegacyNumbersReady(numbers) {
  return ["lifePath", "birthdayNumber", "attitude", "destiny", "soul", "personality", "maturity", "personalYear"]
    .every(key => Number.isInteger(numbers?.[key]) && numbers[key] > 0);
}

export function numerologyLegacyPartnerNumbers(reading) {
  const name = selectedNumerologyName(reading, "partner");
  const result = calculateNumerology({ birthday: reading.partnerBirthday, referenceDate: reading.visitDate,
    romanName: name.romanNameConfirmed ? name.romanName : "" });
  return Object.fromEntries(["lifePath", "birthdayNumber", "attitude", "destiny", "soul", "personality", "maturity", "personalYear"]
    .map(key => [key, result.coreNumbers?.[key] ?? 0]));
}
