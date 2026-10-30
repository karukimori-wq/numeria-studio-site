import { VISUAL_STATE } from "./report-visual-registry.js";
import { validateConfirmedDivinationResult } from "./divination-result-contract.js";

const stateCopy = Object.freeze({
  [VISUAL_STATE.EMPTY]: ["表示できる結果がありません", "計算は完了しましたが、この図表に表示する対象は0件です。"],
  [VISUAL_STATE.NOT_CALCULATED]: ["計算結果が必要です", "鑑定結果を確定すると図表を表示できます。"],
  [VISUAL_STATE.INPUT_INCOMPLETE]: ["入力が不足しています", "必要な入力を完了してから再計算してください。"],
  [VISUAL_STATE.CONTRACT_UNCONNECTED]: ["図表を表示できません", "確定結果との接続を確認してください。"],
});

export function createReportVisualView(resolved) {
  const readyVisualValid = resolved?.state === VISUAL_STATE.READY
    && typeof resolved.visual?.visualId === "string"
    && typeof resolved.visual?.rendererType === "string"
    && typeof resolved.visual?.rendererLabel === "string"
    && validateConfirmedDivinationResult(resolved.data).ok;
  if (readyVisualValid) {
    return Object.freeze({
      state: resolved.state,
      mode: "renderer",
      renderable: true,
      visualId: resolved.visual.visualId,
      rendererType: resolved.visual.rendererType,
      rendererLabel: resolved.visual.rendererLabel,
      data: resolved.data,
    });
  }
  if (resolved?.state === VISUAL_STATE.TEXT_ONLY) {
    return Object.freeze({ state: resolved.state, mode: "omitted", renderable: false, title: "文章中心ページ", message: "このページに図表はありません。" });
  }
  const state = stateCopy[resolved?.state] && resolved?.state !== VISUAL_STATE.READY ? resolved.state : VISUAL_STATE.CONTRACT_UNCONNECTED;
  const [title, message] = stateCopy[state];
  return Object.freeze({ state, mode: "status", renderable: false, title, message, reason: resolved?.reason || "visual-state-invalid", missing: resolved?.missing || [] });
}
