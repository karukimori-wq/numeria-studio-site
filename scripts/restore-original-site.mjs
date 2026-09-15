import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("dist")) {
  throw new Error("dist directory does not exist. Run vite build first.");
}

const productionHtml = readFileSync("dist/index.html", "utf8");

if (!productionHtml.includes("/assets/index-")) {
  throw new Error("Expected built Numeria Studio app assets were not found in dist/index.html.");
}

writeFileSync("dist/original.html", productionHtml);
writeFileSync("dist/original", productionHtml);

console.log("Numeria Studio app shell copied to /original.html and /original.");
