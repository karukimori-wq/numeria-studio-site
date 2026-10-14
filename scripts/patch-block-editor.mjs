import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const assetDirectory = "dist/assets";
const asset = readdirSync(assetDirectory).find((file) => /^numeria-app-runtime-.*\.js$/.test(file)) || "numeria-app-Cckhajir.js";
const target = `${assetDirectory}/${asset}`;
let source = readFileSync(target, "utf8");
source = source.replace(/;\(\(\)=>\{if\(window\.__NumeriaBlockEditorV2\)[\s\S]*?\/\* block-editor-v2-end \*\/\}\)\(\);/g, "");
source = source.replace(/;\(\(\)=>\{if\(window\.__NumeriaBlockEditorV1\)[\s\S]*?\/\* block-editor-end \*\/\}\)\(\);/g, "");
const runtime = readFileSync("scripts/block-editor-runtime.js", "utf8");
const layoutRuntime = readFileSync("src/report-physical-page-plan.js", "utf8")
  .replace("export const ", "const ")
  .replace("export function ", "function ")
  + "\nwindow.NumeriaPhysicalPagePlan={createPhysicalPagePlan,A4_LAYOUT_CONTRACT_VERSION};\n";
writeFileSync(target, source + layoutRuntime + runtime);
console.log(`Block editor v2 patched into ${target}.`);
