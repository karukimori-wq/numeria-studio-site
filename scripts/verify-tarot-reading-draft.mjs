import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { createTarotReadingSnapshot, restoreTarotEditor, tarotSelectionKey, saveTarotReadingDraft, tarotDraftCalculationMessage } from "../src/tarot-reading-draft.js";
import { TAROT_CARD_IDS, TAROT_SPREAD_POSITIONS } from "../src/tarot-calculator.js";

const customer = { id: "client-1", name: "テスト", birthday: "2000-01-01" };
const editor = { spreadId: "three-time", selections: [1, 17, 21].map((cardIndex, index) => ({ cardIndex, reversed: index === 1, text: `本文${index}` })), deckSize: 22, reversalsEnabled: true, referenceDate: "2026-11-10", question: "仕事について", situation: "現状", advice: "助言", action: "行動", overall: "まとめ", artDeck: "rider-waite", price: 5500, theme: "", optionA: "", optionB: "", partnerRef: "", confirmationKey: "" };
const snapshot = current => createTarotReadingSnapshot({ id: "tarot-test", customer, editor: current });
assert.equal(snapshot(editor).tarotCalculation.code, "CARD_SELECTION_CONFIRMATION_REQUIRED");
editor.confirmationKey = tarotSelectionKey(customer, editor);
const confirmed = snapshot(editor);
assert.equal(confirmed.tarotCalculation.status, "calculated");
assert.deepEqual(confirmed.tarotCalculation.cards.map(card => card.cardId), ["I", "XVII", "XXI"]);
assert.equal(confirmed.tarotCalculation.verificationState, "review-required");
assert.equal("pageAvailability" in confirmed.tarotCalculation, false);
const restored = restoreTarotEditor(JSON.parse(JSON.stringify(confirmed)));
assert.deepEqual(restored, editor);
assert.deepEqual(snapshot(restored), confirmed);
for (const change of [{ referenceDate: "2026-11-11" }, { deckSize: 78 }, { question: "別の相談" }, { spreadId: "one-oracle" }, { reversalsEnabled: false }, { selections: [...editor.selections].reverse() }]) assert.equal(snapshot({ ...editor, ...change }).tarotCalculation.source.selectionConfirmed, false);
assert.equal(createTarotReadingSnapshot({ id: "other", customer: { ...customer, id: "other" }, editor }).tarotCalculation.source.selectionConfirmed, false);
assert.equal(restoreTarotEditor({ ...confirmed, tarotDraftVersion: "future" }), null);
const duplicate = { ...editor, selections: editor.selections.map(card => ({ ...card, cardIndex: 1 })) };
duplicate.confirmationKey = tarotSelectionKey(customer, duplicate);
assert.equal(snapshot(duplicate).tarotCalculation.code, "DUPLICATE_CARD");
const calls = [];
const save = (input, response, status = 200) => saveTarotReadingDraft({ snapshot: input, expectedDraftVersion: 3, fetcher: async (url, options) => { calls.push({ url, ...options }); return { ok: status < 400, status, json: async () => response }; } });
const forged = structuredClone(confirmed); forged.tarotCalculation.cards = [];
const result = await save(forged, { status: "success", draftId: confirmed.id, activeDraft: { draftVersion: 4 } });
assert.equal(result.ok, true); assert.equal(result.draftVersion, 4);
assert.deepEqual(result.snapshot.tarotCalculation.cards, confirmed.tarotCalculation.cards);
assert.equal(JSON.parse(calls[0].body).expectedDraftVersion, 3);
assert.equal(JSON.parse(calls[0].body).snapshot.tarotEditor.selections[1].text, "本文1");
assert.equal((await save(confirmed, { status: "success", draftId: "another" })).ok, false);
assert.equal((await save(confirmed, { status: "error" }, 409)).ok, false);
assert.equal((await saveTarotReadingDraft({ snapshot: confirmed, fetcher: async () => { throw Error("offline"); } })).ok, false);

