import { REPORT_PAGE_DEFINITIONS } from "./report-page-definitions.js";
import { validateConfirmedDivinationResult } from "./divination-result-contract.js";

export const VISUAL_STATE = Object.freeze({
  READY: "ready",
  EMPTY: "empty",
  NOT_CALCULATED: "not-calculated",
  INPUT_INCOMPLETE: "input-incomplete",
  CONTRACT_UNCONNECTED: "contract-unconnected",
  TEXT_ONLY: "text-only",
});

export const REPORT_VISUAL_REGISTRY = Object.freeze(Object.fromEntries(REPORT_PAGE_DEFINITIONS.map((definition) => [definition.pageDefinitionId, Object.freeze({
  pageDefinitionId: definition.pageDefinitionId,
  visualId: definition.visualId,
  rendererType: definition.rendererType,
  required: definition.visualRequired,
  requiredResultKeys: definition.requiredResultKeys,
  optionalResultKeys: definition.optionalResultKeys,
  unavailableReason: definition.unavailableReason,
})])));

export function resolveReportVisual(pageDefinitionId, result, context = {}) {
  const visual = REPORT_VISUAL_REGISTRY[pageDefinitionId];
  if (!visual) return { state: VISUAL_STATE.CONTRACT_UNCONNECTED, reason: "page-definition-unknown", visual: null };
  if (!visual.required) return { state: VISUAL_STATE.TEXT_ONLY, visual };
  if (context.inputComplete === false) return { state: VISUAL_STATE.INPUT_INCOMPLETE, reason: "required-input-missing", visual };
  if (!result) return { state: VISUAL_STATE.NOT_CALCULATED, reason: "result-not-calculated", visual };
  const validation = validateConfirmedDivinationResult(result);
  if (!validation.ok) return { state: VISUAL_STATE.CONTRACT_UNCONNECTED, reason: validation.code, missing: validation.missing || [], visual };
  const items = Array.isArray(context.items) ? context.items : null;
  if (items && items.length === 0) return { state: VISUAL_STATE.EMPTY, reason: "confirmed-zero-items", visual, data: [] };
  return { state: VISUAL_STATE.READY, visual, data: result };
}

export function reportVisualSnapshotValue(resolved) {
  return resolved?.state === VISUAL_STATE.READY ? { visualId: resolved.visual.visualId, rendererType: resolved.visual.rendererType, result: resolved.data } : null;
}
