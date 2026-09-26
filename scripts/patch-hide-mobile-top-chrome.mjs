import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
let html = readFileSync(htmlPath, "utf8");
const marker = "NumeriaHideMobileTopChrome.v1";
if (html.includes(marker)) {
  throw new Error("Mobile top chrome hide patch was applied more than once.");
}

const style = `<style id="numeria-hide-mobile-top-chrome">
/* ${marker}: temporary isolation step before rebuilding the menu from zero. */
@media (width <= 760px){
  .mobile-appbar,
  #numeria-mobile-appbar,
  .mobile-menu-panel,
  .mobile-menu-backdrop,
  #numeria-rebuilt-side-menu,
  #numeria-rebuilt-menu-backdrop,
  #numeria-side-menu-tap-bridge,
  #numeria-side-menu-fallback-panel,
  #numeria-divination-settings-fallback{
    display:none!important;
    visibility:hidden!important;
    pointer-events:none!important;
  }
  .page{
    padding-top:22px!important;
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
console.log("Mobile top chrome hidden for menu rebuild isolation.");
