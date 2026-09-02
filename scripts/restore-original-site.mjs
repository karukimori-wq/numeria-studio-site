import { cpSync, existsSync, mkdirSync } from "node:fs";

if (!existsSync("dist")) {
  throw new Error("dist directory does not exist. Run vite build first.");
}

mkdirSync("dist/assets", { recursive: true });
cpSync("original.html", "dist/original.html");
cpSync("original.html", "dist/original", { force: true });
cpSync("assets", "dist/assets", { recursive: true });

console.log("Original Numeria Studio HTML and assets restored into dist/.");
