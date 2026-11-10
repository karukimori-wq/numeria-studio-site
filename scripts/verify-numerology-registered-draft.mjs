import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import * as ui from "react/jsx-runtime";
import { NUMEROLOGY_COPY_DATA } from "../src/numerology-copy-data.js";
import { createNumerologySnapshot } from "../src/numerology-copy-calculation.js";
import { selectNumerologyCopies, assembleNumerologyPageDraft, pageCopyContext } from "../src/numerology-page-copy.js";
import { buildNumerologyRegisteredDraft, withNumerologyRegisteredSelection } from "../src/numerology-registered-draft.js";
import { normalizeNumerologyNameInputs, updateNumerologyNameInputs } from "../src/numerology-name-input.js";
import { renderNumerologyFigure } from "../src/numerology-figure-renderer.js";
import { numerologyA4Units, planNumerologyA4 } from "../src/numerology-a4.js";
import { requestNumerologyRegisteredPreview, renderNumerologyRegisteredPreview, numerologyRegisteredReadingInput } from "../src/numerology-registered-preview.js";
import secureWorker from "../src/secure-worker-entry.js";

assert.equal(NUMEROLOGY_COPY_DATA.records.length, 210);
assert.equal(new Set(NUMEROLOGY_COPY_DATA.records.map(record => record.copyId)).size, 210);
assert.ok(NUMEROLOGY_COPY_DATA.records.every(record => record.reviewStatus === "draft" && record.releaseEnabled === false && record.body && record.short));
const cases = JSON.parse(readFileSync("test-fixtures/numerology-recovered-copy-cases.json", "utf8"));
for (const test of cases) {
  const records = structuredClone(NUMEROLOGY_COPY_DATA.records);
  if (test.id === "NSL-15") records.splice(records.findIndex(record => record.copyId === "num.year.5.meaning"), 1);
  if (test.id === "NSL-16") records.push(structuredClone(records.find(record => record.copyId === "num.number.33.basic")));
  if (test.id === "NSL-17") records.forEach(record => { record.copyVersion = "wrong"; });
  const calculate = input => {
    const result = createNumerologySnapshot({ ...input, romanNameConfirmed: true }).results;
    if (test.id === "NSL-18") result.birthdayNumber.value = 33;
    if (test.id === "NSL-19") { result.personalYear.value = 8; result.personalMonth.value = 8; }
    if (test.id === "NSL-20") result.mostFrequentDigits.value = [];
    if (test.id === "NSL-21") result.personalYearSequence.value.pop();
    return result;
  };
  const selected = selectNumerologyCopies(test.input, calculate, records, NUMEROLOGY_COPY_DATA.manifest);
  // Retain the old oracle unchanged. Two explicitly documented policy changes:
  // current calculator rejects an invalid birthday as a whole; Feb29 is now March1.
  const comparable = page => !(test.id === "NSL-07" || test.id === "NSL-11" && page.pageId === "NUM-13");
  const issueCodes = issues => issues.map(issue => { const { reason, ...details } = issue; return issue.code === "missing_input" ? details : issue; });
  const actual = selected.pages.filter(comparable).map(page => ({ pageId: page.pageId, state: page.state, frameCount: page.frames.length, issues: issueCodes(page.issues) }));
  const expected = test.expectedPages.filter(comparable).map(page => ({ ...page, issues: issueCodes(page.issues) }));
  assert.deepEqual(actual, expected, test.id);
  if (test.id === "NSL-07") assert.ok(selected.pages.every(page => page.state === "unavailable"));
  if (test.id === "NSL-11") assert.equal(selected.pages[12].frames[0].labels[1].startInclusive, "2030-03-01");
}

