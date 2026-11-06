import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { normalizeNumerologyNameInputs, selectedNumerologyName, updateNumerologyNameInputs } from "../src/numerology-name-input.js";
import { numerologyPageDataFromReading } from "../src/numerology-page-data.js";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";

let snapshot = { id: "session-name", divination: "numerology", name: "本人", birthday: "2009-11-11", birthName: "LEGACY NAME", visitDate: "2026-11-01", includeCompatibility: true, partnerName: "相手", partnerBirthday: "1990-01-02", partnerBirthName: "OTHER LEGACY", partnerRelation: "家族", numerologyNameInputs: normalizeNumerologyNameInputs(null) };
function update(role, operation, extra = {}) {
  const before = JSON.stringify(snapshot.numerologyNameInputs);
  const result = updateNumerologyNameInputs(snapshot.numerologyNameInputs, { role, operation, ...extra }, snapshot);
  assert.equal(JSON.stringify(snapshot.numerologyNameInputs), before, "updates must not mutate prior snapshots");
  if (result.ok) snapshot = { ...snapshot, numerologyNameInputs: result.value };
  return result;
}
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, false);
assert.equal(update("subject", "confirm").ok, false);
assert.equal(update("subject", "edit", { romanName: "Ｔａｒｏ Ｙａｍａｄａ" }).ok, true);
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, false);
assert.equal(update("subject", "confirm").ok, true);
assert.deepEqual(selectedNumerologyName(snapshot), { romanName: "TAROYAMADA", romanNameConfirmed: true, nameKind: "birth" });
assert.equal(numerologyPageDataFromReading(snapshot).pages.find(p => p.pageDefinitionId === "NUM-01").status, "calculated");
assert.equal(update("subject", "select", { kind: "current" }).ok, true);
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, false);
update("subject", "edit", { romanName: "TARO SATO" }); update("subject", "confirm");
const current = selectedNumerologyName(snapshot);
assert.equal(current.nameKind, "current");
assert.equal(numerologyPageDataFromReading(snapshot).nameSources.subject.romanName, "TAROSATO");
assert.equal(snapshot.numerologyNameInputs.subject.birth.romanName, "Ｔａｒｏ Ｙａｍａｄａ");
update("subject", "select", { kind: "birth" });
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, true, "a separately confirmed name survives switching back");
for (const changed of [{ name: "別の人" }, { birthday: "2009-11-12" }, { birthName: "CHANGED LEGACY" }]) {
  assert.equal(selectedNumerologyName({ ...snapshot, ...changed }).romanNameConfirmed, false);
}
const altered = structuredClone(snapshot);
altered.numerologyNameInputs.subject.birth.romanName = "SOMEONE ELSE";
assert.equal(selectedNumerologyName(altered).romanNameConfirmed, false, "confirmation must bind the exact normalized name");
assert.equal(selectedNumerologyName(JSON.parse(JSON.stringify(snapshot))).romanNameConfirmed, true);
update("partner", "edit", { romanName: "AOI SATO" }); update("partner", "confirm");
assert.equal(selectedNumerologyName(snapshot, "partner").romanNameConfirmed, true);
assert.equal(numerologyPageDataFromReading(snapshot).pages.find(p => p.pageDefinitionId === "NUM-08").data.supplements.length, 5);
update("subject", "edit", { romanName: "太郎" });
assert.equal(update("subject", "confirm").ok, false);
assert.equal(numerologyPageDataFromReading(snapshot).pages.find(p => p.pageDefinitionId === "NUM-01").status, "input-incomplete");
assert.equal(numerologyPageDataFromReading(snapshot).pages.find(p => p.pageDefinitionId === "NUM-13").status, "calculated");
update("subject", "edit", { romanName: "ß" }); assert.equal(update("subject", "confirm").ok, false);
update("subject", "edit", { romanName: "TARO YAMADA" }); update("subject", "confirm");
for (const birthday of ["", "2025-02-29", "2027-01-01"]) {
  assert.equal(updateNumerologyNameInputs(snapshot.numerologyNameInputs, { role: "subject", operation: "confirm" }, { ...snapshot, birthday }).ok, false);
}
assert.equal(update("other", "confirm").ok, false);
assert.equal(update("subject", "select", { kind: "other" }).ok, false);
assert.equal(update("subject", "edit", { romanName: "A".repeat(257) }).ok, false);
assert.equal(selectedNumerologyName({ ...snapshot, numerologyNameInputs: { version: "unknown" } }).romanNameConfirmed, false);

