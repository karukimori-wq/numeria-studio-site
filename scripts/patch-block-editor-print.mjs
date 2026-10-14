import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const directory = "dist/assets";
const asset = readdirSync(directory).find((file) => /^numeria-app-runtime-.*\.js$/.test(file)) || "numeria-app-Cckhajir.js";
const target = `${directory}/${asset}`;
let source = readFileSync(target, "utf8");

// Printing is rendered by the v3 runtime from the same document it edits.
source = source.replace(/;\(\(\)=>\{if\(window\.__NumeriaBlockEditorPrintV1\)[\s\S]*?\/\* block-editor-print-end \*\/\}\)\(\);/g, "");
writeFileSync(target, source);
console.log(`Legacy block editor print patch removed from ${target}; v3 owns print rendering.`);
