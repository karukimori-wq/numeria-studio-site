import { calculateTarot, TAROT_CARD_IDS, TAROT_SPREAD_POSITIONS } from "./tarot-calculator.js";

export const TAROT_DRAFT_VERSION = "numeria.tarot-reading-draft.v1";
const text = value => typeof value === "string" ? value : "";
export function tarotDraftCalculationMessage(calculation) {
  if (calculation?.status === "calculated") return "計算済みの下書きです。正式結果の確認はまだ完了していません。";
  return ({ CARD_SELECTION_CONFIRMATION_REQUIRED: "配置・カード・向きを確認してください。", DUPLICATE_CARD: "同じカードが複数の位置にあります。", CARD_INPUT_INVALID: "使用枚数・逆位置の設定とカード選択を確認してください。", CARD_POSITION_MISSING: "すべての位置のカードを選択してください。" })[calculation?.code] || "カードの入力を確認してください。";
}
export function restoreTarotEditor(snapshot) {
  const saved = snapshot?.divination === "tarot" && snapshot.tarotDraftVersion === TAROT_DRAFT_VERSION ? snapshot.tarotEditor : null;
  if (!saved || typeof saved !== "object") return null;
  const fields = ["spreadId", "referenceDate", "question", "situation", "advice", "action", "overall", "artDeck", "theme", "optionA", "optionB", "partnerRef", "confirmationKey"];
  const editor = Object.fromEntries(fields.map(key => [key, text(saved[key])]));
  editor.deckSize = saved.deckSize === 78 ? 78 : 22;
  editor.reversalsEnabled = saved.reversalsEnabled !== false;
  editor.price = Number.isFinite(saved.price) && saved.price >= 0 ? saved.price : 0;
  if (!Object.hasOwn(TAROT_SPREAD_POSITIONS, editor.spreadId) || !Array.isArray(saved.selections)) return null;
  editor.selections = saved.selections.map(card => ({ cardIndex: Number.isInteger(card?.cardIndex) ? card.cardIndex : -1, reversed: card?.reversed === true, text: text(card?.text) }));
  return editor;
}
function tarotCalculationInput(editor) {
  const positions = Object.hasOwn(TAROT_SPREAD_POSITIONS, editor?.spreadId) ? TAROT_SPREAD_POSITIONS[editor.spreadId] : [];
  return { spreadId: editor?.spreadId, deckSize: editor?.deckSize, reversalsEnabled: editor?.reversalsEnabled, referenceDate: editor?.referenceDate,
    theme: editor?.theme, optionA: editor?.optionA, optionB: editor?.optionB, partnerRef: editor?.partnerRef,
    cards: (Array.isArray(editor?.selections) ? editor.selections : []).map((card, index) => ({ positionId: positions[index], cardId: Number.isInteger(card?.cardIndex) ? TAROT_CARD_IDS[card.cardIndex] : undefined, orientation: typeof card?.reversed === "boolean" ? card.reversed ? "reversed" : "upright" : undefined })) };
}
export function tarotSelectionKey(customer, editor) {
  return JSON.stringify({ customerId: customer?.id ?? null, name: customer?.name ?? null, birthday: customer?.birthday ?? null, question: editor?.question ?? null, input: tarotCalculationInput(editor) });
}
export function createTarotReadingSnapshot({ id, customer, editor } = {}) {
  const input = tarotCalculationInput(editor), confirmed = editor?.confirmationKey === tarotSelectionKey(customer, editor);
  const calculation = calculateTarot(confirmed ? input : { ...input, cards: [] });
  if (!confirmed) { calculation.status = "input-incomplete"; calculation.code = "CARD_SELECTION_CONFIRMATION_REQUIRED"; }
  return { id, divination: "tarot", name: customer?.name || "", birthday: customer?.birthday || "", selectedCustomerId: customer?.id || null,
    theme: text(editor?.question), visitDate: text(editor?.referenceDate), tarotDraftVersion: TAROT_DRAFT_VERSION,
    tarotEditor: structuredClone(editor), tarotCalculation: { ...calculation, verificationState: "review-required", source: { customerId: customer?.id || null, selectionConfirmed: confirmed } } };
}
export async function saveTarotReadingDraft({ snapshot, fetcher, expectedDraftVersion = null } = {}) {
  if (snapshot?.divination !== "tarot" || !snapshot.id || !snapshot.selectedCustomerId || !snapshot.name.trim() || !snapshot.birthday || !snapshot.theme.trim()) return { ok: false, message: "鑑定カルテと相談テーマを確認してください" };
  // Recompute from captured inputs; never send an imported/stale calculation as authority.
  const editor = restoreTarotEditor(snapshot);
  if (!editor) return { ok: false, message: "タロットの入力を確認してください" };
  const captured = createTarotReadingSnapshot({ id: snapshot.id, customer: { id: snapshot.selectedCustomerId, name: snapshot.name, birthday: snapshot.birthday }, editor });
  try {
    const response = await fetcher("/api/appraisals/save-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appraisalId: captured.id, expectedDraftVersion, clientName: captured.name, birthDate: captured.birthday, divination: "tarot", question: captured.theme, notes: editor.overall, resultSummary: "", snapshot: captured }) });
    const data = await response.json();
    if (!response.ok || data.status !== "success" || data.draftId !== captured.id) return { ok: false, message: response.status === 409 ? "保存内容が更新されています。鑑定を開き直してください" : "下書きを保存できませんでした。もう一度お試しください" };
    return { ok: true, snapshot: captured, draftVersion: data.activeDraft?.draftVersion ?? null };
  } catch { return { ok: false, message: "下書きを保存できませんでした。通信を確認してください" }; }
}
