import { normalizeLayoutId } from "./report-template-contract.js";

const fullWidthRenderers = new Set(["natal-wheel", "destiny-chart", "card-spread"]);

export function createLogicalPageLayout({ layoutId, pageDefinition, title, visual, registeredExplanation, customComment }) {
  const requestedLayoutId = normalizeLayoutId(layoutId);
  const visualRequired = Boolean(pageDefinition?.visualRequired);
  const useFullWidth = requestedLayoutId === "standard" || fullWidthRenderers.has(pageDefinition?.rendererType);
  const blocks = {
    title: { type: "title", value: title || pageDefinition?.title || "" },
    visual: visualRequired ? { type: "visual", value: visual, nonSplittable: true } : null,
    registeredExplanation: { type: "registered-explanation", value: registeredExplanation || "" },
    customComment: { type: "custom-comment", value: customComment || "" },
  };
  if (requestedLayoutId === "magazine" && !useFullWidth) {
    return { layoutId: requestedLayoutId, adaptedToFullWidth: false, title: blocks.title, columns: [[blocks.visual], [blocks.registeredExplanation]], continuation: [blocks.customComment] };
  }
  return { layoutId: requestedLayoutId, adaptedToFullWidth: requestedLayoutId === "magazine" && useFullWidth, blocks: [blocks.title, blocks.visual, blocks.registeredExplanation, blocks.customComment].filter(Boolean) };
}
