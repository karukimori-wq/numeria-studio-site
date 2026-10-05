import { readFileSync, writeFileSync } from "node:fs";

const cssPath = "dist/assets/index-CEGe-9Xe.css";
let css = readFileSync(cssPath, "utf8");

const addition = `
.inline-report-editable[contenteditable=true]{cursor:text;border-radius:6px;outline:0;transition:background .16s ease,outline-color .16s ease}.inline-report-editable[contenteditable=true]:focus{background:color-mix(in srgb,var(--report-accent,#b89a5a) 10%,transparent);outline:2px solid var(--report-accent,#b89a5a);outline-offset:4px}.pdf-capture .inline-report-editable{background:transparent!important;outline:0!important}.report-inline-editor-toolbar{position:fixed;left:50%;bottom:calc(var(--mobile-nav-height,92px) + 14px);z-index:90;display:none;grid-template-columns:auto auto auto;gap:6px;align-items:center;max-width:calc(100vw - 26px);padding:8px;background:#fffdf9;border:1px solid #d8c48a;border-radius:14px;box-shadow:0 14px 38px #211c3830}.report-inline-editor-toolbar.is-visible{display:grid}.report-inline-editor-toolbar strong{grid-column:1/-1;color:#51465d;font-size:10px}.report-inline-editor-toolbar button{border:0;border-radius:9px;background:#eee9f4;color:#594f66;padding:8px 10px;font-size:10px;font-weight:700}.report-inline-editor-toolbar button:last-child{background:#d6b25f;color:#211c38}@media (width<=760px){.report-composer-materials{padding:14px;overflow:hidden}.composer-number-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.composer-number-grid article{padding:10px 6px}.composer-number-grid small{letter-spacing:.08em;font-size:8px}.composer-number-grid strong{font-size:30px}.composer-diagram{grid-template-columns:1fr;gap:7px;padding:10px}.composer-diagram article{min-height:auto;padding:10px}.composer-diagram i{display:none}.composer-insert-actions{display:grid;grid-template-columns:1fr 1fr}.composer-insert-actions button{white-space:normal;line-height:1.35}.composer-safety-note{font-size:10px}.mini-preview{padding-inline:12px}.report-inline-editor-toolbar{transform:translateX(-50%) scale(.96);transform-origin:bottom center}}`;

if (!css.includes(".report-inline-editor-toolbar")) {
  css += addition;
}

writeFileSync(cssPath, css);
console.log("Numeria inline report editing CSS patched.");
