import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = "lp-preview-dist";
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync("assets/welcome.html", join(target, "index.html"));
cpSync("favicon.svg", join(target, "favicon.svg"));
const selected = [
  "assets/tarot-decks/cards/celestialcosmos-major-17.webp",
  "assets/divination-visuals/western-astrology-wheel-v1.png",
];
for (const source of selected) {
  const destination = join(target, source);
  mkdirSync(destination.substring(0, destination.lastIndexOf("/")), { recursive: true });
  cpSync(source, destination);
}
writeFileSync(join(target, "_build-info.txt"), "Numeria Studio LP preview only. No authentication, customer, or payment data.\n");
console.log("Built isolated LP preview: index.html, favicon.svg, two public design assets.");
