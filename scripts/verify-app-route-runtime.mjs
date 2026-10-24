import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app-route-runtime.js", "utf8");
const listeners = new Map();
const documentListeners = new Map();
const calls = [];
const location = { pathname: "/outside", assign(path) { this.pathname = path; } };
const history = {
  length: 1,
  pushState(_state, _title, path) { location.pathname = path; this.length += 1; },
  replaceState(_state, _title, path) { location.pathname = path; },
  back() {},
};
const classSet = new Set();
const nodes = new Map();
const document = {
  documentElement: {
    dataset: {},
    classList: { toggle(name, active) { active ? classSet.add(name) : classSet.delete(name); } },
  },
  getElementById(id) { return nodes.get(id) || null; },
  head: { appendChild(node) { nodes.set(node.id, node); } },
  body: { appendChild(node) { nodes.set(node.id, node); } },
  createElement() { return { dataset: {}, setAttribute() {}, appendChild() {}, replaceChildren() {}, querySelector() { return null; }, querySelectorAll() { return []; }, classList: { toggle() {} } }; },
  addEventListener(type, listener) {
    const list = documentListeners.get(type) || [];
    list.push(listener);
    documentListeners.set(type, list);
  },
};
class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const window = {
  location,
  history,
  document,
  CustomEvent,
  addEventListener(type, listener) {
    const list = listeners.get(type) || [];
    list.push(listener);
    listeners.set(type, list);
  },
  dispatchEvent(event) {
    for (const listener of listeners.get(event.type) || []) listener(event);
  },
};
const context = vm.createContext({
  window,
  location,
  history,
  document,
  CustomEvent,
  console,
  URL,
  encodeURIComponent,
  decodeURIComponent,
  setInterval() { return 1; },
  clearInterval() {},
  queueMicrotask(callback) { callback(); },
});
vm.runInContext(source, context, { filename: "app-route-runtime.js" });

const routes = window.NumeriaAppRoutes;
assert.equal(routes.routeSpec("/app/home").kind, "home");
assert.equal(routes.routeSpec("/app/clients/acl_123").clientRef, "acl_123");
assert.equal(routes.routeSpec("/app/readings/ses_456").sessionId, "ses_456");
assert.equal(routes.routeSpec("/app/reports/rep_789").reportId, "rep_789");
assert.equal(routes.safeReturnPath("https://outside.example/app"), "/app/home");
assert.equal(routes.safeReturnPath("//outside.example/app"), "/app/home");

function navigation(label) {
  return {
    version: "test-" + label,
    go(page) { calls.push(`${label}:go:${page}`); },
    newReading() { calls.push(`${label}:new`); },
    getClients() { return [{ id: "client-431", name: "受入テスト 431b3ea" }]; },
    signOut() { calls.push(`${label}:signOut`); },
  };
}

const first = navigation("first");
window.NumeriaNavigation = first;
location.pathname = "/app/home";
window.dispatchEvent(new CustomEvent("numeria-navigation-ready"));
first.go("appraisalProfiles");
assert.equal(location.pathname, "/app/clients", "The first Navigation API instance synchronizes its URL.");

const second = navigation("second");
window.NumeriaNavigation = second;
window.dispatchEvent(new CustomEvent("numeria-navigation-ready"));
second.go("settings");
assert.equal(location.pathname, "/app/settings/report-formats", "A replacement Navigation API instance is reconnected.");

location.pathname = "/app/home";
window.dispatchEvent(new CustomEvent("popstate"));
assert.ok(calls.includes("second:go:dashboard"), "Back/popstate dispatches through the current API instance.");
second.newReading();
assert.equal(location.pathname, "/app/readings/new", "New reading navigation owns a distinct URL.");

location.pathname = "/app/home";
const nativeClientsButton = {
  textContent: "◇ カルテ",
  hasAttribute() { return false; },
  closest(selector) { return selector === "button" ? this : null; },
  getAttribute() { return ""; },
};
for (const listener of documentListeners.get("click") || []) {
  listener({ target: nativeClientsButton });
}
assert.equal(location.pathname, "/app/clients", "Native React navigation clicks synchronize the canonical URL.");

const nativeClientButton = {
  textContent: "受 受入テスト 431b3ea C-0005 · 鑑定 0回 受付 ›",
  hasAttribute() { return false; },
  closest(selector) { return selector === "button" ? this : null; },
  getAttribute() { return ""; },
};
assert.equal(routes.nativeButtonPath(nativeClientButton), "/app/clients/client-431", "Native client rows resolve the selected client ID from either the name or clientName field.");

console.log("App route runtime executed: direct IDs, API replacement, native navigation, Back dispatch, and URL synchronization verified.");

// Execute the ACK listener against an editor changed after the save began.
let editorBody = "本文: 保存前";
let fetchCount = 0;
let resumed = 0;
window.NumeriaAuthenticatedFetch = async () => {
  fetchCount++;
  return { ok: true, json: async () => ({ session: { snapshot: { theme: "本文: 保存前" } } }) };
};
second.resumeSession = () => { resumed++; editorBody = "本文: 保存前"; return true; };
await routes.navigate("/app/readings/new");
window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status", { detail: { state: "saving" } }));
editorBody = "本文: 保存中に追記";
window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status", { detail: { state: "saved", sessionId: "ses_ack" } }));
await Promise.resolve();
assert.equal(location.pathname, "/app/readings/ses_ack");
assert.equal(editorBody, "本文: 保存中に追記", "ACK must retain edits made while saving.");
assert.equal(fetchCount, 0, "ACK must not fetch an older snapshot.");
assert.equal(resumed, 0, "ACK must not rehydrate the editor.");
for (const state of ["saving", "error"]) {
  window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status", { detail: { state } }));
  assert.equal(editorBody, "本文: 保存中に追記", "Failed/conflicting saves retain the editor.");
}
window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status", { detail: { state: "saving" } }));
await routes.navigate("/app/clients");
window.dispatchEvent(new CustomEvent("numeria-reading-draft-save-status", { detail: { state: "saved", sessionId: "ses_late" } }));
assert.equal(location.pathname, "/app/clients", "A late ACK must not pull the user back from another screen.");

const settled = [];
window.addEventListener("numeria-route-settled", event => settled.push(event.detail));
for (const status of [401, 404, 409, 500]) {
  window.NumeriaAuthenticatedFetch = async () => ({ ok: false, status, json: async () => ({ message: `failure ${status}` }) });
  await routes.navigate("/app/readings/ses_denied");
  assert.equal(settled.at(-1).ok, false, `HTTP ${status} must not settle as success.`);
  assert.equal(resumed, 0, "Failed restoration must not touch the editor.");
}
window.NumeriaAuthenticatedFetch = async () => { throw new Error("offline"); };
await routes.navigate("/app/reports/rep_offline");
assert.equal(settled.at(-1).ok, false, "A network error must not settle as success.");
assert.equal(editorBody, "本文: 保存中に追記");
console.log("ACK preserves in-flight edits; late ACK navigation and failed restoration are guarded (VM fixtures, not Clerk/D1).");
