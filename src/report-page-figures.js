import { assessReportPageAvailability } from "./report-page-availability.js";
import { reportFigureTypesForPage } from "./report-figure-types.js";
import { figureEscape, renderReportFigure, validateReportFigure } from "./report-figure-renderer.js";

const figureMethodColors = Object.freeze({ numerology: "#57412a", tarot: "#51366b", "nine-star-ki": "#215b54", "four-pillars": "#733d35", "western-astrology": "#304b7a", "zi-wei-dou-shu": "#743b68" });

export function resolveReportPageFigures(definition, source) {
  if (!definition?.visualRequired) return { available: true, figures: [] };
  const availability = assessReportPageAvailability(definition, source);
  if (!availability.available) return { available: false, reason: availability.reason, figures: [] };
  const records = Array.isArray(source) ? source : [source];
  const record = records.find(item => item?.methodKey === definition.methodKey);
  const entries = (Array.isArray(record?.figures) ? record.figures : []).filter(entry => entry?.pageDefinitionId === definition.pageDefinitionId);
  const types = reportFigureTypesForPage(definition);
  if (!types.length || entries.length !== types.length || types.some(type => entries.filter(entry => entry.figure?.type === type).length !== 1)) return { available: false, reason: "このページの図表データが接続されていません", figures: [] };
  const figures = types.map(type => entries.find(entry => entry.figure.type === type).figure);
  if (figures.some(figure => !validateReportFigure(figure).ok || !["ready", "empty"].includes(figure.state) || figure.resultRevision !== record.resultRevision || figure.calculationVersion !== record.calculationVersion || !Array.isArray(record.subjectRefs) || figure.subjectRefs.length !== record.subjectRefs.length || figure.subjectRefs.some((ref, i) => ref !== record.subjectRefs[i]))) return { available: false, reason: "図表データの状態・対象者・計算版を確認してください", figures: [] };
  return { available: true, figures };
}

export function renderReportPageFigures(definition, source) {
  if (!definition?.visualRequired) return "";
  const resolved = resolveReportPageFigures(definition, source);
  if (!resolved.available) return `<p class="ns-figure-status" role="status">${figureEscape(resolved.reason)}</p>`;
  return `<div class="ns-page-figures" style="--figure-ink:${figureMethodColors[definition.methodKey] || "#44304f"}">${resolved.figures.map(figure => renderReportFigure(figure)).join("")}</div>`;
}

export function createReportFigurePrintFormat(format, definitions, source) {
  const byId = new Map(definitions.map(definition => [definition.pageDefinitionId, definition]));
  return { ...format, pages: format.pages.map(page => {
    const definition = byId.get(page.pageDefinitionId);
    if (!definition?.visualRequired) return page;
    const resolved = resolveReportPageFigures(definition, source);
    if (!resolved.available) return page;
    const figureRegion = { regionId: `__figures_${page.pageId}`, columns: 1, ratio: "100", columnBlocks: [resolved.figures.map((figure, index) => ({
      blockId: `__figure_${page.pageId}_${index}`, type: ["FIG-TABLE", "FIG-TIME", "FIG-CARDS", "FIG-RESULT"].includes(figure.type) ? "body" : "report-figure", content: "", reportFigure: figure,
    }))] };
    let inserted = false;
    const layoutRegions = page.layoutRegions.flatMap(region => {
      if (inserted) return [region];
      const columnIndex = region.columnBlocks.findIndex(column => column.some(block => block.type === "page-title"));
      if (columnIndex < 0) return [region];
      const index = region.columnBlocks[columnIndex].findIndex(block => block.type === "page-title");
      inserted = true;
      const before = region.columnBlocks.map((column, i) => i < columnIndex ? column : i === columnIndex ? column.slice(0, index + 1) : []);
      const after = region.columnBlocks.map((column, i) => i < columnIndex ? [] : i === columnIndex ? column.slice(index + 1) : column);
      return [{ ...region, columnBlocks: before }, figureRegion, { ...region, regionId: `${region.regionId}_after_figure`, columnBlocks: after }].filter(item => item.columnBlocks.some(column => column.length));
    });
    return { ...page, layoutRegions: inserted ? layoutRegions : [figureRegion, ...layoutRegions] };
  }) };
}
