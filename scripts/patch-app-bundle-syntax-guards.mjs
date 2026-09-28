import { readFileSync, writeFileSync } from "node:fs";

const appPath = "dist/assets/numeria-app-Cckhajir.js";
const marker = "NumeriaAppBundleSyntaxGuards.v1";
let source = readFileSync(appPath, "utf8");

if (source.includes(marker)) throw new Error("App bundle syntax guard patch was applied more than once.");

const beforeStart = "Ti=()=>{let e=ar===`free`?1:ar===`pro`?20:1/0;";
const duplicate = "return}let e={id:`preset-${Date.now()}`";
const fixed = "return}let preset={id:`preset-${Date.now()}`";
const beforeTail = "customReportItems:Lt.map(e=>({...e})),reportTypography:{...Xt}};jn(t=>[e,...t]),R(`「${e.name}」を保存しました`),window.setTimeout(()=>R(``),2500)},Ei=e=>";
const fixedTail = "customReportItems:Lt.map(e=>({...e})),reportTypography:{...Xt}};jn(t=>[preset,...t]),R(`「${preset.name}」を保存しました`),window.setTimeout(()=>R(``),2500)},Ei=e=>";
const start = source.indexOf(beforeStart);
if (start < 0) throw new Error("Preset save function was not found in Numeria app bundle.");
const duplicateAt = source.indexOf(duplicate, start);
if (duplicateAt < 0) throw new Error("Duplicate preset-save binding was not found in Numeria app bundle.");
source = source.slice(0, duplicateAt) + fixed + source.slice(duplicateAt + duplicate.length);
if (!source.includes(beforeTail)) throw new Error("Preset-save tail was not found in Numeria app bundle.");
source = source.replace(beforeTail, fixedTail);
source = `${source}\n/* ${marker} */\n`;
writeFileSync(appPath, source);
console.log("Numeria app bundle syntax guards patched: duplicate preset-save binding removed.");
