import { buildNumerologyRegisteredDraft } from "./numerology-registered-draft.js";

export const COMPLETED_READING_REPORT_VERSION = "numeria.completed-reading-report.v1";

// Persist the selected text itself, rather than looking it up again after a
// registry update. Handwritten sections, comments and layout stay in reading.
export async function freezeCompletedReadingReport(reading, planId) {
  if (!reading) return null;
  const { completedReadingReport: ignored, ...input } = reading;
  const registeredDraft = input.divination === "numerology" && input.numerologyRegisteredPagesEnabled === true
    ? await buildNumerologyRegisteredDraft(input, planId) : null;
  const content = structuredClone({ reading: input, registeredDraft });
  const bytes = new TextEncoder().encode(JSON.stringify(content));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const contentHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return { ...input, completedReadingReport: { schemaVersion: COMPLETED_READING_REPORT_VERSION,
    sessionId: input.id, methodKey: input.divination, contentHash, content,
    // Immutable storage does not constitute a mathematical/editorial approval.
    verificationState: "review-required", publicationAllowed: false } };
}

export function completedReadingExportBody(session, delivery = {}) {
  const reading = session?.snapshot;
  return { ...delivery, appraisalId: session.id, clientName: session.clientName, birthDate: session.birthDate,
    lifePathNumber: reading?.numerologyCalculation ? reading.numerologyCalculation.results?.[0]?.data?.lifePath ?? null : session.lifePathNumber ?? null,
    question: session.question, resultSummary: session.resultSummary, notes: session.notes,
    readingSnapshot: reading ? structuredClone(reading) : null };
}
