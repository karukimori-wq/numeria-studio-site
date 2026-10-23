import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app-route-runtime.js", "utf8");
const listeners = new Map();
const calls = [];
const location = { pathname: "/outside", assign(path) { this.pathname = path; } };
const history = {
  length: 1,
  pushState(_state, _title, path) { location.pathname = path; this.length += 1; },
  replaceState(_state, _title, path) { location.pathname = path; },
  back() {},
};
const classSet = new Set();
const document = {
  documentElement: {
    dataset: {},
    classList: { toggle(name, active) { active ? classSet.add(name) : classSet.delete(name); } },
  },
  getElementById() { return null; },
  head: { appendChild() {} },
  body: { appendChild() {} },
  createElement() { return { setAttribute() {}, appendChild() {}, classList: { toggle() {} } }; },
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

console.log("App route runtime executed: direct IDs, API replacement, Back dispatch, and URL synchronization verified.");
