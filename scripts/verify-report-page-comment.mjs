import assert from "node:assert/strict";
import { REPORT_PAGE_COMMENT_ROLES, syncReportPageCommentBlocks } from "../src/report-page-comment.js";

let sequence = 0;
const createBlock = (type, content) => ({ blockId: `block_${++sequence}`, type, content });
const page = {
  pageId: "fixed_page",
  layoutRegions: [{ regionId: "region_1", columnBlocks: [[createBlock("page-title", "基本性格")]] }],
};
const selection = { customComment: { visible: true, content: "この方の強みを補足します。" } };
const generated = () => page.layoutRegions.flatMap((region) => region.columnBlocks.flat()).filter((block) => REPORT_PAGE_COMMENT_ROLES.has(block.role));

syncReportPageCommentBlocks(page, selection, createBlock);
assert.deepEqual(generated().map((block) => block.role), ["custom-comment-heading", "custom-comment"]);

const restored = JSON.parse(JSON.stringify(page));
page.layoutRegions = restored.layoutRegions;
syncReportPageCommentBlocks(page, selection, createBlock);
syncReportPageCommentBlocks(page, selection, createBlock);
assert.equal(generated().length, 2, "save/reload and repeated sync must not duplicate generated blocks");

page.layoutRegions[0].columnBlocks[0].push(...structuredClone(generated()));
assert.equal(generated().length, 4);
syncReportPageCommentBlocks(page, selection, createBlock);
assert.equal(generated().length, 2, "legacy or manually duplicated generated blocks must normalize to one slot");

selection.customComment.visible = false;
syncReportPageCommentBlocks(page, selection, createBlock);
assert.equal(generated().length, 0);
assert.equal(selection.customComment.content, "この方の強みを補足します。", "OFF must preserve entered content");

selection.customComment.visible = true;
syncReportPageCommentBlocks(page, selection, createBlock);
assert.equal(generated().length, 2, "turning ON restores the preserved comment");

selection.customComment.content = "   ";
syncReportPageCommentBlocks(page, selection, createBlock);
assert.equal(generated().length, 0, "blank comments must not leave a heading or spacing block");
assert.equal(page.layoutRegions[0].columnBlocks[0][0].content, "基本性格", "unrelated page content must remain intact");

console.log("Fixed-page custom comment lifecycle verified.");