const reading = { id: "registered-test", divination: "numerology", name: "架空A", birthName: "TARO YAMADA", birthday: "2009-11-11", visitDate: "2026-10-19", includeCompatibility: true, partnerName: "架空B", partnerBirthName: "HANAKO SATO", partnerBirthday: "1990-01-01", numerologyRegisteredPagesEnabled: true, numerologyFamilyInput: { context: "parent-child", parentDirection: "b-parent" } };
reading.numerologyNameInputs = normalizeNumerologyNameInputs(null);
for (const [role, romanName] of [["subject", "TARO YAMADA"], ["partner", "HANAKO SATO"]]) for (const change of [{ operation: "edit", romanName }, { operation: "confirm" }]) reading.numerologyNameInputs = updateNumerologyNameInputs(reading.numerologyNameInputs, { role, ...change }, reading).value;
const draft = await buildNumerologyRegisteredDraft(reading, "pro");
assert.equal(draft.pages.reduce((sum, page) => sum + page.frames.length, 0), 44);
assert.equal(draft.pages.flatMap(page => page.frames.flatMap(frame => frame.segments)).length, 97);
const figures = draft.pages.flatMap(page => page.figures);
assert.equal(figures.length, 16);
assert.ok(figures.every(figure => figure.state === "ready"));
assert.equal(draft.pages[6].title, "あなたの数秘マップ");
assert.equal(draft.officialAllowed, false);
assert.equal(draft.subjects.a.snapshot.results.lifePath.value, 33);
assert.ok(draft.pages[12].frames[1].segments.every(segment => segment.periodRef === null));
for (const figure of figures) {
  for (const binding of figure.resultBindings) {
    const subject = Object.values(draft.subjects).find(person => person.subjectRef === binding.subjectRef);
    assert.equal(binding.resultRevision, subject.resultRevision);
    assert.deepEqual(binding.value, subject.snapshot.results[binding.valueResultRef.slice(4)].value);
  }
  const html = renderToStaticMarkup(renderNumerologyFigure(ui, figure));
  assert.ok(html.includes("nn-figure"));
}
for (const page of draft.pages) {
  const units = numerologyA4Units(page, draft), measures = Object.fromEntries([...units.figures, ...units.text].map(unit => [unit.id, { full: 40, column: 55, "full-heading": 50, "column-heading": 65 }]));
  for (const layout of ["standard", "magazine"]) {
    const plan = planNumerologyA4(units, measures, 350, layout);
    assert.equal(plan.errors.length, 0);
    assert.deepEqual(plan.pages.flatMap(sheet => sheet.columns.flat().map(unit => unit.id)), units.text.map(unit => unit.id));
  }
}
const firstFigure = draft.pages[0].figures[0], units = numerologyA4Units(draft.pages[0], draft);
assert.ok(planNumerologyA4(units, {}, 350, "standard").errors.length);
assert.ok(planNumerologyA4({ figures: [{ id: firstFigure.figureId, kind: "figure", figure: firstFigure }], text: [] }, { [firstFigure.figureId]: { full: 999 } }, 350, "standard").errors.length);
const free = await buildNumerologyRegisteredDraft(reading, "free");
assert.deepEqual(free.pages.filter(page => page.state === "preview_ready").map(page => page.pageId), ["NUM-01", "NUM-02", "NUM-03", "NUM-06"]);
assert.ok(free.pages.filter(page => page.state === "plan_required").every(page => !page.frames.length && !page.figures.length));
const forged = structuredClone(reading); forged.numerologyRegisteredDraft = { officialAllowed: true }; forged.numerologyRegisteredSelection = { officialAllowed: true };
const saved = await withNumerologyRegisteredSelection(forged, "pro");
assert.equal(saved.numerologyRegisteredSelection.officialAllowed, false);
assert.equal("numerologyRegisteredDraft" in saved, false);
assert.ok(saved.numerologyRegisteredSelection.pages[0].frames[0].segments[0].resultBindings.length);
assert.equal('text' in saved.numerologyRegisteredSelection.pages[0].frames[0].segments[0], false);
assert.deepEqual(await withNumerologyRegisteredSelection({ ...reading, numerologyRegisteredPagesEnabled: false }, "pro"), { ...reading, numerologyRegisteredPagesEnabled: false });
const changed = await buildNumerologyRegisteredDraft({ ...reading, visitDate: "2027-01-01" }, "pro");
assert.notEqual(changed.subjects.a.resultRevision, draft.subjects.a.resultRevision);
const noName = await buildNumerologyRegisteredDraft({ ...reading, numerologyNameInputs: null }, "pro");
assert.equal(noName.pages[0].state, "unavailable"); assert.equal(noName.pages[5].state, "preview_ready");
const noDirection = await buildNumerologyRegisteredDraft({ ...reading, numerologyFamilyInput: { context: "parent-child" } }, "pro");
assert.equal(noDirection.pages[11].state, "unavailable"); assert.equal(noDirection.pages[7].state, "preview_ready");
const context = pageCopyContext({ sessionRef: reading.id, subjectA: draft.subjects.a.subjectRef, subjectB: draft.subjects.b.subjectRef, snapshotA: draft.subjects.a.snapshot, snapshotB: draft.subjects.b.snapshot });
context.personA.snapshot.results.lifePath.value = 1;
assert.equal((await assembleNumerologyPageDraft(context)).issues[0].code, "result_snapshot_mismatch");

