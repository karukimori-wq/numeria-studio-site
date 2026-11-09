import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateAspect, calculateCompositeMidpoint } from "../src/astrology-math.js";
import { countPillarElements, calculateFourPillarsCore } from "../src/four-pillars-calculator.js";
import { commonNineStarDirections, calculateZiWeiNominalAge } from "../src/calendar-calculators.js";
const cases = JSON.parse(readFileSync("test-fixtures/additional-divination-reference-cases.json", "utf8")).cases;
for (const item of cases) {
  let actual;
  if (item.id === "KIG-ZERO-DIRECTIONS") actual = commonNineStarDirections(item.input.yearGood, item.input.monthGood);
  else if (item.id === "BAZ-HOUR-MISSING") {
    const result = calculateFourPillarsCore({ birthDate: item.input.birthDate, referenceDate: "2026-10-19" });
    actual = { hourPillar: result.hourPillar, canUseDaYun: result.canUseDaYun, noNoonSubstitution: result.noNoonSubstitution };
    assert.equal(result.dayPillar, "甲子"); assert.equal(result.elementCounts.total, 6);
  } else if (item.id === "BAZ-ELEMENT-COUNT") actual = countPillarElements(item.input.pillars);
  else if (item.id.startsWith("AST-ORB") || item.id === "AST-AXIS-CAP") {
    const result = calculateAspect(item.input);
    actual = item.expected.aspect ? { aspect: result.aspect, included: result.status === "calculated" } : { conjunctionIncluded: result.aspect === "conjunction" };
  } else if (item.id.startsWith("AST-COMPOSITE")) {
    const result = calculateCompositeMidpoint(item.input.pairDegrees);
    actual = item.expected.sameWhenInputOrderReversed ? { midpointDegrees: result.midpointDegrees, sameWhenInputOrderReversed: result.midpointDegrees === calculateCompositeMidpoint([...item.input.pairDegrees].reverse()).midpointDegrees } : result;
  } else if (item.id === "ZIW-AGE-BOUNDARY") actual = { nominalAges: item.input.referenceDates.map(date => calculateZiWeiNominalAge(item.input.birthLunarYear, date).nominalAge) };
  assert.deepEqual(actual, item.expected, item.id);
}
const late = calculateFourPillarsCore({ birthDate: "2000-01-07", standardTime: "23:00:00", standardTimeConfirmed: true, referenceDate: "2026-10-19" });
assert.equal(late.dayPillar, "甲子"); assert.equal(late.hourPillar, "丙子");
const boundary = calculateFourPillarsCore({ birthDate: "2026-02-04", referenceDate: "2026-10-19" });
assert.equal(boundary.yearPillar, null); assert.equal(boundary.monthPillar, null); assert.equal(boundary.elementCounts, null);
assert.equal(calculateFourPillarsCore({ birthDate: "2000-01-07", standardTime: "12:00:00", referenceDate: "2026-10-19" }).status, "input-incomplete");
assert.equal(countPillarElements(["甲丑", "乙丑", "丙寅"]), null);
assert.equal(calculateAspect({ longitudePair: [0, 0], pair: ["ASC", "MC"], chartKind: "natal" }).status, "unsupported");
assert.equal(calculateAspect({ longitudePair: [0, 2.000001], chartKind: "transit" }).status, "empty");
console.log(`Additional math: ${cases.length} recorded normative cases passed; boundary-unknown pillars, 23h rule, six/eight character counts, orb endpoints and ambiguous midpoint verified. Full page connections remain incomplete.`);
