import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "dist/original.html";
const targetPath = "dist/original";
const html = readFileSync(sourcePath, "utf8");

if (!html.includes("NumeriaRuntimeBootDiagnostics.v4")) {
  throw new Error("Refusing to sync extensionless original before v4 boot diagnostics are present.");
}

if (!html.includes("index-runtime-") || html.includes('import("/assets/index-CYZnnbch.js")')) {
  throw new Error("Refusing to sync extensionless original while stale runtime imports remain.");
}

writeFileSync(targetPath, html);
console.log("Extensionless original route synced to the patched Production HTML.");
