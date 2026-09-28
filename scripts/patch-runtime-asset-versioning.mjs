import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const assetsDir = "dist/assets";
const htmlPaths = ["dist/original.html", "dist/original", "dist/index.html"].filter(existsSync);
const marker = "NumeriaRuntimeAssetVersioning.v1";
const navigationBridgeVersion = "NumeriaNavigationBridge.v2";
const recoveryRuntimeVersion = "NumeriaIOSRuntimeRecovery.v2";
const rscBootstrapGuardVersion = "NumeriaRscBootstrapOrder.v1";

function digest(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

function moveRscPayloadBeforeBootstrap(html, htmlPath) {
  const bootstrap = html.match(/<script id="_R_">import\(".*?assets\/index-[^"]+\.js"\)<\/script>/);
  if (!bootstrap) {
    if (htmlPath === "dist/index.html") return html;
    throw new Error(`${htmlPath} does not contain the Vinext index bootstrap script.`);
  }
  const rscScripts = html.match(/<script>self\.__VINEXT_RSC_(?:CHUNKS__[\s\S]*?\.push\([\s\S]*?\)|DONE__=true)<\/script>/g) || [];
  if (rscScripts.length === 0) {
    throw new Error(`${htmlPath} does not contain inline Vinext RSC payload scripts.`);
  }
  let next = html;
  for (const script of rscScripts) {
    next = next.replace(script, "");
  }
  return next.replace(bootstrap[0], `${rscScripts.join("")}${bootstrap[0]}`);
}

function guardIndexBootstrapUntilRscReady(source, indexName) {
  if (source.includes(rscBootstrapGuardVersion)) return source;
  const bootstrapCall = "ca()),window.__VINEXT_LINK_PREFETCH_ROUTES__";
  if (!source.includes(bootstrapCall)) {
    throw new Error(`${indexName} does not contain the expected Vinext bootstrap call.`);
  }
  const guardedCall = `(globalThis.__NumeriaRscBootstrapOrder="${rscBootstrapGuardVersion}",(()=>{const e=Date.now(),t=()=>{globalThis.__VINEXT_RSC_DONE__||Date.now()-e>5000?ca():setTimeout(t,10)};t()})()),window.__VINEXT_LINK_PREFETCH_ROUTES__`;
  return replaceAll(source, bootstrapCall, guardedCall);
}

const assetNames = readdirSync(assetsDir);
const appCandidates = assetNames.filter((name) => /^numeria-app-.*\.js$/.test(name) && !/^numeria-app-runtime-/.test(name));
const appName = appCandidates.find((name) => {
  const source = readFileSync(`${assetsDir}/${name}`, "utf8");
  return source.includes(navigationBridgeVersion);
});

if (!appName) {
  throw new Error(`Patched Numeria application bundle with ${navigationBridgeVersion} was not found.`);
}

const originalAppSource = readFileSync(`${assetsDir}/${appName}`, "utf8");
// Deliberately change the runtime bytes during recovery so iOS Safari cannot reuse
// a previously cached application module after a reverted deployment.
const appSource = `${originalAppSource}\n/* ${recoveryRuntimeVersion} */\n`;
const versionedAppName = `numeria-app-runtime-${digest(appSource)}.js`;
writeFileSync(`${assetsDir}/${versionedAppName}`, appSource);
// Keep the legacy filename fresh as well. Some mobile browsers can retain an
// older HTML document that still imports numeria-app-Cckhajir.js directly.
writeFileSync(`${assetsDir}/${appName}`, appSource);

const indexCandidates = assetNames.filter((name) => /^index-.*\.js$/.test(name) && !/^index-runtime-/.test(name));
const indexReplacements = [];
for (const indexName of indexCandidates) {
  const indexPath = `${assetsDir}/${indexName}`;
  const indexSource = readFileSync(indexPath, "utf8");
  if (!indexSource.includes(appName)) continue;
  const patchedIndex = guardIndexBootstrapUntilRscReady(replaceAll(indexSource, appName, versionedAppName), indexName);
  const versionedIndexName = `index-runtime-${digest(patchedIndex)}.js`;
  writeFileSync(`${assetsDir}/${versionedIndexName}`, patchedIndex);
  // Update the legacy entrypoint so stale HTML that imports index-CYZnnbch.js
  // still loads the recovered application bundle.
  writeFileSync(indexPath, patchedIndex);
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
  html = moveRscPayloadBeforeBootstrap(html, htmlPath);
  if (html !== before) {
    if (htmlPath === "dist/original.html" || htmlPath === "dist/original") {
      const comment = `<!-- ${marker} ${recoveryRuntimeVersion} app=${versionedAppName} index=${indexReplacements.map((item) => item.to).join(",")} -->`;
      if (!html.includes(marker)) html = html.replace("</head>", `${comment}</head>`);
    }
    if (htmlPath === "dist/original.html") {
      originalHtmlUpdated = true;
    }
    writeFileSync(htmlPath, html);
  }
}

if (!originalHtmlUpdated) {
  throw new Error("Production original.html did not reference the runtime assets that must be versioned.");
}

const originalHtml = readFileSync("dist/original.html", "utf8");
const rscDonePosition = originalHtml.indexOf("self.__VINEXT_RSC_DONE__=true");
const bootstrapPosition = originalHtml.indexOf('<script id="_R_">import(');
if (rscDonePosition < 0 || bootstrapPosition < 0 || rscDonePosition > bootstrapPosition) {
  throw new Error("Production HTML must place inline RSC payload before the Vinext index bootstrap.");
}
if (!originalHtml.includes(recoveryRuntimeVersion)) {
  throw new Error("Production HTML does not include the iOS runtime recovery marker.");
}
if (!readFileSync(`${assetsDir}/${versionedAppName}`, "utf8").includes(recoveryRuntimeVersion)) {
  throw new Error("Versioned Numeria application bundle does not include the iOS runtime recovery marker.");
}
if (!readFileSync(`${assetsDir}/${appName}`, "utf8").includes(recoveryRuntimeVersion)) {
  throw new Error("Legacy Numeria application bundle does not include the iOS runtime recovery marker.");
}
if (!originalHtml.includes(versionedAppName)) {
  throw new Error("Production HTML does not reference the versioned Numeria application bundle.");
}
for (const replacement of indexReplacements) {
  const legacyIndexSource = readFileSync(`${assetsDir}/${replacement.from}`, "utf8");
  if (!legacyIndexSource.includes(versionedAppName)) {
    throw new Error(`Legacy index bundle ${replacement.from} does not import the recovered app bundle.`);
  }
  if (!legacyIndexSource.includes(rscBootstrapGuardVersion)) {
    throw new Error(`Legacy index bundle ${replacement.from} does not wait for inline RSC payload before bootstrapping.`);
  }
  if (!originalHtml.includes(replacement.to)) {
    throw new Error(`Production HTML does not reference versioned index bundle ${replacement.to}.`);
  }
}

console.log(`Runtime assets cache-busted with ${navigationBridgeVersion}: ${appName} -> ${versionedAppName}; ${indexReplacements.map((item) => `${item.from} -> ${item.to}`).join("; ")}`);
