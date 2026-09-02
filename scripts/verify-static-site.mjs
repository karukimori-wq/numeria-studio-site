import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "favicon.svg",
  "assets/index-CEGe-9Xe.css",
  "assets/index-CYZnnbch.js",
  "assets/framework-CXnKph_e.js",
  "assets/numeria-app-Cckhajir.js"
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `Missing required file: ${file}`);
}

const html = readFileSync("index.html", "utf8");
assert.match(html, /Numeria Studio/);
assert.match(html, /assets\/numeria-app-Cckhajir\.js/);
assert.match(html, /assets\/index-CEGe-9Xe\.css/);
assert.doesNotMatch(html, /https:\/\/numeria-studio\.karukimori\.workers\.dev/);

console.log("Static Numeria Studio site backup verified.");
