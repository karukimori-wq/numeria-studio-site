import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("dist/original.html", "utf8");
const indexName = html.match(/assets\/(index-runtime-[a-f0-9]+\.js)/)[1];
const index = readFileSync("dist/assets/" + indexName, "utf8");
const boot = index.slice(index.indexOf("async function ca()"), index.indexOf("function la("));
assert.match(boot, /NumeriaSingleAppRoot\.v1/);
let resolvePayload, hydrateCount = 0, loadCount = 0;
const context = vm.createContext({ window: {}, sa() {}, oa() { loadCount++; return new Promise(resolve => { resolvePayload = resolve; }); }, la() { hydrateCount++; } });
vm.runInContext(boot, context);
const first = context.ca();
// A recovery URL executes a separate copy of the same index module.
vm.runInContext(boot, context);
const recovery = context.ca();
resolvePayload({});
await Promise.all([first, recovery]);
assert.equal(loadCount, 1, "normal and recovery entrypoints share the bootstrap");
assert.equal(hydrateCount, 1, "only one document root is hydrated");

context.window = {};
const pending = context.ca();
context.window.__NUMERIA_DIRECT_MOUNT_STARTED__ = 1;
resolvePayload({});
await pending;
assert.equal(hydrateCount, 1, "late RSC payload cannot mount after direct fallback takes ownership");

const callback = html.split(']).then(([framework,app])=>{')[1].split('}).catch(error=>{state.directMount=')[0];
assert.match(html, /import\("\/assets\/framework-[^"]+\.js"\)/, "fallback must share the app bootstrap React module instance");
let hidden = false;
new Function("appMounted", "state", "hide", "framework", "app", callback)(() => true, {}, () => { hidden = true; }, {}, {});
assert.equal(hidden, true, "fallback rechecks the app after awaiting imports");
assert.ok(callback.indexOf(".unmount()") < callback.indexOf("ensureDirectRoot()"), "the stale document root is released before direct mounting");

const appName = html.match(/assets\/(numeria-app-runtime-[a-f0-9]+\.js)/)[1];
const app = readFileSync("dist/assets/" + appName, "utf8");
assert.match(app, /className:`saved-preset-rail`,children:Ir\.map/);
assert.match(app, /onClick:\(\)=>Ei\(e\)/);
assert.match(app, /onClick:\(\)=>Di\(e\)/);
assert.match(app, /onClick:\(\)=>Oi\(e\)/);
const css = readFileSync("dist/assets/index-CEGe-9Xe.css", "utf8");
assert.match(css, /\.saved-preset-rail\{display:flex;gap:10px;min-width:0;max-width:100%;overflow-x:auto/);
assert.match(css, /\.settings-controls,\.format-settings-reordered,\.format-basic-card\{min-width:0!important/);
console.log("Layout regressions verified: shared bootstrap, late fallback ownership, bounded preset rail, and preserved selection/duplicate/delete handlers. Real browser layout remains unverified.");
