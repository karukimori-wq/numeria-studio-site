export const NUMEROLOGY_CALCULATION_VERSION = "numeria-numerology-rules-2026-10-19.v1";
const masterNumbers = new Set([11, 22, 33]);
function reduceNumerology(value, preserveMasters = true) {
  let result = value;
  while (result > 9 && !(preserveMasters && masterNumbers.has(result))) result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return result;
}

function numerologyDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const limit = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= limit ? { year, month, day } : null;
}

export function calculateNumerology({ birthday, romanName = "", referenceDate } = {}) {
  const birth = numerologyDate(birthday), reference = numerologyDate(referenceDate);
  if (!birth || !reference || birthday > referenceDate) return { status: "input-incomplete", code: "NUMEROLOGY_DATE_INVALID", calculationVersion: NUMEROLOGY_CALCULATION_VERSION };
  if (typeof romanName !== "string") return { status: "input-incomplete", code: "NUMEROLOGY_NAME_INVALID", calculationVersion: NUMEROLOGY_CALCULATION_VERSION };
  const name = romanName.normalize("NFKC").toUpperCase().replace(/[\s'\u2019-]/g, "");
  if (/[^A-Z]/.test(name)) return { status: "input-incomplete", code: "NUMEROLOGY_NAME_INVALID", calculationVersion: NUMEROLOGY_CALCULATION_VERSION };
  const characters = [...name].map(letter => ({ vowel: "AEIOU".includes(letter), value: (letter.charCodeAt(0) - 65) % 9 + 1 }));
  const numberFor = items => items.length ? reduceNumerology(items.reduce((sum, item) => sum + item.value, 0)) : null;
  const lifePath = reduceNumerology(reduceNumerology(birth.year) + reduceNumerology(birth.month) + reduceNumerology(birth.day));
  const destiny = numberFor(characters);
  const personalYearFor = year => reduceNumerology(birth.month + birth.day + reduceNumerology(year, false), false);
  const coreNumbers = {
    lifePath, birthdayNumber: reduceNumerology(birth.day),
    attitude: reduceNumerology(birth.month + birth.day, false),
    destiny, soul: numberFor(characters.filter(item => item.vowel)),
    personality: numberFor(characters.filter(item => !item.vowel)),
    maturity: destiny === null ? null : reduceNumerology(lifePath + destiny),
    personalYear: personalYearFor(reference.year),
  };
  const nameDigitCounts = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, characters.filter(item => item.value === i + 1).length]));
  const maximum = Math.max(...Object.values(nameDigitCounts));
  return {
    status: "calculated", calculationVersion: NUMEROLOGY_CALCULATION_VERSION,
    // Calculation completion is not independent validation or formal release approval.
    referenceDate, birthday, normalizedRomanName: name, coreNumbers,
    personalMonth: reduceNumerology(coreNumbers.personalYear + reference.month, false),
    personalYears: reference.year >= 5 && reference.year <= 9995 ? Array.from({ length: 9 }, (_, index) => ({ year: reference.year - 4 + index, value: personalYearFor(reference.year - 4 + index), current: index === 4 })) : null,
    nameDigitCounts: name ? nameDigitCounts : null,
    missingDigits: name ? Object.keys(nameDigitCounts).map(Number).filter(key => nameDigitCounts[key] === 0) : null,
    mostFrequentDigits: name ? Object.keys(nameDigitCounts).map(Number).filter(key => nameDigitCounts[key] === maximum) : null,
    missingCoreNumbers: Object.keys(coreNumbers).filter(key => coreNumbers[key] === null),
  };
}
