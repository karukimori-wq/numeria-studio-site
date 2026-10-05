import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(assetPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

let patched = source;

// Saved presets: Free=1, Pro=20. Admin developer preview does not inherit the subscription cap.
patched = replaceExactly(
  patched,
  "Ti=()=>{let e={id:`preset-${Date.now()}`",
  "Ti=()=>{let e=ar===`free`?1:ar===`pro`?20:1/0;if(tr!==`admin`&&Ir.length>=e){R(ar===`free`?`無料版で保存できるプリセットは1件までです。Proでは最大20件保存できます。`:`Proで保存できるプリセットは最大20件です。`),window.setTimeout(()=>R(``),3200);return}let e={id:`preset-${Date.now()}`",
  1,
  "saved preset plan cap",
);

// Report design choices remain selectable on every plan. Older builds briefly
// limited the visible template arrays, so normalize that back during patching.
patched = patched
  .split("className:`template-grid template-grid-20`,children:(ar===`free`&&tr!==`admin`?Q.slice(0,1):Q).map(e=>")
  .join("className:`template-grid template-grid-20`,children:Q.map(e=>");
patched = patched
  .split("className:`template-grid`,children:(ar===`free`&&tr!==`admin`?$r.slice(0,1):$r).map(e=>")
  .join("className:`template-grid`,children:$r.map(e=>");

// Branding/logo customization is Pro+. Free retains the standard report branding.
patched = replaceExactly(
  patched,
  "(0,Z.jsxs)(`label`,{className:`image-upload`,children:[",
  "(ar!==`free`||tr===`admin`)&&(0,Z.jsxs)(`label`,{className:`image-upload`,children:[",
  1,
  "logo customization plan gate",
);

// Detailed reading editing is Pro+. Hiding the editor is not enough: imported/restored state must not render detailed pages on Free.
patched = replaceExactly(
  patched,
  "(0,Z.jsxs)(`section`,{className:`deep-reading-editor`,children:[",
  "(ar!==`free`||tr===`admin`)&&(0,Z.jsxs)(`section`,{className:`deep-reading-editor`,children:[",
  1,
  "detailed reading editor plan gate",
);

const detailedCallCount = patched.split("showDetailedReading:Ft").length - 1;
if (detailedCallCount < 2) {
  throw new Error(`Expected at least 2 detailed report render bindings, found ${detailedCallCount}.`);
}
patched = patched.split("showDetailedReading:Ft").join("showDetailedReading:ar===`free`&&tr!==`admin`?!1:Ft");

// A Free user restoring a Pro backup must start from the basic template and no custom logo.
patched = replaceExactly(
  patched,
  "r&&(typeof r.template==`string`&&Q.some(e=>e.id===r.template)&&ht(r.template),",
  "r&&(typeof r.template==`string`&&Q.some(e=>e.id===r.template)&&ht(ar===`free`&&tr!==`admin`?Q[0].id:r.template),",
  1,
  "backup template normalization",
);
patched = replaceExactly(
  patched,
  "typeof r.showDetailedReading==`boolean`&&It(r.showDetailedReading),",
  "typeof r.showDetailedReading==`boolean`&&It(ar===`free`&&tr!==`admin`?!1:r.showDetailedReading),",
  1,
  "backup detailed reading normalization",
);

const requiredMarkers = [
  "無料版で保存できるプリセットは1件までです。Proでは最大20件保存できます。",
  "className:`template-grid template-grid-20`,children:Q.map(e=>",
  "className:`template-grid`,children:$r.map(e=>",
  "(ar!==`free`||tr===`admin`)&&(0,Z.jsxs)(`label`,{className:`image-upload`",
  "showDetailedReading:ar===`free`&&tr!==`admin`?!1:Ft",
];
for (const marker of requiredMarkers) {
  if (!patched.includes(marker)) throw new Error(`Plan feature gate marker missing: ${marker}`);
}

writeFileSync(assetPath, patched);
console.log("Free/Pro report feature gates applied: Free 1 saved preset, Pro max 20 saved presets, Pro branding and detailed reading, with restore normalization.");
