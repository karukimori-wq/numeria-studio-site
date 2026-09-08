import { readFileSync, writeFileSync } from "node:fs";

const legacyAssetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(legacyAssetPath, "utf8");
const legacyPdfNavigation = "window.location.assign(o)";
const safePdfNavigation = 'window.open(o,"_blank","noopener,noreferrer")||window.location.assign(o)';
const occurrenceCount = source.split(legacyPdfNavigation).length - 1;

if (occurrenceCount !== 3) {
  throw new Error(`Expected three legacy PDF navigation calls, found ${occurrenceCount}.`);
}

const patched = source.split(legacyPdfNavigation).join(safePdfNavigation);
writeFileSync(legacyAssetPath, patched);

console.log("Legacy PDF exports now open in a separate tab with navigation fallback.");
