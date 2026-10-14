import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const directory = "dist/assets";
const asset = readdirSync(directory).find((file) => /^numeria-app-runtime-.*\.js$/.test(file)) || "numeria-app-Cckhajir.js";
const target = `${directory}/${asset}`;
let source = readFileSync(target, "utf8");

// V3 owns persistence in its runtime. Remove the old listener so a v2 local
// value can never overwrite an acknowledged v3 document after a user saves.
source = source.replace(/;\(\(\)=>\{if\(window\.__NumeriaBlockEditorCloudSyncV1\)[\s\S]*?\/\* block-editor-cloud-sync-end \*\/\}\)\(\);/g, "");
writeFileSync(target, source);
console.log(`Legacy block editor cloud sync removed from ${target}; v3 uses ACK-based persistence.`);