let current = reading;
const fetcher = async () => new Response(JSON.stringify({ status: "success", planId: "pro", draft }));
assert.equal((await requestNumerologyRegisteredPreview({ snapshot: reading, getCurrentSnapshot: () => current, fetcher })).ok, true);
const states = [{ inputKey: JSON.stringify(numerologyRegisteredReadingInput(reading)), planId: "pro", draft }, "確認済み", false, "NUM-01", "reading", "standard", 0];
const hooks = { useState: () => [states.shift(), () => {}], useRef: value => ({ current: value }), useEffect: () => {} };
const rendered = renderToStaticMarkup(renderNumerologyRegisteredPreview(hooks, ui, { api: { getReadingSnapshot: () => reading }, fetcher, mountNameForm: () => {} }));
assert.ok(rendered.includes(draft.pages[0].frames[0].segments[0].text));
assert.ok(rendered.includes("nn-figure")); assert.ok(rendered.includes("NUM-14"));
assert.equal((await requestNumerologyRegisteredPreview({ snapshot: reading, getCurrentSnapshot: () => current, fetcher: async () => { current = { ...reading, birthday: "2000-01-01" }; return fetcher(); } })).ok, false);
assert.equal((await secureWorker.fetch(new Request("https://fixture.test/api/numerology/page-draft", { method: "POST", headers: { "X-User-Id": "spoof", "X-Admin-Email": "illusionddt@gmail.com" }, body: JSON.stringify({ snapshot: reading, planId: "pro" }) }), { AUTH_ENFORCEMENT_MODE: "observe" }, {})).status, 401);

