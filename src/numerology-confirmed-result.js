import { confirmedResultRecord } from "./divination-result-contract.js";
import { NUMEROLOGY_CHECKPOINT_VERSION, withNumerologyCalculationCheckpoint } from "./numerology-result-checkpoint.js";

export const NUMEROLOGY_APPROVAL_VERSION = "numeria-numerology-result-approval.v1";

function equalNumerologyData(left, right) {
  const canonical = (value, ancestors = new Set()) => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (!value || typeof value !== "object" || ancestors.has(value)) throw Error("Non-JSON review data");
    ancestors.add(value);
    const result = Array.isArray(value) ? value.map(item => canonical(item, ancestors))
      : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key], ancestors)]));
    ancestors.delete(value); return result;
  };
  try { return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right)); } catch { return false; }
}

export function numerologyApprovalScope(snapshot) {
  if (snapshot?.divination !== "numerology") return null;
  const expected = withNumerologyCalculationCheckpoint(snapshot).numerologyCalculation;
  return { calculationVersion: expected.calculationVersion, checkpointVersion: NUMEROLOGY_CHECKPOINT_VERSION,
    source: expected.source,
    subjectIdentity: { name: snapshot.name ?? null, birthName: snapshot.birthName ?? null },
    partnerIdentity: snapshot.includeCompatibility === true ? { name: snapshot.partnerName ?? null, birthName: snapshot.partnerBirthName ?? null } : null };
}

// The caller must obtain approval from a trusted review issuer. This adapter
// checks binding and completeness; it neither creates nor authenticates approval.
export function adaptNumerologyConfirmedResult(snapshot, approval) {
  const stop = (code, reason) => ({ ok: false, code, reason, record: null });
  if (snapshot?.divination !== "numerology") return stop("NUMEROLOGY_READING_REQUIRED", "数秘術の鑑定を開いてください");
  if (typeof snapshot.id !== "string" || !snapshot.id.trim()) return stop("SESSION_ID_REQUIRED", "鑑定の下書きを保存してください");
  const checkpoint = snapshot.numerologyCalculation;
  if (!checkpoint) return stop("CALCULATION_CHECKPOINT_REQUIRED", "計算結果を含む下書きを保存してください");
  const expected = withNumerologyCalculationCheckpoint(snapshot).numerologyCalculation;
  if (checkpoint.schemaVersion !== NUMEROLOGY_CHECKPOINT_VERSION || checkpoint.calculationVersion !== expected.calculationVersion) return stop("CALCULATION_VERSION_MISMATCH", "保存された計算方式の版を確認してください");
  if (checkpoint.status !== "calculated" || expected.status !== "calculated") return stop("CALCULATION_INPUT_INCOMPLETE", "生年月日と鑑定の基準日を確認してください");
  if (!equalNumerologyData(checkpoint, expected)) return stop("CALCULATION_CHECKPOINT_MISMATCH", "現在の入力と保存された計算結果が一致しません");
  if (!approval || approval.schemaVersion !== NUMEROLOGY_APPROVAL_VERSION || approval.status !== "approved") return stop("NUMEROLOGY_APPROVAL_REQUIRED", "計算結果の独立検証・承認情報が不足しています");
  if (snapshot.exampleOnly === true || approval.exampleOnly === true) return stop("EXAMPLE_RESULT_FORBIDDEN", "サンプル結果は正式な結果に使用できません");
  const scope = numerologyApprovalScope(snapshot);
  if (!equalNumerologyData(approval.scope, scope)) return stop("NUMEROLOGY_APPROVAL_SCOPE_MISMATCH", "人物・使用氏名・基準日・計算版が承認対象と一致しません");
  if (!equalNumerologyData(approval.calculation, { results: expected.results, pageResults: expected.pageResults })) return stop("NUMEROLOGY_APPROVED_VALUES_MISMATCH", "承認された数値と現在の計算結果が一致しません");
  const nonempty = value => typeof value === "string" && Boolean(value.trim());
  if (!nonempty(approval.reviewId) || !nonempty(approval.reviewedBy) || !nonempty(approval.reviewedAt) || !Number.isFinite(Date.parse(approval.reviewedAt))) return stop("NUMEROLOGY_REVIEW_REFERENCE_REQUIRED", "承認記録の識別子・確認者・日時が不足しています");
  const validation = approval.independentValidation;
  if (validation?.exampleOnly === true || validation?.testOnly === true || validation?.coverage !== "complete" || !Array.isArray(validation.evidence) || !validation.evidence.length || !validation.evidence.every(nonempty)) return stop("NUMEROLOGY_INDEPENDENT_VALIDATION_REQUIRED", "この結果を対象とする独立検証の証拠が不足しています");
  const pageAvailability = expected.pageResults.map(page => {
    const unresolved = page.pageDefinitionId === "NUM-13" && page.data?.pinnacles?.some(item => item.dateBoundaryStatus !== "resolved");
    return { pageDefinitionId: page.pageDefinitionId, available: false,
      code: page.status !== "calculated" ? "PAGE_INPUT_INCOMPLETE" : unresolved ? "PINNACLE_DATE_BOUNDARY_UNRESOLVED" : "FORMAL_PAGE_CONNECTION_REQUIRED",
      unavailableReason: page.status !== "calculated" ? "このページに必要な入力・計算値が不足しています" : unresolved ? "ピークの切替日が未確定です" : "登録解説・正式図表の接続が未完了です" };
  });
  const record = confirmedResultRecord({ methodKey: "numerology", status: "confirmed", calculationVersion: expected.calculationVersion,
    resultRevision: approval.reviewId, subjectRefs: [`${snapshot.id}:subject`, ...(expected.source.includeCompatibility ? [`${snapshot.id}:partner`] : [])],
    inputScope: scope, review: { reviewId: approval.reviewId, reviewedBy: approval.reviewedBy, reviewedAt: approval.reviewedAt },
    validationEvidence: [...validation.evidence], results: expected.results, pageResults: expected.pageResults, pageAvailability });
  return { ok: true, code: "CALCULATION_CONFIRMED", reason: "計算結果の承認対象を確認しました。正式ページの接続は確認待ちです", record };
}

export function scopedNumerologyResultSource(snapshot, approval, legacySource) {
  const records = (Array.isArray(legacySource) ? legacySource : legacySource ? [legacySource] : [])
    .filter(record => record?.methodKey !== "numerology");
  const adapted = adaptNumerologyConfirmedResult(snapshot, approval);
  if (adapted.ok) records.push(adapted.record);
  return records;
}
