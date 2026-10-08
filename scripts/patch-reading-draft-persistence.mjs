import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(assetPath, "utf8");

function replaceExactly(needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Expected 1 ${label}, found ${count}.`);
  source = source.replace(needle, replacement);
}

replaceExactly(
  "appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})",
  "appraisalId:r,clientName:G.name,birthDate:G.birthday||M,divination:l,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``,snapshot:Fi(r)})",
  "shared reading draft request payload",
);

writeFileSync(assetPath, source);
console.log("Reading draft persistence patched with the complete editable snapshot.");
