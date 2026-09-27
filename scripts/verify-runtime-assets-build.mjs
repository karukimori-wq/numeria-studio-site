import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("dist/original.html", "utf8");
assert.match(html, /NumeriaRuntimeAssetVersioning\.v1/, "Production HTML must include runtime asset versioning marker.");
assert.match(html, /NumeriaMenuNavigationReadiness\.v1/, "Production HTML must include one-tap menu navigation readiness.");

const appMatch = html.match(/assets\/(numeria-app-runtime-[a-f0-9]{12}\.js)/);
const indexMatch = html.match(/assets\/(index-runtime-[a-f0-9]{12}\.js)/);
assert.ok(appMatch, "Production HTML must reference a content-versioned Numeria app bundle.");
assert.ok(indexMatch, "Production HTML must reference a content-versioned index bundle.");

const appPath = `dist/assets/${appMatch[1]}`;
const indexPath = `dist/assets/${indexMatch[1]}`;
assert.ok(existsSync(appPath), `Versioned Numeria app bundle is missing: ${appPath}`);
assert.ok(existsSync(indexPath), `Versioned index bundle is missing: ${indexPath}`);

const appSource = readFileSync(appPath, "utf8");
const indexSource = readFileSync(indexPath, "utf8");
assert.ok(appSource.includes("NumeriaNavigationBridge.v2"), "Versioned Numeria app bundle must contain navigation bridge v2.");
assert.ok(appSource.includes("numeria-navigation-ready"), "Versioned Numeria app bundle must signal navigation readiness.");
assert.ok(indexSource.includes(appMatch[1]), "Versioned index bundle must import the versioned Numeria app bundle.");

assert.ok(html.includes("queuePageNavigation"), "Production menu must queue one-tap navigation while the app hydrates.");
assert.ok(html.includes("waitForNavigationAction"), "Production menu must automatically resume reading/contact actions when Navigation API becomes ready.");
assert.ok(!html.includes("少し待ってからもう一度押してください"), "Production menu must not ask the user to tap the same item again.");

console.log(`Versioned runtime assets and one-tap menu navigation verified: ${indexMatch[1]} -> ${appMatch[1]}`);
