import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-plan-feature-gates.mjs", "utf8");

const required = [
  "Free=1, Pro=20",
  "settings template plan gate",
  "reading template plan gate",
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

console.log("Plan feature gate patch contract verified: subscription plan stays authoritative; Free/Pro UI gates and restore normalization are present.");
