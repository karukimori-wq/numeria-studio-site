import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const outDir = "dist";
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

for (const item of ["index.html", "favicon.svg", "assets"]) {
  cpSync(item, `${outDir}/${item}`, { recursive: true });
}

console.log("Static site copied to dist/.");
