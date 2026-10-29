export const REPORT_PAGE_COMMENT_ROLES = new Set(["custom-comment-heading", "custom-comment"]);

export function syncReportPageCommentBlocks(page, selection, createBlock) {
  const regions = Array.isArray(page?.layoutRegions) ? page.layoutRegions : [];
  const content = String(selection?.customComment?.content || "").trim();
  const active = selection?.customComment?.visible !== false && Boolean(content);

  if (!active) {
    for (const region of regions) {
      if (!Array.isArray(region?.columnBlocks)) continue;
      region.columnBlocks = region.columnBlocks.map((column) =>
        Array.isArray(column) ? column.filter((block) => !REPORT_PAGE_COMMENT_ROLES.has(block?.role)) : [],
      );
    }
    return page;
  }

  const seenRoles = new Set();
  for (const region of regions) {
    if (!Array.isArray(region?.columnBlocks)) continue;
    region.columnBlocks = region.columnBlocks.map((column) => Array.isArray(column) ? column.filter((block) => {
      if (!REPORT_PAGE_COMMENT_ROLES.has(block?.role)) return true;
      if (seenRoles.has(block.role)) return false;
      seenRoles.add(block.role);
      return true;
    }) : []);
  }
  const columns = regions.flatMap((region) => Array.isArray(region?.columnBlocks) ? region.columnBlocks : []);
  const blocks = columns.flat();
  const heading = blocks.find((block) => block?.role === "custom-comment-heading");
  const body = blocks.find((block) => block?.role === "custom-comment");
  const destination = columns.at(-1);
  if (!destination || typeof createBlock !== "function") return page;
  if (heading) heading.content = "独自コメント";
  else destination.push({ ...createBlock("heading", "独自コメント"), role: "custom-comment-heading" });
  if (body) body.content = content;
  else destination.push({ ...createBlock("body", content), role: "custom-comment" });
  return page;
}
