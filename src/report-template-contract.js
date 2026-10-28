import { REPORT_PAGE_DEFINITION_IDS } from "./report-page-definitions.js";

export const REPORT_TEMPLATE_CONTRACT_VERSION = "numeria-report-template.v2";
export const REPORT_LAYOUT_IDS = Object.freeze(["standard", "magazine"]);
export const DEFAULT_DESIGN_SET_ID = "numeria-neutral.v1";

const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;

export function normalizeLayoutId(value) {
  return REPORT_LAYOUT_IDS.includes(value) ? value : "standard";
}

export function normalizeReportTemplate(candidate = {}) {
  const source = record(candidate);
  const requestedLayoutId = text(source.layoutId || source.layout, "standard");
  const pageSelection = Array.isArray(source.pageSelection) ? source.pageSelection : Array.isArray(source.pages) ? source.pages : [];
  const fixedPages = pageSelection.map((item, index) => {
    const page = typeof item === "string" ? { pageDefinitionId: item } : record(item);
    const pageDefinitionId = text(page.pageDefinitionId || page.definitionId || page.id);
    return {
      ...page,
      pageDefinitionId,
      pageInstanceId: text(page.pageInstanceId, `page_${pageDefinitionId || "unknown"}_${index + 1}`),
      visible: page.visible !== false,
      order: Number.isFinite(Number(page.order)) ? Number(page.order) : index,
      knownDefinition: REPORT_PAGE_DEFINITION_IDS.has(pageDefinitionId),
    };
  });
  const known = fixedPages.filter((page) => page.knownDefinition);
  const unknown = fixedPages.filter((page) => !page.knownDefinition);
  return {
    ...source,
    id: text(source.id, "preset-legacy"),
    name: text(source.name, "名称未設定のプリセット"),
    version: Number.isFinite(Number(source.version)) ? Number(source.version) : 1,
    contractVersion: REPORT_TEMPLATE_CONTRACT_VERSION,
    layoutId: normalizeLayoutId(requestedLayoutId),
    requestedLayoutId,
    layoutFallbackApplied: !REPORT_LAYOUT_IDS.includes(requestedLayoutId),
    designSetId: text(source.designSetId, DEFAULT_DESIGN_SET_ID),
    displayOptions: { logo: true, client: true, practitioner: true, ...record(source.displayOptions) },
    appearance: { backgroundId: "plain", colorSetId: "neutral", ...record(source.appearance) },
    pageSelection: known,
    migrationAudit: {
      ...record(source.migrationAudit),
      unknownPages: unknown,
      legacyFields: Object.fromEntries(Object.entries(source).filter(([key]) => !["id", "name", "version", "layoutId", "layout", "designSetId", "displayOptions", "appearance", "pageSelection", "pages", "migrationAudit"].includes(key))),
    },
  };
}

export function switchReportLayout(template, layoutId) {
  return normalizeReportTemplate({ ...record(template), layoutId });
}

export function setReportPageVisibility(template, pageDefinitionId, visible) {
  const normalized = normalizeReportTemplate(template);
  return normalizeReportTemplate({
    ...normalized,
    pageSelection: normalized.pageSelection.map((page) =>
      page.pageDefinitionId === pageDefinitionId ? { ...page, visible: visible !== false } : page
    ),
  });
}

export function createReportTemplate(input = {}) {
  return normalizeReportTemplate({
    id: `preset-${Date.now()}`,
    name: "新しいプリセット",
    version: 2,
    layoutId: "standard",
    designSetId: DEFAULT_DESIGN_SET_ID,
    pageSelection: [],
    ...input,
  });
}
