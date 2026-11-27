import assert from "node:assert/strict";
import { numerologyLegacyViewNumbers, numerologyLegacyPartnerNumbers, numerologyLegacyNumbersReady } from "../src/numerology-legacy-bridge.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";
import { normalizeNumerologyNameInputs, updateNumerologyNameInputs } from "../src/numerology-name-input.js";
const reading = { divination: "numerology", id: "common-calculation", name: "本人", birthName: "TARO YAMADA", birthday: "2009-11-11", visitDate: "2027-01-01", partnerName: "相手", partnerBirthName: "HANAKO SATO", partnerBirthday: "1990-01-01", includeCompatibility: true };
let names = normalizeNumerologyNameInputs(null);
for (const [role, romanName] of [["subject", "TARO YAMADA"], ["partner", "HANAKO SATO"]]) {
  names = updateNumerologyNameInputs(names, { role, operation: "edit", romanName }, reading).value;
  names = updateNumerologyNameInputs(names, { role, operation: "confirm" }, reading).value;
}
reading.numerologyNameInputs = names;
const canonical = withNumerologyCalculationCheckpoint(reading).numerologyCalculation.results[0].data;
assert.deepEqual(numerologyLegacyViewNumbers(reading), canonical);
assert.equal(canonical.personalYear, 6, "the saved 2027 date wins over the old hardcoded 2026");
assert.equal(numerologyLegacyNumbersReady(canonical), true);
const unconfirmed = numerologyLegacyViewNumbers({ ...reading, numerologyNameInputs: null });
assert.equal(unconfirmed.destiny, 0);
assert.equal(unconfirmed.lifePath, 33);
assert.equal(numerologyLegacyNumbersReady(unconfirmed), false);
const partner = numerologyLegacyPartnerNumbers(reading);
assert.equal(partner.lifePath, 3);
assert.equal(partner.personalYear, 4);
assert.equal(numerologyLegacyNumbersReady(partner), true);
assert.equal(numerologyLegacyPartnerNumbers({ ...reading, numerologyNameInputs: null }).destiny, 0);
assert.ok(Object.values(numerologyLegacyViewNumbers({ ...reading, visitDate: "" })).every(value => value === 0));
assert.equal(numerologyLegacyViewNumbers({ ...reading, birthday: "2024-02-30" }).lifePath, 0);
assert.ok(Object.values(numerologyLegacyViewNumbers({ ...reading, divination: "tarot" })).every(value => value === 0));
console.log("Legacy display/AI/PDF numeric projection matches canonical confirmed-name calculation, saved year and partner identity; missing input does not borrow number 1.");
