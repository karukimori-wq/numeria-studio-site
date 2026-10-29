export function buildReportPageCatalogView(definitions) {
  const source = Array.isArray(definitions) ? definitions : [];
  const ids = source.map((definition) => definition?.pageDefinitionId).filter((id) => typeof id === "string" && id);
  if (ids.length !== source.length) throw new Error("REPORT_PAGE_CATALOG_INVALID_ID");
  if (new Set(ids).size !== ids.length) throw new Error("REPORT_PAGE_CATALOG_DUPLICATE_ID");
  const basic = source.filter((definition) => definition?.tier === "basic");
  const additional = source.filter((definition) => definition?.tier === "additional");
  if (basic.length + additional.length !== source.length) throw new Error("REPORT_PAGE_CATALOG_UNKNOWN_TIER");
  return {
    basic,
    additional,
    total: source.length,
    pageDefinitionIds: ids,
  };
}
