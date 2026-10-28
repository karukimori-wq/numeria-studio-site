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

const legacyPreset = {
  id: "legacy-realistic-1",
  name: "既存の数秘術プリセット",
  template: "cosmic-guide",
  backgroundColor: "#f7f1e7",
  editedText: { overview: "利用者が編集した本文" },
  customLegacyField: { keep: true },
};
const migratedLegacy = proApi.migratePreset(legacyPreset);
assert.equal(migratedLegacy.layoutId, "standard", "A legacy preset without layout migrates to Standard");
assert.deepEqual(migratedLegacy.editedText, legacyPreset.editedText, "Edited legacy text survives migration");
assert.deepEqual(migratedLegacy.customLegacyField, legacyPreset.customLegacyField, "Unknown legacy fields survive migration");
assert.equal(migratedLegacy.migrationAudit.source, "legacy-preset", "Migration remains auditable");

const migrationStorage = createStorage();
let migrationApi = boot(migrationStorage, { plan: "pro" });
migrationApi.write(migrationApi.migratePreset(legacyPreset));
migrationApi = boot(migrationStorage, { plan: "pro" });
const restoredLegacy = migrationApi.read();
assert.equal(restoredLegacy.layoutId, "standard", "The migrated legacy preset restores as Standard after reload");
assert.equal(restoredLegacy.editedText.overview, legacyPreset.editedText.overview, "Edited legacy text survives save and reload");
assert.equal(restoredLegacy.customLegacyField.keep, true, "Unknown legacy fields survive save and reload");

const migratedUnknownLayout = proApi.migratePreset({ ...legacyPreset, layoutId: "retired-layout" });
assert.equal(migratedUnknownLayout.layoutId, "standard", "Retired layouts safely migrate to Standard");
assert.equal(migratedUnknownLayout.requestedLayoutId, "retired-layout", "The retired layout identifier is retained for audit");

const legacyGenericLayout = proApi.migratePreset({ ...legacyPreset, layout: "magazine" });
assert.equal(legacyGenericLayout.layoutId, "standard", "An unrelated legacy layout field is not mistaken for the new report layout");

const migratedV2 = proApi.migratePreset({ reportTemplate: { layoutId: "magazine", editedText: legacyPreset.editedText } });
assert.equal(migratedV2.layoutId, "magazine", "A v2 preset keeps its selected layout");
assert.deepEqual(migratedV2.editedText, legacyPreset.editedText, "A v2 preset keeps edited content");

console.log("F1-05/F1-06/F1-07 integration verified: persistence, entitlements, and non-destructive legacy migration.");
