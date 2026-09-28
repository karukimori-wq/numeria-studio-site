import { readFileSync, writeFileSync } from "node:fs";

const htmlPaths = ["dist/original.html", "dist/original"];
const quickbarStart = "function ensureMobileReportQuickbar(){";
const supportStart = "function ensureSupportPanel(){";
const legacyTick = "installRomanInputFix();enhanceSaveAndReportHints();ensureMobileReportQuickbar()";

const safetyStyle = `<style id="numeria-mobile-action-safety">
@media (width <= 760px){
  .editor-layout,.report-panel{padding-bottom:calc(168px + env(safe-area-inset-bottom))!important}
  .settings-page{padding-bottom:calc(176px + env(safe-area-inset-bottom))!important;overflow:visible!important}
  .save-draft-button,.report-panel .action-row button,.report-actions button,.settings-header>div:last-child button{position:relative;z-index:4;scroll-margin-top:126px;scroll-margin-bottom:176px}
  .settings-header,.settings-header>div:last-child{overflow:visible!important}
}
</style>`;

function patchHtml(html, htmlPath) {
  const startIndex = html.indexOf(quickbarStart);
  const supportIndex = html.indexOf(supportStart, startIndex);
  if (startIndex < 0 || supportIndex < 0 || supportIndex <= startIndex) {
    throw new Error(`Expected mobile PDF quickbar generator was not found in ${htmlPath}.`);
  }
  html = html.slice(0, startIndex) + html.slice(supportIndex);

  if (!html.includes(legacyTick)) {
    throw new Error(`Expected mobile PDF quickbar tick hook was not found in ${htmlPath}.`);
  }
  html = html.replace(legacyTick, "installRomanInputFix();enhanceSaveAndReportHints()");

  if (!html.includes("</head>")) {
    throw new Error(`Expected </head> in ${htmlPath}.`);
  }
  html = html.replace("</head>", `${safetyStyle}</head>`);

  if (html.includes("function ensureMobileReportQuickbar(){") || html.includes("ensureMobileReportQuickbar()")) {
    throw new Error(`Unused mobile PDF quickbar generator remains after patch in ${htmlPath}.`);
  }

  return html;
}

for (const htmlPath of htmlPaths) {
  writeFileSync(htmlPath, patchHtml(readFileSync(htmlPath, "utf8"), htmlPath));
}

console.log("Mobile UI contract patched: unused PDF quickbar removed and save/report actions protected from fixed navigation overlap.");
