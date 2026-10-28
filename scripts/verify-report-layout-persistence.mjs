import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const patchSource = readFileSync("scripts/patch-report-format-settings.mjs", "utf8");
const runtimeMatch = patchSource.match(/const reportTemplateV2Runtime = `([\s\S]*?)`;\n/);
assert.ok(runtimeMatch, "Report template runtime is extractable for integration verification");

function createStorage(seed = new Map()) {
  return {
    getItem: (key) => seed.get(key) ?? null,
    setItem: (key, value) => seed.set(key, String(value)),
    seed,
  };
}

function boot(storage, { plan = "pro", role = "user" } = {}) {
  const documentElement = { dataset: {} };
  const document = {
    documentElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  const window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    NumeriaNavigation: { getPlan: () => plan, getRole: () => role },
  };
  const context = vm.createContext({
    window,
    document,
    localStorage: storage,
    CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    MutationObserver: class MutationObserver { observe() {} },
  });
  vm.runInContext(runtimeMatch[1], context);
  return window.NumeriaReportTemplate;
}

const storage = createStorage();
let api = boot(storage);
api.write({ layoutId: "magazine" });
const savedPreset = { reportTemplate: api.read() };
const savedSession = { snapshot: { reportTemplate: api.read() } };

// A fresh runtime represents a browser reload using the same localStorage.
api = boot(storage);
assert.equal(api.read().layoutId, "magazine", "Reload restores the selected layout");

api.write({ layoutId: "standard" });
api.write(savedPreset.reportTemplate);
assert.equal(api.read().layoutId, "magazine", "Loading a preset restores its saved layout");

api.write({ layoutId: "standard" });
if (savedSession.snapshot?.reportTemplate) api.write(savedSession.snapshot.reportTemplate);
assert.equal(api.read().layoutId, "magazine", "Re-editing a saved session restores its saved layout");

api.write({ layoutId: "unknown-layout" });
assert.equal(api.read().layoutId, "standard", "Unknown saved layouts safely fall back to Standard");

const freeStorage = createStorage();
const freeApi = boot(freeStorage, { plan: "free" });
freeApi.write({ layoutId: "magazine" });
assert.equal(freeApi.read().layoutId, "standard", "Free cannot activate or persist Magazine");

const proApi = boot(createStorage(), { plan: "pro" });
proApi.write({ layoutId: "magazine" });
assert.equal(proApi.read().layoutId, "magazine", "Pro can select Magazine");

const adminApi = boot(createStorage(), { plan: "free", role: "admin" });
adminApi.write({ layoutId: "magazine" });
assert.equal(adminApi.read().layoutId, "magazine", "Admin preview can verify Magazine without changing the subscription plan");

console.log("F1-05/F1-06 integration verified: persistence, re-edit, and Free/Pro layout entitlements.");
