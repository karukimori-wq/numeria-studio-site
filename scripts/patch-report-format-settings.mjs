import fs from "node:fs";

const appBundles = [
  "assets/numeria-app-Cckhajir.js",
  "dist/assets/numeria-app-Cckhajir.js",
];

const oldTarotCopy = "数秘術と同じレイアウトから、タロット用に個別設定します";
const newTarotCopy =
  "カード絵柄とは別に、タロット鑑定書用のレイアウトを選びます";

for (const file of appBundles) {
  let source = fs.readFileSync(file, "utf8");
  if (!source.includes(oldTarotCopy) && !source.includes(newTarotCopy)) {
    throw new Error(`${file}: tarot report format copy was not found`);
  }
  source = source.replaceAll(oldTarotCopy, newTarotCopy);
  fs.writeFileSync(file, source);
}

const styleBundles = [
  "assets/index-CEGe-9Xe.css",
  "dist/assets/index-CEGe-9Xe.css",
];

const mobilePresetGridRule =
  "@media (width<=760px){.preset-library-card .template-grid-20{max-height:none;overflow:visible}.preset-library-card .template-grid-20 .template-thumb{height:74px}}";

for (const file of styleBundles) {
  let source = fs.readFileSync(file, "utf8");
  if (!source.includes(mobilePresetGridRule)) {
    source += mobilePresetGridRule;
    fs.writeFileSync(file, source);
  }
}

console.log("Patched report format settings UI.");
