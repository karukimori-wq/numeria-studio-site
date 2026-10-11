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

context.window={NumeriaRuntimeBootDiagnostics:{bootMode:"client"}};
const loadsBefore=loadCount;await context.ca();assert.equal(loadCount,loadsBefore,"Client boot must not execute RSC payload hydration through app dependencies");
assert.match(html,/window.NumeriaStartApp=function\(\)\{state.bootMode="client";directMountApp\(\)\}/);
assert.ok(!html.includes("setTimeout(directMountApp,5200)"));

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

const frameworkName=html.match(/assets\/(framework-client-[a-f0-9]+\.js)/)[1];
const framework=readFileSync("dist/assets/"+frameworkName,"utf8");
assert.match(framework,/NumeriaClientRoot\.v1/);assert.match(framework,/e\.createRoot=function/);
assert.ok(app.includes(frameworkName)&&index.includes(frameworkName),"Client and legacy entrypoints must share the same React instance");
const factory=framework.slice(framework.indexOf('e.createRoot=function'),framework.indexOf(';e.hydrateRoot=function'));
let args,events=0;const exports={};const container={};
new Function('e','s','a','ep','yt','Sd','Fp','Qs','$s','ec','Pp',factory)(exports,()=>true,n=>n,(...values)=>{args=values;return{current:'fiber'}},'root',()=>{events++},function(root){this.root=root},()=>{},()=>{},()=>{},()=>{});
const root=exports.createRoot(container);assert.equal(args[2],false,"Client root must disable hydration");assert.equal(container.root,'fiber');assert.equal(events,1);assert.ok(root.root);
