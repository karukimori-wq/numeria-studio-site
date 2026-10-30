export function createReportVisualSlot(definition, availability) {
  if (!definition?.visualRequired) return Object.freeze({ kind: "text-only" });
  const ready = availability?.available === true;
  return Object.freeze({
    kind: ready ? "ready" : "unavailable",
    visualId: definition.visualId,
    rendererType: definition.rendererType,
    rendererLabel: definition.rendererLabel,
    diagramSpecification: definition.diagramSpecification,
    availabilityCode: String(availability?.code || "CONFIRMED_RESULT_REQUIRED"),
    reason: ready ? "" : String(availability?.reason || "確定済みの鑑定結果がありません"),
  });
}
