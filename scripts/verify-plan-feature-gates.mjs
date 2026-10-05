import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-plan-feature-gates.mjs", "utf8");

const required = [
  "Free=1, Pro=20",
  "Report design choices remain selectable on every plan",
  "logo customization plan gate",
  "detailed reading editor plan gate",
  "backup template normalization",
  "backup detailed reading normalization",
];
for (const marker of required) {
  if (!patch.includes(marker)) throw new Error(`Plan feature gate patch is missing: ${marker}`);
}

const forbidden = [
  "ar=`pro`",
  "ar=`business`",
  "profiles.plan",
];
for (const marker of forbidden) {
  if (patch.includes(marker)) throw new Error(`Plan feature gate must not mutate the real subscription plan: ${marker}`);
}

const appSource = readFileSync("assets/numeria-app-Cckhajir.js", "utf8");
const requiredAppMarkers = [
  "className:`template-grid template-grid-20`,children:Q.map(e=>",
  "className:`template-grid`,children:$r.map(e=>",
];
for (const marker of requiredAppMarkers) {
  if (!appSource.includes(marker)) throw new Error(`Report design choices must remain fully selectable: ${marker}`);
}

const forbiddenAppMarkers = [
  "ar===`free`&&tr!==`admin`?Q.slice(0,1):Q",
  "ar===`free`&&tr!==`admin`?$r.slice(0,1):$r",
];
for (const marker of forbiddenAppMarkers) {
  if (appSource.includes(marker)) throw new Error(`Report design choices must not be hidden by plan: ${marker}`);
}

console.log("Plan feature gate patch contract verified: subscription plan stays authoritative; Free/Pro UI gates and restore normalization are present; report designs remain selectable.");
