import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const assetsDir = "dist/assets";
const htmlPaths = ["dist/original.html", "dist/index.html"].filter(existsSync);
const marker = "NumeriaRuntimeAssetVersioning.v1";

function digest(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

const assetNames = readdirSync(assetsDir);
const appCandidates = assetNames.filter((name) => /^numeria-app-.*\.js$/.test(name) && !/^numeria-app-runtime-/.test(name));
const appName = appCandidates.find((name) => {
  const source = readFileSync(`${assetsDir}/${name}`, "utf8");
  return source.includes("NumeriaNavigationBridge.v1");
});

if (!appName) {
  throw new Error("Patched Numeria application bundle with NumeriaNavigationBridge.v1 was not found.");
}

const appSource = readFileSync(`${assetsDir}/${appName}`, "utf8");
const versionedAppName = `numeria-app-runtime-${digest(appSource)}.js`;
writeFileSync(`${assetsDir}/${versionedAppName}`, appSource);

const indexCandidates = assetNames.filter((name) => /^index-.*\.js$/.test(name) && !/^index-runtime-/.test(name));
const indexReplacements = [];
for (const indexName of indexCandidates) {
  const indexPath = `${assetsDir}/${indexName}`;
  const indexSource = readFileSync(indexPath, "utf8");
  if (!indexSource.includes(appName)) continue;
  const patchedIndex = replaceAll(indexSource, appName, versionedAppName);
  const versionedIndexName = `index-runtime-${digest(patchedIndex)}.js`;
  writeFileSync(`${assetsDir}/${versionedIndexName}`, patchedIndex);
  indexReplacements.push({ from: indexName, to: versionedIndexName });
}

if (indexReplacements.length === 0) {
  throw new Error(`No index bundle referenced ${appName}; runtime asset versioning cannot be completed.`);
}

let originalHtmlUpdated = false;
for (const htmlPath of htmlPaths) {
  let html = readFileSync(htmlPath, "utf8");
  const before = html;
  html = replaceAll(html, appName, versionedAppName);
  for (const replacement of indexReplacements) {
    html = replaceAll(html, replacement.from, replacement.to);
  }
  if (html !== before) {
    if (htmlPath === "dist/original.html") {
      const comment = `<!-- ${marker} app=${versionedAppName} index=${indexReplacements.map((item) => item.to).join(",")} -->`;
      if (!html.includes(marker)) html = html.replace("</head>", `${comment}</head>`);
      originalHtmlUpdated = true;
    }
    writeFileSync(htmlPath, html);
  }
}

if (!originalHtmlUpdated) {
  throw new Error("Production original.html did not reference the runtime assets that must be versioned.");
}

const originalHtml = readFileSync("dist/original.html", "utf8");
if (!originalHtml.includes(versionedAppName)) {
  throw new Error("Production HTML does not reference the versioned Numeria application bundle.");
}
for (const replacement of indexReplacements) {
  if (!originalHtml.includes(replacement.to)) {
    throw new Error(`Production HTML does not reference versioned index bundle ${replacement.to}.`);
  }
}

console.log(`Runtime assets cache-busted: ${appName} -> ${versionedAppName}; ${indexReplacements.map((item) => `${item.from} -> ${item.to}`).join("; ")}`);
