import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

// Apply the actual production patch scripts in memory, then execute the two
// generated save handlers. This runs before build and requires no React or D1.
let bundle = readFileSync("assets/numeria-app-Cckhajir.js", "utf8");
for (const path of ["scripts/patch-legacy-static-assets.mjs", "scripts/patch-reading-draft-persistence.mjs"]) {
  const patch = readFileSync(path, "utf8").replace(/^import .*;\n/, "");
  vm.runInNewContext(patch, {
    readFileSync() { return bundle; },
    writeFileSync(_path, value) { bundle = value; },
    console: { log() {} },
  }, { filename: path });
}

class CustomEvent {
  constructor(type, options) { this.type = type; this.detail = options.detail; }
}
for (const [start, end] of [["Ci=async()=>{", ",wi=()=>"], ["Ii=async()=>{", ",Y=(e,t)=>"]]) {
  const offset = bundle.indexOf(start);
  assert.ok(offset >= 0);
  const handler = bundle.slice(offset + 3, bundle.indexOf(end, offset));
  for (const outcome of ["success", "offline", "conflict", "server-error", "malformed-ack"]) {
    const events = [];
    let requestBody;
    let finish;
    let historyWrites = 0;
    let body = "保存開始時の本文";
    const context = {
      CustomEvent,
      G: { id: "client_fixture", name: "架空 花子", birthday: "1990-01-02" },
      j: "架空 花子", M: "1990-01-02", ae: "", P: "相談", Tr: [], Re: [], K: null,
      wr: null, W: { name: "数秘", defaultMenuName: "数秘" }, kr: "", Pe: "本文", l: "numerology",
      be: "2026-10-24", Se: "", we: 0, Dn: "session_fixture", zt: "client_fixture", lt: "", dt: "",
      Pi: () => ({ template: "fixture" }),
      Fi: id => ({ id, name: "架空 花子", birthday: "1990-01-02", theme: "相談", divination: "numerology", message: body, reportTypography: { bodySize: 12 }, drafts: { result: 7 } }),
      f() { historyWrites++; }, B() {}, R() {}, k() {}, Bt() {}, V() {},
      window: {
        dispatchEvent(event) { events.push(event.detail); }, setTimeout() {},
        NumeriaDraftVersions: new Map([["session_fixture", "version_before"]]),
        NumeriaAuthenticatedFetch: async (_url, init) => {
          requestBody = JSON.parse(init.body);
          await new Promise(resolve => { finish = resolve; });
          if (outcome === "offline") throw new Error("offline");
          return { ok: ["success", "malformed-ack"].includes(outcome), json: async () => { if (outcome === "malformed-ack") throw new Error("Invalid JSON"); return ({ status: outcome === "success" ? "success" : "error", message: outcome, draftId: requestBody.appraisalId, activeDraft: { draftVersion: "version_after" } }); } };
        },
      },
    };
    const save = vm.runInNewContext(`(${handler})`, context);
    const pending = save();
    assert.deepEqual(events.map(event => event.state), ["saving"]);
    assert.equal(historyWrites, 0, "Local history must not be marked saved before ACK.");
    assert.equal(requestBody.snapshot.message, body, "Both save entry points must send the complete snapshot.");
    assert.equal(requestBody.birthDate, "1990-01-02");
    assert.equal(requestBody.divination, "numerology");
    assert.equal(requestBody.snapshot.reportTypography.bodySize, 12);
    body = "保存中に追記した本文";
    finish();
    await pending;
    assert.deepEqual(events.map(event => event.state), ["saving", outcome === "success" ? "saved" : "error"]);
    assert.equal(historyWrites, outcome === "success" ? 1 : 0);
    assert.equal(body, "保存中に追記した本文", "Save failure/ACK must retain the current editor text.");
    if (start.startsWith("Ii")) {
      assert.equal(requestBody.expectedDraftVersion, "version_before");
      assert.equal(context.window.NumeriaDraftVersions.get("session_fixture"), outcome === "success" ? "version_after" : "version_before");
      if (outcome === "success") assert.equal(events.at(-1).sessionId, "session_fixture");
    }
  }
}
console.log("Production save handlers executed: both full snapshots, delayed ACK, offline, conflict, server error, and editor retention (10 fixture cases).");

const nodes = new Map();
let statusListener, restoredListener;
const document = {
  readyState: "complete",
  getElementById(id) { return nodes.get(id); },
  createElement() { return { dataset: {}, setAttribute() {} }; },
  head: { appendChild(node) { nodes.set(node.id, node); } },
  body: { appendChild(node) { nodes.set(node.id, node); } },
};
const uiWindow = {
  addEventListener(type, listener) { if(type === "numeria-session-restored") restoredListener = listener; else statusListener = listener; },
  NumeriaNavigation: { getReadingSnapshot() { return { message: "保存中に追記" }; } },
};
const runtimeStart = bundle.lastIndexOf(';(()=>{if(window.__NumeriaDraftSaveStatusV1');
assert.ok(runtimeStart > 0);
vm.runInNewContext(bundle.slice(runtimeStart), { window: uiWindow, document });
restoredListener({ detail: { session: { id: "fixture", draftVersion: "restored-version" } } });
assert.equal(uiWindow.NumeriaDraftVersions.get("fixture"), "restored-version");
statusListener({ detail: { state: "saved", sessionId: "fixture", snapshot: { message: "保存前" } } });
assert.equal(nodes.get("numeria-draft-save-status").dataset.state, "dirty", "An ACK for an older snapshot must not claim all current text is saved.");
statusListener({ detail: { state: "saved", sessionId: "fixture", snapshot: { message: "保存中に追記" } } });
assert.equal(nodes.get("numeria-draft-save-status").dataset.state, "saved");
console.log("Save feedback distinguishes an older ACK from the current editor snapshot.");
