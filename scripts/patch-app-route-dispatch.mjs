import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
const marker = "NumeriaAppRouteDispatch.v2";
let html = readFileSync(htmlPath, "utf8");

if (html.includes(marker)) {
  throw new Error("App route dispatcher was applied more than once.");
}

const runtime = readFileSync("src/app-route-runtime.js", "utf8");
if (!runtime.includes(marker)) throw new Error("App route runtime marker is missing.");
const digest = createHash("sha256").update(runtime).digest("hex").slice(0, 12);
const runtimeName = `numeria-app-routes-${digest}.js`;
writeFileSync(`dist/assets/${runtimeName}`, runtime);

const injection = `<!-- ${marker} --><script id="numeria-app-route-dispatch" src="/assets/${runtimeName}"></script>`;
if (!html.includes("</body>")) throw new Error("Expected </body> in restored Production HTML.");
html = html.replace("</body>", `${injection}</body>`);
writeFileSync(htmlPath, html);
console.log(`Numeria /app route dispatcher added to Production HTML: ${runtimeName}.`);
