import { createKigakuResultFromClock } from "./kigaku-result.js";
import { createKigakuDirectionResult } from "./kigaku-directions.js";

export const KIGAKU_READING_SCHEMA = "numeria.kigaku.reading.v1";
const fields = ["referenceInstant", "birthClock", "birthPlace", "selectedDirection", "question", "purpose", "theme", "practitionerComment", "commentEnabled"];
function text(value, max) {
  if (typeof value !== "string" || value.length > max) throw new TypeError("KIGAKU_READING_TEXT_INVALID");
  return value;
}
export function createKigakuReading(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !fields.includes(key))) throw new TypeError("KIGAKU_READING_INPUT_INVALID");
  if (input.commentEnabled !== undefined && typeof input.commentEnabled !== "boolean") throw new TypeError("KIGAKU_READING_COMMENT_FLAG_INVALID");
  if (input.birthClock !== undefined && input.birthClock !== null && (typeof input.birthClock !== "object" || Array.isArray(input.birthClock))) throw new TypeError("KIGAKU_READING_BIRTH_CLOCK_INVALID");
  const sourceResult = createKigakuResultFromClock({ referenceInstant: input.referenceInstant, birthClock: input.birthClock ?? null });
  if (sourceResult.clockNormalization?.state === "invalid") throw new TypeError(sourceResult.clockNormalization.reasonCode);
  const canonicalInput = {
    ...sourceResult.input,
    birthPlace: text(input.birthPlace ?? "", 500),
    selectedDirection: input.selectedDirection ?? null,
    question: text(input.question ?? "", 10000),
    purpose: text(input.purpose ?? "", 1000),
    theme: text(input.theme ?? "", 1000),
    practitionerComment: text(input.practitionerComment ?? "", 20000),
    commentEnabled: input.commentEnabled ?? true,
  };
  return {
    schemaVersion: KIGAKU_READING_SCHEMA,
    input: canonicalInput,
    result: createKigakuDirectionResult({ sourceResult, selectedDirection: canonicalInput.selectedDirection }),
    systemExplanationEnabled: true,
    publicationStatus: "draft",
  };
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function validateKigakuReading(value) {
  if (!value || value.schemaVersion !== KIGAKU_READING_SCHEMA) throw new TypeError("KIGAKU_READING_SCHEMA_INVALID");
  const canonical = createKigakuReading(value.input);
  if (stable(canonical) !== stable(value)) throw new TypeError("KIGAKU_READING_RECOMPUTATION_MISMATCH");
  return canonical;
}
