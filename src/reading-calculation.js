import { withNumerologyCalculationCheckpoint } from "./numerology-result-checkpoint.js";
import { withNumerologyRegisteredSelection } from "./numerology-registered-draft.js";
import { withFourPillarsCalculationCheckpoint } from "./four-pillars-calculation-checkpoint.js";
import { withKigakuCalculationCheckpoint } from "./kigaku-calculation-checkpoint.js";
import { createTarotReadingSnapshot, restoreTarotEditor } from "./tarot-reading-draft.js";

export function readingReferenceConflict(previous, incoming) {
  if (!incoming) return null;
  for (const [inputKey, calculationKey, referenceKey, code] of [
    ["kigakuInput", "kigakuCalculation", "referenceInstant", "KIGAKU_REFERENCE_LOCKED"],
    ["fourPillarsInput", "fourPillarsCalculation", "referenceDate", "FOUR_PILLARS_REFERENCE_LOCKED"],
  ]) {
    const fixed = previous?.[inputKey]?.[referenceKey] || previous?.[calculationKey]?.source?.[referenceKey];
    if (fixed && incoming?.[inputKey]?.[referenceKey] !== fixed) return code;
  }
  return null;
}

// A saved calculation is derived data. Client-supplied values and approval
// fields never become authority merely because a Session is completed.
export async function calculateReadingSnapshot(snapshot, { id, methodKey, planId = "free" } = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  let reading = { ...snapshot, id, divination: methodKey };
  delete reading.completedReadingReport;
  reading = withNumerologyCalculationCheckpoint(reading);
  reading = withFourPillarsCalculationCheckpoint(withKigakuCalculationCheckpoint(reading));
  if (methodKey === "tarot") {
    const editor = restoreTarotEditor(reading);
    const captured = createTarotReadingSnapshot({ id, customer: { id: reading.selectedCustomerId, name: reading.name, birthday: reading.birthday }, editor });
    reading = { ...reading, tarotCalculation: captured.tarotCalculation };
  } else {
    delete reading.tarotCalculation;
  }
  return withNumerologyRegisteredSelection(reading, planId);
}
