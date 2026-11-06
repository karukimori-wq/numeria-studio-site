import { numerologyPageDataFromReading } from "./numerology-page-data.js";

export const NUMEROLOGY_CHECKPOINT_VERSION = "numeria-numerology-calculation-checkpoint.v1";

export function withNumerologyCalculationCheckpoint(snapshot) {
  if (snapshot?.divination !== "numerology") {
    if (!snapshot || typeof snapshot !== "object") return snapshot;
    const { numerologyCalculation, ...other } = snapshot;
    return other;
  }
  const connection = numerologyPageDataFromReading(snapshot);
  const checkpoint = {
    schemaVersion: NUMEROLOGY_CHECKPOINT_VERSION,
    methodKey: "numerology", status: connection.status, calculationVersion: connection.calculationVersion,
    // This is a draft calculation checkpoint, not an approval of formal results.
    verificationState: "review-required",
    source: { sessionId: snapshot.id || null, birthday: snapshot.birthday || null,
      referenceDate: snapshot.visitDate || null, nameSources: connection.nameSources,
      partnerBirthday: snapshot.includeCompatibility === true ? snapshot.partnerBirthday || null : null,
      partnerRelation: snapshot.includeCompatibility === true ? snapshot.partnerRelation || null : null,
      includeCompatibility: snapshot.includeCompatibility === true },
    results: [{ resultKey: "core_numbers", data: connection.coreNumbers }],
    pageResults: connection.pages,
  };
  return { ...snapshot, numerologyCalculation: checkpoint };
}
