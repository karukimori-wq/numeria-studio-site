import { numerologyApprovalScope, adaptNumerologyConfirmedResult } from "./numerology-confirmed-result.js";

function numerologyReviewInputKey(snapshot) {
  return JSON.stringify({ id: snapshot?.id, scope: numerologyApprovalScope(snapshot), checkpoint: snapshot?.numerologyCalculation });
}

export async function runNumerologyReviewAction({ method, snapshot, getCurrentSnapshot, fetcher, getHeaders }) {
  const changed = "計算に使う入力が変わりました。下書きを保存してから、もう一度操作してください";
  if (!["GET", "POST"].includes(method)) return { ok: false, message: "依頼の操作を確認してください" };
  if (snapshot?.divination !== "numerology" || typeof snapshot.id !== "string" || !snapshot.id.trim()) return { ok: false, message: "数秘術の鑑定を下書き保存してから操作してください" };
  const key = numerologyReviewInputKey(snapshot), current = () => numerologyReviewInputKey(getCurrentSnapshot()) === key;
  const path = `/api/appraisals/${encodeURIComponent(snapshot.id)}`;
  let failureMessage = "依頼先に接続できませんでした。もう一度お試しください";
  const request = async (url, verb, body) => {
    const headers = await getHeaders();
    if (!current()) { failureMessage = changed; throw Error("Reading changed"); }
    const response = await fetcher(url, { method: verb, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok || data.status !== "success") {
      const messages = { 401: "ログインし直してから操作してください", 403: "この鑑定の依頼を確認する権限がありません", 404: "保存済みの鑑定が見つかりません", 409: "保存内容が更新されています。鑑定を確認して再保存してください", 422: "保存済みの計算結果を確認し、下書きを保存し直してください" };
      failureMessage = messages[response.status] || failureMessage;
      throw Error("Review request failed");
    }
    return data;
  };
  try {
    const stored = await request(path, "GET");
    if (!current()) return { ok: false, message: changed };
    if (stored.session?.id !== snapshot.id || stored.session?.snapshot?.id !== snapshot.id || numerologyReviewInputKey(stored.session.snapshot) !== key) return { ok: false, message: "計算に使う入力に未保存の変更があります。鑑定の下書きを保存してください" };
    if (method === "POST" && (typeof stored.session.draftVersion !== "string" || !stored.session.draftVersion)) return { ok: false, message: "下書きの保存状態を確認してから、もう一度操作してください" };
    const result = await request(`${path}/numerology-review`, method, method === "POST" ? { expectedDraftVersion: stored.session.draftVersion } : undefined);
    if (!current()) return { ok: false, message: changed };
    const review = result.reviewRequest;
    if (method === "GET" && review === null && result.approval === null) return { ok: true, approval: null, message: "現在の保存内容に対する検証依頼はありません" };
    if (typeof review?.requestId !== "string" || !review.requestId.trim() || typeof review.submittedAt !== "string" || !Number.isFinite(Date.parse(review.submittedAt)) || review.calculationVersion !== snapshot.numerologyCalculation?.calculationVersion) return { ok: false, message: "依頼の対象を確認できませんでした。保存内容を確認してください" };
    if (review?.state === "approved" && adaptNumerologyConfirmedResult(snapshot, result.approval).ok) return { ok: true, approval: result.approval, message: "計算結果は承認済みです。正式ページの接続は確認待ちです" };
    if (review?.state === "returned" && result.approval === null && typeof review.note === "string" && review.note.trim() && typeof review.reviewedAt === "string" && Number.isFinite(Date.parse(review.reviewedAt))) return { ok: true, approval: null, message: `差戻し：${review.note}` };
    if (result.approval !== null) return { ok: false, message: "承認対象が現在の鑑定と一致しません。保存内容を確認してください" };
    if (review?.state !== "pending" || typeof review.requestId !== "string" || !review.requestId.trim() || typeof review.submittedAt !== "string" || !Number.isFinite(Date.parse(review.submittedAt)) || review.calculationVersion !== snapshot.numerologyCalculation?.calculationVersion) return { ok: false, message: "依頼の保存完了を確認できませんでした。状況を確認してから再試行してください" };
    return { ok: true, approval: null, message: `検証依頼は確認待ちです（依頼番号：${review.requestId}）` };
  } catch {
    return { ok: false, message: !current() ? changed : failureMessage };
  }
}

export function mountNumerologyReviewForm(container, { getSnapshot, getHeaders, fetcher, onApproval = () => {} }) {
  container.innerHTML = '<h4>計算結果の検証依頼</h4><p>鑑定の下書きを保存してから依頼してください。依頼は確認待ちとして保存されます。</p><button type="button" data-numerology-review-submit>検証を依頼</button><button type="button" data-numerology-review-check>依頼状況を確認</button><p data-numerology-review-status role="status" aria-live="polite"></p>';
  const submit = container.querySelector("[data-numerology-review-submit]"), check = container.querySelector("[data-numerology-review-check]"), status = container.querySelector("[data-numerology-review-status]");
  let busy = false, shownKey = numerologyReviewInputKey(getSnapshot());
  const perform = async method => {
    if (busy) return;
    busy = true; submit.disabled = true; check.disabled = true;
    status.textContent = method === "POST" ? "検証依頼を送信中…" : "依頼状況を確認中…";
    try {
      const snapshot = getSnapshot(), key = numerologyReviewInputKey(snapshot);
      const result = await runNumerologyReviewAction({ method, snapshot, getCurrentSnapshot: getSnapshot, fetcher, getHeaders });
      if (container.isConnected !== false) {
        if (numerologyReviewInputKey(getSnapshot()) !== key) status.textContent = "入力が変わりました。鑑定の下書きを保存してから依頼してください";
        else { status.textContent = result.message; shownKey = key; if (result.ok) onApproval(result.approval); }
      }
    } catch { if (container.isConnected !== false) status.textContent = "依頼状況を確認できませんでした。もう一度お試しください"; }
    finally { busy = false; submit.disabled = false; check.disabled = false; }
  };
  submit.onclick = () => perform("POST"); check.onclick = () => perform("GET");
  return () => { if (shownKey !== numerologyReviewInputKey(getSnapshot())) status.textContent = "入力が変わりました。鑑定の下書きを保存してから依頼してください"; };
}
