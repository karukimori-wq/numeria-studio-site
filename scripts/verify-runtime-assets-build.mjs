import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("dist/original.html", "utf8");
assert.match(html, /NumeriaRuntimeAssetVersioning\.v1/, "Production HTML must include runtime asset versioning marker.");

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
assert.ok(appSource.includes("NumeriaNavigationBridge.v1"), "Versioned Numeria app bundle must contain the navigation bridge.");
assert.ok(indexSource.includes(appMatch[1]), "Versioned index bundle must import the versioned Numeria app bundle.");

console.log(`Versioned runtime assets verified: ${indexMatch[1]} -> ${appMatch[1]}`);
