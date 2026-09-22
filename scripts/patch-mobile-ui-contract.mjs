import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");

const quickbarStart = "function ensureMobileReportQuickbar(){";
const supportStart = "function ensureSupportPanel(){";
const startIndex = html.indexOf(quickbarStart);
const supportIndex = html.indexOf(supportStart, startIndex);
if (startIndex < 0 || supportIndex < 0 || supportIndex <= startIndex) {
  throw new Error("Expected mobile PDF quickbar generator was not found in restored Production HTML.");
}
html = html.slice(0, startIndex) + html.slice(supportIndex);

const legacyTick = "installRomanInputFix();enhanceSaveAndReportHints();ensureMobileReportQuickbar()";
if (!html.includes(legacyTick)) {
  throw new Error("Expected mobile PDF quickbar tick hook was not found.");
}
html = html.replace(legacyTick, "installRomanInputFix();enhanceSaveAndReportHints()");

const safetyStyle = `<style id="numeria-mobile-action-safety">
@media (width <= 760px){
  .editor-layout,.report-panel{padding-bottom:calc(168px + env(safe-area-inset-bottom))!important}
  .settings-page{padding-bottom:calc(176px + env(safe-area-inset-bottom))!important;overflow:visible!important}
  .save-draft-button,.report-panel .action-row button,.report-actions button,.settings-header>div:last-child button{position:relative;z-index:4;scroll-margin-top:126px;scroll-margin-bottom:176px}
  .settings-header,.settings-header>div:last-child{overflow:visible!important}
}
</style>`;

if (!html.includes("</head>")) {
  throw new Error("Expected </head> in restored Production HTML.");
}
html = html.replace("</head>", `${safetyStyle}</head>`);

if (html.includes("function ensureMobileReportQuickbar(){") || html.includes("ensureMobileReportQuickbar()")) {
  throw new Error("Unused mobile PDF quickbar generator remains after patch.");
}

writeFileSync(htmlPath, html);
console.log("Mobile UI contract patched: unused PDF quickbar removed and save/report actions protected from fixed navigation overlap.");