// Real JWT verification and real Worker plan/save/read routes; no live account.
const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "registered-key", alg: "RS256" };
const head = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url"), payload = Buffer.from(JSON.stringify({ iss: "https://registered.fixture.test", sub: "registered-user", exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${head}.${payload}`));
const token = `${head}.${payload}.${Buffer.from(signature).toString("base64url")}`, originalFetch = globalThis.fetch;
globalThis.fetch = async url => { assert.equal(String(url), "https://registered.fixture.test/jwks"); return new Response(JSON.stringify({ keys: [jwk] })); };
try {
  const env = { AUTH_ENFORCEMENT_MODE: "enforce", CLERK_JWKS_URL: "https://registered.fixture.test/jwks", CLERK_JWT_ISSUER: "https://registered.fixture.test", NUMERIA_ENABLE_MVP_PLAN_SWITCHING: "1" };
  const call = async (path, method = "POST", body = {}) => {
    const response = await secureWorker.fetch(new Request(`https://fixture.test${path}`, { method, headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": "registered-ws", "X-User-Id": "spoof-user", "Content-Type": "application/json" }, ...(method === "GET" ? {} : { body: JSON.stringify(body) }) }), env, {});
    return { status: response.status, data: await response.json() };
  };
  let response = await call("/api/numerology/page-draft", "POST", { snapshot: reading, planId: "pro" });
  assert.equal(response.status, 200); assert.equal(response.data.planId, "free");
  assert.equal(response.data.draft.pages.filter(page => page.state === "preview_ready").length, 4);
  assert.equal((await call("/api/billing/subscription", "PATCH", { planId: "pro" })).status, 200);
  response = await call("/api/numerology/page-draft", "POST", { snapshot: forged });
  assert.equal(response.status, 200); assert.equal(response.data.draft.pages[0].frames[0].labels[0].value, 33);
  assert.equal(response.data.draft.pages.filter(page => page.state === "preview_ready").length, 14);
  response = await call("/api/appraisals/save-draft", "POST", { appraisalId: reading.id, snapshot: forged });
  assert.equal(response.status, 201); assert.equal(response.data.activeDraft.snapshot.numerologyRegisteredSelection.officialAllowed, false);
  response = await call(`/api/appraisals/${reading.id}`, "GET");
  assert.equal(response.status, 200); assert.equal(response.data.session.snapshot.numerologyRegisteredSelection.pages.length, 14);
  assert.equal('text' in response.data.session.snapshot.numerologyRegisteredSelection.pages[0].frames[0].segments[0], false);
  assert.equal((await call("/api/billing/subscription", "PATCH", { planId: "free" })).status, 200);
  response = await call("/api/numerology/page-draft", "POST", { snapshot: forged, planId: "pro" });
  assert.equal(response.data.planId, "free"); assert.equal(response.data.draft.pages[6].frames.length, 0);
} finally { globalThis.fetch = originalFetch; }

const directory = mkdtempSync(join(tmpdir(), "numeria-registered-patch-"));
try {
  mkdirSync(join(directory, "dist/assets"), { recursive: true }); mkdirSync(join(directory, "src"));
  copyFileSync("assets/numeria-app-Cckhajir.js", join(directory, "dist/assets/numeria-app-Cckhajir.js"));
  for (const name of ["numerology-a4.js", "numerology-figure-renderer.js", "numerology-registered-preview.js"]) copyFileSync(`src/${name}`, join(directory, "src", name));
  for (const name of ["patch-navigation-bridge.mjs", "patch-numerology-name-input.mjs", "patch-numerology-registered-preview.mjs"]) {
    const result = spawnSync(process.execPath, [join(process.cwd(), "scripts", name)], { cwd: directory, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
  }
  const bundle = readFileSync(join(directory, "dist/assets/numeria-app-Cckhajir.js"), "utf8");
  const checked = spawnSync(process.execPath, ["--input-type=module", "--check"], { input: bundle, encoding: "utf8" }); assert.equal(checked.status, 0, checked.stderr.slice(-1000));
  assert.ok(!bundle.includes(NUMEROLOGY_COPY_DATA.records[0].body), "registry must remain server-only");
  assert.match(bundle, /jsx\)\(NumeriaRegisteredNumerologyPreview,\{\}\)/);
  const start = bundle.indexOf('updateNumerologyRegisteredPages:function(change)'), end = bundle.indexOf(',updateNumerologyNames:', start);
  const context = { l: "numerology", numeriaRegisteredInputRef: { current: { enabled: false, family: {} } }, window: { dispatchEvent() {} }, CustomEvent: class { constructor(name) { this.type = name; } } };
  vm.createContext(context);
  vm.runInContext(`var bridge={${bundle.slice(start,end)}};bridge.updateNumerologyRegisteredPages({enabled:true,family:{context:"parent-child",parentDirection:"b-parent"}})`, context);
  assert.equal(context.numeriaRegisteredInputRef.current.enabled, true); assert.equal(context.numeriaRegisteredInputRef.current.family.parentDirection, "b-parent");
  context.l = "tarot"; assert.equal(vm.runInContext('bridge.updateNumerologyRegisteredPages({enabled:false}).ok', context), false);
  assert.equal(context.numeriaRegisteredInputRef.current.enabled, true);
  assert.match(bundle, /numerologyRegisteredPagesEnabled:numeriaRegisteredInputRef.current.enabled===true/);
  assert.match(bundle, /family:n.numerologyFamilyInput/);
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Recovered numerology: 210 pinned drafts, 21 selector oracles with two explicit policy changes, 14 pages/44 frames/97 segments/16 figures, measured-layout planning, input/result binding and Free/Pro preview guards verified. Live browser/A4 measurement is pending.");
