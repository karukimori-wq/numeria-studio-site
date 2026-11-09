import { NUMEROLOGY_APPROVAL_VERSION } from "./numerology-confirmed-result.js";
import { buildNumerologyPageData } from "./numerology-page-data.js";
import { NUMEROLOGY_CHECKPOINT_VERSION } from "./numerology-result-checkpoint.js";

export async function numerologyReviewInputHash(scope, calculation) {
  const bytes = new TextEncoder().encode(JSON.stringify({ scope, calculation }));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
}

export async function readNumerologyReviewDecision(db, row) {
  return db.prepare("SELECT decision_id, decision, note, approval_json, decided_at, reviewer_user_id FROM numerology_review_decisions WHERE request_id = ? AND workspace_id = ? LIMIT 1").bind(row.request_id, row.workspace_id).first();
}

const reviewResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function handleNumerologyReviewerRequest(request, db, reviewer, requestId) {
  const fail = (code, status) => reviewResponse({ status: "error", errorCode: code }, status);
  if (!reviewer?.verified || !reviewer.userId) return fail("AUTH_SESSION_REQUIRED", 401);
  if (reviewer.canReview !== true) return fail("REVIEWER_ACCESS_REQUIRED", 403);
  if (!db) return fail("D1_REQUIRED", 503);
  if (!["GET", "POST"].includes(request.method)) return fail("METHOD_NOT_ALLOWED", 405);
  const row = await db.prepare("SELECT * FROM numerology_review_requests WHERE request_id = ? AND workspace_id = ? LIMIT 1").bind(requestId, reviewer.workspaceId).first();
  if (!row) return fail("REVIEW_REQUEST_NOT_FOUND", 404);
  const scope = JSON.parse(row.scope_json), calculation = JSON.parse(row.calculation_json);
  if (await numerologyReviewInputHash(scope, calculation) !== row.input_hash) return fail("REVIEW_REQUEST_INTEGRITY_FAILED", 409);
  if (request.method === "GET") return reviewResponse({ status: "success", reviewRequest: { requestId: row.request_id, sessionId: row.session_id, inputHash: row.input_hash, calculationVersion: row.calculation_version, submittedAt: row.submitted_at, scope, calculation }, decision: await readNumerologyReviewDecision(db, row) });
  let body;
  try { body = await request.json(); } catch { return fail("INVALID_JSON", 400); }
  if (!body || Object.keys(body).some(key => !["decision", "expectedInputHash", "note", "evidence", "checks"].includes(key)) || !["approve", "return"].includes(body.decision)) return fail("INVALID_REVIEW_DECISION", 400);
  if (body.expectedInputHash !== row.input_hash) return fail("REVIEW_INPUT_MISMATCH", 409);
  if (typeof body.note !== "string" || !body.note.trim() || body.note.length > 4000) return fail("REVIEW_NOTE_REQUIRED", 422);
  const decisionId = crypto.randomUUID(), decidedAt = new Date().toISOString();
  let approval = null;
  if (body.decision === "approve") {
    if (scope.checkpointVersion !== NUMEROLOGY_CHECKPOINT_VERSION) return fail("REVIEW_CALCULATION_CHANGED", 409);
    const checks = ["coreNumbers", "nameRules", "periods", "comparison"];
    if (!body.checks || Object.keys(body.checks).length !== checks.length || !checks.every(key => body.checks[key] === true)) return fail("INDEPENDENT_REVIEW_CHECKS_REQUIRED", 422);
    if (!Array.isArray(body.evidence) || !body.evidence.length || body.evidence.length > 20 || !body.evidence.every(value => {
      if (typeof value !== "string" || value.length > 2048) return false;
      try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
    })) return fail("INDEPENDENT_REVIEW_EVIDENCE_REQUIRED", 422);
    const source = scope.source;
    const connection = buildNumerologyPageData({ subject: { birthday: source.birthday, ...source.nameSources.subject }, partner: source.includeCompatibility ? { birthday: source.partnerBirthday, ...source.nameSources.partner } : undefined, referenceDate: source.referenceDate, familyRelation: source.includeCompatibility && source.partnerRelation === "家族" ? "家族" : "" });
    const expected = { results: [{ resultKey: "core_numbers", data: connection.coreNumbers }], pageResults: connection.pages };
    if (connection.status !== "calculated" || connection.calculationVersion !== row.calculation_version || scope.calculationVersion !== connection.calculationVersion || source.sessionId !== row.session_id || JSON.stringify(expected) !== JSON.stringify(calculation)) return fail("REVIEW_CALCULATION_CHANGED", 409);
    approval = { schemaVersion: NUMEROLOGY_APPROVAL_VERSION, status: "approved", scope, calculation, reviewId: decisionId, reviewedBy: reviewer.userId, reviewedAt: decidedAt, independentValidation: { coverage: "complete", evidence: [...new Set(body.evidence)], checks: body.checks, note: body.note.trim() } };
  }
  await db.prepare("INSERT OR IGNORE INTO numerology_review_decisions (decision_id, request_id, workspace_id, reviewer_user_id, decision, note, approval_json, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(decisionId, row.request_id, row.workspace_id, reviewer.userId, body.decision === "approve" ? "approved" : "returned", body.note.trim(), approval ? JSON.stringify(approval) : null, decidedAt).run();
  const stored = await readNumerologyReviewDecision(db, row);
  if (stored?.decision_id !== decisionId) return fail("REVIEW_ALREADY_DECIDED", 409);
  return reviewResponse({ status: "success", decision: { decisionId, state: stored.decision, reviewedBy: reviewer.userId, reviewedAt: decidedAt } });
}
