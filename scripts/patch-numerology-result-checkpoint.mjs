import { readFileSync, writeFileSync } from "node:fs";
const path = "dist/assets/numeria-app-Cckhajir.js";
let source = readFileSync(path, "utf8");
const anchor = "Fi=e=>({";
if (source.split(anchor).length !== 2) throw new Error("Expected exactly one reading snapshot for the numerology checkpoint.");
source = source.replace(anchor, "Fi=e=>withNumerologyCalculationCheckpoint({");
writeFileSync(path, source);
console.log("Versioned numerology calculation checkpoint included in each captured reading snapshot.");
