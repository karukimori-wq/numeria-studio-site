import assert from "node:assert/strict";
import { DIVINATION_RESULT_CONTRACT_VERSION, confirmedResultRecord, validateConfirmedDivinationResult } from "../src/divination-result-contract.js";

const validNumerology = { methodKey: "numerology", status: "confirmed", calculationVersion: "numerology-core.v1", validationEvidence: ["fixture:numerology-core-01"], results: [{ resultKey: "core_numbers", data: { lifePath: 7 } }] };
assert.equal(validateConfirmedDivinationResult(validNumerology).ok, true);
assert.equal(confirmedResultRecord(validNumerology).contractVersion, DIVINATION_RESULT_CONTRACT_VERSION);
assert.equal(validateConfirmedDivinationResult({ ...validNumerology, status: "draft" }).code, "RESULT_NOT_CONFIRMED");
assert.equal(validateConfirmedDivinationResult({ ...validNumerology, validationEvidence: [] }).code, "VALIDATION_EVIDENCE_REQUIRED");
assert.deepEqual(validateConfirmedDivinationResult({ ...validNumerology, methodKey: "western-astrology" }).missing, ["natal_chart"]);
assert.equal(confirmedResultRecord({ ...validNumerology, methodKey: "unknown" }), null);
console.log("Confirmed divination result contract verified.");