// Apply the real bridge patch to the original bundle, then execute its snapshot
// and update handlers. This covers immediate edits and save-during-edit isolation.
const directory = mkdtempSync(join(tmpdir(), "numeria-name-input-"));
try {
  mkdirSync(join(directory, "dist/assets"), { recursive: true });
  copyFileSync("assets/numeria-app-Cckhajir.js", join(directory, "dist/assets/numeria-app-Cckhajir.js"));
  for (const patch of ["patch-navigation-bridge.mjs", "patch-numerology-name-input.mjs", "patch-numerology-result-checkpoint.mjs"]) {
    const result = spawnSync(process.execPath, [join(process.cwd(), "scripts", patch)], { cwd: directory, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  const bundle = readFileSync(join(directory, "dist/assets/numeria-app-Cckhajir.js"), "utf8");
  const snapshotCode = bundle.slice(bundle.indexOf("Fi=e=>"), bundle.indexOf(",Ii=async", bundle.indexOf("Fi=e=>")));
  const handlerStart = bundle.indexOf("updateNumerologyNames:function(change)");
  const handler = bundle.slice(handlerStart, bundle.indexOf(",saveReadingDraft:", handlerStart));
  const events = [];
  const context = Object.fromEntries([...new Set(snapshotCode.match(/[A-Za-z_$][\w$]*/g))].map(key => [key, undefined]));
  Object.assign(context, { normalizeNumerologyNameInputs, updateNumerologyNameInputs, withNumerologyCalculationCheckpoint,
    numeriaNameInputsRef: { current: snapshot.numerologyNameInputs }, l: "numerology", ce: true, Dn: "session-name",
    j: snapshot.name, ae: snapshot.birthName, M: snapshot.birthday, be: snapshot.visitDate,
    de: snapshot.partnerName, pe: snapshot.partnerBirthName, he: snapshot.partnerBirthday, _e: "家族", Lt: [], Re: [],
    window: { dispatchEvent: event => events.push(event) }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  });
  const sandbox = vm.createContext(context);
  vm.runInContext(`var ${snapshotCode};var bridge={${handler}};`, sandbox);
  const captured = vm.runInContext("Fi(Dn)", sandbox);
  assert.equal(selectedNumerologyName(captured).romanNameConfirmed, true);
  assert.equal(captured.numerologyCalculation.results[0].data.lifePath, 33);
  assert.equal(captured.numerologyCalculation.source.nameSources.subject.romanName, "TAROYAMADA");
  vm.runInContext('bridge.updateNumerologyNames({role:"subject",operation:"edit",romanName:"NEW NAME"})', sandbox);
  assert.equal(selectedNumerologyName(vm.runInContext("Fi(Dn)", sandbox)).romanNameConfirmed, false);
  assert.equal(vm.runInContext("Fi(Dn)", sandbox).numerologyCalculation.results[0].data.destiny, null);
  assert.equal(selectedNumerologyName(captured).romanNameConfirmed, true, "captured in-flight draft snapshot must remain immutable");
  assert.equal(captured.numerologyCalculation.results[0].data.destiny, 9);
  assert.equal(events.at(-1).detail.state, "dirty");
  vm.runInContext('l="tarot"', sandbox);
  assert.equal(vm.runInContext('bridge.updateNumerologyNames({role:"subject",operation:"confirm"}).ok', sandbox), false);
  vm.runInContext('l="numerology";ce=false', sandbox);
  assert.equal(vm.runInContext('bridge.updateNumerologyNames({role:"partner",operation:"confirm"}).ok', sandbox), false);
  const restore = bundle.match(/numeriaNameInputsRef.current=normalizeNumerologyNameInputs\(n.numerologyNameInputs\)/)[0];
  context.n = { numerologyNameInputs: captured.numerologyNameInputs };
  vm.runInContext(restore, sandbox);
  assert.equal(selectedNumerologyName(vm.runInContext("Fi(Dn)", sandbox)).romanNameConfirmed, true);
  const reset = bundle.match(/di=\(\)=>\{(numeriaNameInputsRef.current=normalizeNumerologyNameInputs\(null\);)/)[1];
  vm.runInContext(reset, sandbox);
  assert.equal(selectedNumerologyName(vm.runInContext("Fi(Dn)", sandbox)).romanNameConfirmed, false);
  assert.match(bundle, /hi=e=>\{numeriaNameInputsRef.current=normalizeNumerologyNameInputs\(null\)/);
} finally { rmSync(directory, { recursive: true, force: true }); }

// Exercise form events with a lightweight DOM boundary; no browser acceptance
// is claimed. Both successful ACKs and in-flight changes use production handlers.
let fields = [], refreshes = 0, listener, saveResolve, capturedSave;
const saveButton = {}, saveFeedback = {};
const form = { innerHTML: "", querySelectorAll() {
  fields = ["subject", "partner"].map(role => {
    const person = normalizeNumerologyNameInputs(snapshot.numerologyNameInputs)[role];
    const elements = { "[data-numerology-name-value]": { value: person[person.selected].romanName }, "[data-numerology-name-kind]": { value: person.selected }, "[data-numerology-name-status]": {}, "[data-numerology-name-confirm]": {} };
    return { dataset: { numerologyNamePerson: role }, querySelector: key => elements[key] };
  }); return fields;
}, querySelector: key => key === "[data-numerology-name-save]" ? saveButton : saveFeedback };
const formWindow = { NumeriaNavigation: { getReadingSnapshot: () => structuredClone(snapshot), updateNumerologyNames: change => update(change.role, change.operation, change),
  saveReadingDraft: () => { capturedSave = structuredClone(snapshot); listener({ detail: { state: "saving" } }); return new Promise(resolve => { saveResolve = resolve; }); },
}, addEventListener: (type, callback) => { listener = callback; }, removeEventListener: (type, callback) => { assert.equal(callback, listener); listener = null; } };
const formContext = vm.createContext({ window: formWindow, normalizeNumerologyNameInputs, selectedNumerologyName, form, onUpdate: () => refreshes++ });
vm.runInContext(readFileSync("scripts/numerology-name-form-runtime.js", "utf8") + ";mountNumerologyNameForm(form,onUpdate)", formContext);
assert.equal(fields.length, 2);
let subjectField = fields[0];
const nameInput = subjectField.querySelector("[data-numerology-name-value]");
nameInput.value = "TARO YAMADA"; nameInput.oninput();
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, false);
subjectField.querySelector("[data-numerology-name-confirm]").onclick();
assert.equal(selectedNumerologyName(snapshot).romanNameConfirmed, true);
assert.match(subjectField.querySelector("[data-numerology-name-status]").textContent, /未保存/);
assert.ok(refreshes >= 2);
let saving = saveButton.onclick({ currentTarget: saveButton });
assert.equal(saveButton.disabled, true);
const busySelector = subjectField.querySelector("[data-numerology-name-kind]"); busySelector.value = "current"; busySelector.onchange({ target: busySelector });
assert.equal(busySelector.value, "birth", "do not remount a second save button during an in-flight save");
listener({ detail: { state: "saved", sessionId: snapshot.id, snapshot: capturedSave } }); saveResolve(); await saving;
assert.match(saveFeedback.textContent, /保存しました/);
assert.equal(saveButton.disabled, false);
assert.equal(listener, null);
saving = saveButton.onclick({ currentTarget: saveButton });
nameInput.value = "TARO SATO"; nameInput.oninput();
listener({ detail: { state: "saved", sessionId: snapshot.id, snapshot: capturedSave } }); saveResolve(); await saving;
assert.match(saveFeedback.textContent, /もう一度保存/);
saving = saveButton.onclick({ currentTarget: saveButton });
listener({ detail: { state: "error" } }); saveResolve(); await saving;
assert.match(saveFeedback.textContent, /保存できません/);
saving = saveButton.onclick({ currentTarget: saveButton });
saveResolve(); await saving;
assert.match(saveFeedback.textContent, /保存完了を確認できません/);
assert.equal(saveButton.disabled, false);
const selector = subjectField.querySelector("[data-numerology-name-kind]"); selector.value = "current"; selector.onchange({ target: selector });
assert.equal(selectedNumerologyName(snapshot).nameKind, "current");
assert.equal(fields[0].querySelector("[data-numerology-name-value]").value, "TARO SATO");
snapshot.numerologyNameInputs.subject.current.romanName = '<script>bad</script>';
vm.runInContext("mountNumerologyNameForm(form,onUpdate)", formContext);
assert.doesNotMatch(form.innerHTML, /<script>/);
console.log("Numerology names: separate birth/current values, confirmation/identity invalidation, selected-name projection, real snapshot/update/restore/reset handlers verified.");
