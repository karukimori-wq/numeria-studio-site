import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaHideMobileTopChrome.v2";
if (html.includes(marker)) {
  throw new Error("Mobile top chrome hide patch was applied more than once.");
}

const style = `<style id="numeria-hide-mobile-top-chrome">
/* ${marker}: hide the legacy top chrome only. The rebuilt menu trigger and panel stay visible. */
@media (width <= 760px){
  .mobile-appbar,
  #numeria-mobile-appbar,
  .mobile-menu-panel,
  .mobile-menu-backdrop,
  #numeria-side-menu-tap-bridge,
  #numeria-side-menu-fallback-panel,
  #numeria-divination-settings-fallback{
    display:none!important;
    visibility:hidden!important;
    pointer-events:none!important;
  }
  .page{
    padding-top:24px!important;
  }
  .main-area{
    padding-top:0!important;
  }
}
</style>`;

if (!html.includes("</head>")) {
  throw new Error("Expected </head> in restored Production HTML.");
}
html = html.replace("</head>", `${style}</head>`);
writeFileSync(htmlPath, html);
console.log("Legacy mobile top chrome hidden while rebuilt menu remains visible.");
