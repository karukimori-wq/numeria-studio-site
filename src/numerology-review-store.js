import { withNumerologyCalculationCheckpoint } from "./numerology-result-checkpoint.js";
import { numerologyApprovalScope } from "./numerology-confirmed-result.js";

const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Identity and session are supplied by the verified server boundary, never body fields.
export async function handleNumerologyReviewRequest(request, db, identity, session) {
  const fail = (code, status) => response({ status: "error", errorCode: code }, status);
  if (!identity?.verified || !identity.userId) return fail("AUTH_SESSION_REQUIRED", 401);
  if (!["GET", "POST"].includes(request.method)) return fail("METHOD_NOT_ALLOWED", 405);
  if (!db) return fail("D1_REQUIRED", 503);
  const snapshot = session?.snapshot;
  if (!snapshot || session.id !== snapshot.id || snapshot.divination !== "numerology") return fail("NUMEROLOGY_SESSION_REQUIRED", 422);
  const current = withNumerologyCalculationCheckpoint(snapshot).numerologyCalculation;
  if (current.status !== "calculated" || JSON.stringify(current) !== JSON.stringify(snapshot.numerologyCalculation) || snapshot.exampleOnly === true) return fail("CALCULATION_CHECKPOINT_REVIEW_REQUIRED", 422);
  const scope = numerologyApprovalScope(snapshot);
  const calculation = { results: current.results, pageResults: current.pageResults };
  const bytes = new TextEncoder().encode(JSON.stringify({ scope, calculation }));
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return fail("INVALID_JSON", 400); }
    if (!body || Object.keys(body).some(key => key !== "expectedDraftVersion")) return fail("REVIEW_INPUT_NOT_ALLOWED", 400);
    if (!session.draftVersion || body.expectedDraftVersion !== session.draftVersion) return fail("DRAFT_VERSION_MISMATCH", 409);
    await db.prepare("INSERT OR IGNORE INTO numerology_review_requests (request_id, workspace_id, user_id, session_id, input_hash, calculation_version, scope_json, calculation_json, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), identity.workspaceId, identity.userId, session.id, hash, current.calculationVersion, JSON.stringify(scope), JSON.stringify(calculation), new Date().toISOString()).run();
  }
  const row = await db.prepare("SELECT request_id, submitted_at, calculation_version FROM numerology_review_requests WHERE workspace_id = ? AND user_id = ? AND session_id = ? AND input_hash = ? LIMIT 1")
    .bind(identity.workspaceId, identity.userId, session.id, hash).first();
  return response({ status: "success", reviewRequest: row ? { requestId: row.request_id, submittedAt: row.submitted_at, calculationVersion: row.calculation_version, state: "pending" } : null,
    approval: null, sourceOfTruth: "numeria-d1-numerology-review-requests" });
}
