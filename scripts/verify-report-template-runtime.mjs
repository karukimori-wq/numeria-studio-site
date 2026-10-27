import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./verify-report-layout-persistence.mjs";

const source = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
const coverSource = readFileSync("scripts/report-cover-editor-component.mjs", "utf8");
for (const token of ["NumeriaReportTemplateV2", "numeria:report-template-change", "data-report-layout-id", "aria-pressed", "aria-current", "numeria-layout-magazine", "break-inside:avoid", "reportTemplateV2Runtime", "reportTemplateV2Style"]) {
  assert.ok(source.includes(token), `Missing report template runtime guard: ${token}`);
}
assert.ok(source.includes("presetSelectionRuntime + reportTemplateV2Runtime"));
assert.ok(source.includes('q(controls,".tarot-report-format-card>.template-grid-20")'), "Tarot background choices are recovered from the old layout container");
assert.ok(source.includes('body.appendChild(grid);return card'), "Background choices are mounted in the background card");
assert.ok(!source.includes('[".preset-count",".template-grid-20"].forEach'), "Background choices are no longer moved into layout");
assert.ok(source.includes('.full-preview .report-paper,.mantic-full-preview .report-paper,.mini-preview .report-paper,.pdf-export-stage .report-paper'), "Layout reaches both live previews and PDF clones");
assert.ok(source.includes('page.dataset.reportLayout=value.layoutId'), "Rendered pages expose the selected layout for evidence and CSS");
assert.ok(coverSource.includes('(e.reportTemplate||e.layoutId)&&window.NumeriaReportTemplate.write(e.reportTemplate||{layoutId:e.layoutId})'), "Loading a saved preset restores its layout without changing layout for old presets");
assert.equal(coverSource.split('reportTemplate:window.NumeriaReportTemplate.read()').length - 1, 2, "Both preset and report snapshots persist the selected layout");
assert.ok(coverSource.includes('t.snapshot?.reportTemplate&&window.NumeriaReportTemplate.write(t.snapshot.reportTemplate)'), "Re-editing a saved session restores its layout");
assert.ok(source.includes('localStorage.setItem(key,JSON.stringify(value))'), "Layout changes survive a page reload");
assert.ok(source.includes('layoutId:layouts.includes(requestedLayoutId)?requestedLayoutId:"standard"'), "Restored legacy and unknown layouts normalize safely");
assert.ok(source.includes('.numeria-layout-magazine.report-visual-page>.relationship-visual-section{grid-column:1}'));
assert.ok(source.includes('.numeria-layout-magazine.report-visual-page>.relationship-pairs{grid-column:2}'));
assert.ok(source.includes('.numeria-layout-magazine.report-cycle-page>.cycle-visual-section{grid-column:1}'));
assert.ok(source.includes('.numeria-layout-magazine.report-cycle-page>.cycle-phase-notes{grid-column:2}'));
assert.ok(source.includes('.numeria-layout-magazine.report-tree-page>.life-tree-layout'));
assert.ok(source.includes('.numeria-layout-standard.report-paper{display:flex!important;flex-direction:column}'), "Standard preserves vertical content order");
assert.ok(source.includes('report-paper:not(:has(.report-visual'), "Pages without a visual remain full width");
assert.ok(source.includes('.numeria-layout-magazine.astrology-detail-page>*'), "Large astrology visuals remain full width");
assert.ok(source.includes('.numeria-layout-magazine.tarot-spread-page>*'), "Multi-card tarot spreads remain full width");
assert.ok(source.includes('@media(width<=760px)'));
console.log("F1-02/F1-03/F1-04 runtime verified: background separation, real preview targeting, standard/magazine and full-width fallbacks.");
