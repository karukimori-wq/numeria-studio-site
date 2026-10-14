export const A4_LAYOUT_CONTRACT_VERSION = "numeria-a4-physical-page-plan.v1";

// Browser preview supplies real rendered heights in CSS pixels. This module never
// estimates from character counts: an unknown height is explicitly reported.
export function createPhysicalPagePlan(format, measurements = {}, options = {}) {
  const contentHeight = Number(options.contentHeightPx || 920);
  const pages = [];
  const warnings = [];
  let physical = null;

  function start(logicalPageId, reason) {
    physical = { physicalPageId: `physical_${pages.length + 1}`, logicalPageId, reason, items: [], usedHeightPx: 0 };
    pages.push(physical);
  }

  function append(logicalPageId, item, nextHeight = 0) {
    const height = Number(measurements[item.blockId]);
    if (!Number.isFinite(height) || height <= 0) {
      warnings.push({ code: "MEASUREMENT_REQUIRED", blockId: item.blockId });
      return;
    }
    const mustKeepWithNext = (item.type === "heading" || item.type === "page-title") && nextHeight > 0 && nextHeight <= contentHeight;
    const needsNewPage = !physical || physical.logicalPageId !== logicalPageId || physical.usedHeightPx + height > contentHeight || (mustKeepWithNext && physical.usedHeightPx > 0 && physical.usedHeightPx + height + nextHeight > contentHeight);
    if (needsNewPage) start(logicalPageId, physical ? "overflow" : "logical-page");
    if (height > contentHeight) warnings.push({ code: "BLOCK_EXCEEDS_A4_CONTENT", blockId: item.blockId, heightPx: height });
    physical.items.push({
      ...item,
      // The first physical page preserves a two-column region. Only a page
      // created by overflow becomes a single-column continuation.
      continuationColumns: item.sourceColumns === 2 && physical.reason === "overflow" ? 1 : item.sourceColumns,
      heightPx: height,
    });
    physical.usedHeightPx += height;
  }

  for (const logicalPage of format?.pages || []) {
    if (!physical || logicalPage.manualBreakBefore) start(logicalPage.pageId, logicalPage.manualBreakBefore ? "manual-break" : "logical-page");
    for (const region of logicalPage.layoutRegions || []) {
      // Two-column regions retain their reading order (left then right) when they
      // continue onto a new physical page as a one-column continuation.
      const columns = region.columnBlocks || [];
      columns.forEach((blocks, columnIndex) => blocks.forEach((block, blockIndex) => {
        const nextBlock = blocks[blockIndex + 1];
        append(logicalPage.pageId, {
          blockId: block.blockId,
          type: block.type,
          regionId: region.regionId,
          sourceColumns: region.columns,
          ratio: region.ratio,
          columnIndex,
          blockIndex,
        }, Number(measurements[nextBlock?.blockId] || 0));
      }));
    }
  }
  return { contractVersion: A4_LAYOUT_CONTRACT_VERSION, contentHeightPx: contentHeight, physicalPages: pages, warnings };
}