// Exercise actual production patch anchors and execute its async save closure.
const directory = mkdtempSync(join(tmpdir(), "numeria-tarot-draft-"));
try {
  mkdirSync(join(directory, "dist/assets"), { recursive: true });
  copyFileSync("assets/numeria-app-Cckhajir.js", join(directory, "dist/assets/numeria-app-Cckhajir.js"));
  for (const patch of ["patch-navigation-bridge.mjs", "patch-numerology-name-input.mjs", "patch-tarot-reading-draft.mjs"]) {
    const run = spawnSync(process.execPath, [join(process.cwd(), "scripts", patch)], { cwd: directory, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
  }
  const bundle = readFileSync(join(directory, "dist/assets/numeria-app-Cckhajir.js"), "utf8");
  const syntax = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: bundle, encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr.slice(-1500));
  const start = bundle.indexOf("getTarotEditor=()=>"), end = bundle.indexOf(",_e=async", start);
  assert.ok(start > 0 && end > start);
  const saved = [], messages = [], versions = new Map();
  const context = { structuredClone, createTarotReadingSnapshot, saveTarotReadingDraft, tarotId: { current: confirmed.id }, tarotSaving: { current: false }, tarotOptions: { ...editor }, y: editor.spreadId, ae: editor.selections, te: editor.referenceDate, S: editor.question, D: editor.situation, O: editor.advice, A: editor.action, j: editor.overall, b: editor.artDeck, T: editor.price, N: customer, ue: { name: "3カード" }, se: message => messages.push(message), h: data => saved.push(data), window: { NumeriaDraftVersions: versions, NumeriaAuthenticatedFetch: async () => ({ ok: true, status: 200, json: async () => ({ status: "success", draftId: confirmed.id, activeDraft: { draftVersion: 5 } }) }) } };
  vm.createContext(context);
  vm.runInContext(`var ${bundle.slice(start, end)};`, context);
  assert.equal(await vm.runInContext("ge()", context), true);
  assert.equal(saved.length, 1); assert.equal(saved[0].id, confirmed.id); assert.equal(saved[0].snapshot.tarotCalculation.status, "calculated"); assert.equal(versions.get(confirmed.id), 5);
  context.window.NumeriaAuthenticatedFetch = async () => ({ ok: false, status: 500, json: async () => ({ status: "error" }) });
  assert.equal(await vm.runInContext("ge()", context), false);
  assert.equal(saved.length, 1, "failure must not create local history or delivery success");
  assert.match(bundle, /snapshot:e.snapshot/);
  assert.match(bundle, /history.filter\(item=>item.id!==e.id\)/);
  assert.match(bundle, /if\(n.divination===`tarot`\).*?numeriaTarotResumeRef.current=structuredClone\(n\)/);
  assert.match(bundle, /restored\?\.selections/);
  assert.match(bundle, /この配置・カード・向きを確認した/);
  // Render the real patched React component with inert JSX nodes: this verifies
  // hooks restore the saved state and the new controls reach the rendered tree.
  const renderedStates = [], refs = [];
  const ui = { ...context, crypto: { randomUUID: () => "new-test" }, restoreTarotEditor, tarotSelectionKey, tarotDraftCalculationMessage,
    i: { useState: initial => { renderedStates.push(initial); return [initial, () => {}]; }, useRef: value => { const ref = { current: value }; refs.push(ref); return ref; } },
    Z: { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    Bo: Object.entries(TAROT_SPREAD_POSITIONS).map(([id, positions]) => ({ id, name: id, positions, layout: [] })),
    No: [{ id: "rider-waite", name: "絵柄" }], Q: [{ id: "template", name: "書式" }], zo: [{ id: "rider-waite" }],
    Ro: TAROT_CARD_IDS.map(id => [id, id, "", "", ""]), Po: TAROT_CARD_IDS.slice(0, 22).map(id => [id, id]), Fo: [], Lo: [],
    zs: "spread", ks: "card", Rs: "dictionary", Vs: "report", ds: "pages", props: { resumeSnapshot: confirmed, appraisalProfiles: [customer], selectedCustomerId: customer.id, template: "rider-waite", reportTemplate: "template", deck: "rider-waite", customColors: {}, onSaved: () => {} } };
  vm.createContext(ui);
  const componentStart = bundle.indexOf("function Bs("), componentEnd = bundle.indexOf("function Vs(", componentStart);
  const tree = vm.runInContext(`${bundle.slice(componentStart, componentEnd)};Bs(props)`, ui);
  assert.ok(renderedStates.some(value => value === editor.question));
  assert.ok(renderedStates.some(value => Array.isArray(value) && value[1]?.text === "本文1"));
  const serializedTree = JSON.stringify(tree);
  assert.ok(serializedTree.includes("この配置・カード・向きを確認した"));
  assert.ok(serializedTree.includes("problem-solving-three"));
  assert.ok(serializedTree.includes("three-months"));
  assert.ok(serializedTree.includes("鑑定の下書きを保存"));
  assert.ok(serializedTree.includes("計算済みの下書き"));
} finally { rmSync(directory, { recursive: true, force: true }); }
console.log("Tarot drafts: actual production save closure, authenticated ACK/version checks, recomputation, confirmation scope, full card/text roundtrip and restore anchors verified; browser UI unverified.");
