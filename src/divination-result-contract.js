export const DIVINATION_RESULT_CONTRACT_VERSION = "numeria-confirmed-divination-result.v1";

export const DIVINATION_RESULT_REQUIREMENTS = Object.freeze({
  numerology: ["core_numbers"],
  tarot: ["spread"],
  "nine-star-ki": ["honmei_star", "getsumei_star"],
  "four-pillars": ["natal_chart"],
  "western-astrology": ["natal_chart"],
  "zi-wei-dou-shu": ["natal_chart"],
});

// Decorative images and partial form values never make a result confirmed.
// A calculator must declare its version and a reproducible validation reference.
export function validateConfirmedDivinationResult(candidate) {
  const methodKey = String(candidate?.methodKey || "");
  const requiredResultKeys = DIVINATION_RESULT_REQUIREMENTS[methodKey];
  if (!requiredResultKeys) return { ok: false, code: "METHOD_UNSUPPORTED" };
  if (candidate?.status !== "confirmed") return { ok: false, code: "RESULT_NOT_CONFIRMED" };
  if (typeof candidate.calculationVersion !== "string" || !candidate.calculationVersion.trim()) return { ok: false, code: "CALCULATION_VERSION_REQUIRED" };
  if (!Array.isArray(candidate.validationEvidence) || !candidate.validationEvidence.some((item) => typeof item === "string" && item.trim())) return { ok: false, code: "VALIDATION_EVIDENCE_REQUIRED" };
  const results = Array.isArray(candidate.results) ? candidate.results : [];
  const keys = new Set(results.filter((item) => item && typeof item.resultKey === "string" && item.data && typeof item.data === "object").map((item) => item.resultKey));
  const missing = requiredResultKeys.filter((key) => !keys.has(key));
  return missing.length ? { ok: false, code: "REQUIRED_RESULT_MISSING", missing } : { ok: true, methodKey, requiredResultKeys };
}

export function confirmedResultRecord(candidate) {
  const validation = validateConfirmedDivinationResult(candidate);
  return validation.ok ? { ...candidate, contractVersion: DIVINATION_RESULT_CONTRACT_VERSION } : null;
}
