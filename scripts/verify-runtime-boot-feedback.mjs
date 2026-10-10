import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const directory = mkdtempSync(join(tmpdir(), "numeria-boot-feedback-"));
try {
  mkdirSync(join(directory, "dist"));
  writeFileSync(join(directory, "dist/original.html"), "<html><head></head><body></body></html>");
  execFileSync(process.execPath, [resolve("scripts/patch-runtime-boot-diagnostics.mjs")], { cwd: directory });
  const html = readFileSync(join(directory, "dist/original.html"), "utf8");
  const script = html.match(/<script id="numeria-runtime-boot-diagnostics">([\s\S]*?)<\/script>/)[1];
  function scenario() {
    let now = 0, mounted = false, reloads = 0;
    const elements = new Map(), timers = [], intervals = [], listeners = new Map();
    const retry = { addEventListener(name, callback) { listeners.set("retry:" + name, callback); } };
    const document = {
      body: { innerText: "", appendChild(element) { elements.set(element.id, element); } },
      getElementById(id) {
        if (id === "numeria-runtime-boot-retry" && elements.get("numeria-runtime-boot-failure")?.innerHTML.includes(id)) return retry;
        return elements.get(id);
      },
      createElement() { return { setAttribute() {}, style: {}, remove() { elements.delete(this.id); } }; },
      querySelector(selector) { return mounted && selector.includes(".app-shell") ? {} : null; },
      querySelectorAll() { return []; }
    };
    const window = { addEventListener(name, callback) { listeners.set(name, callback); }, location: { reload() { reloads++; } } };
    class Clock extends Date { static now() { return now; } }
    runInNewContext(script, {
      window, document, Date: Clock,
      performance: { getEntriesByType() { return []; } },
      setTimeout(callback, delay) { timers.push({ callback, delay }); },
      setInterval(callback) { intervals.push(callback); return 1; }, clearInterval() {}
    });
    return {
      state: window.NumeriaRuntimeBootDiagnostics,
      showAt(time) { now = time; timers.find(t => t.delay === time && t.callback.name === "show").callback(); },
      feedback() { return elements.get("numeria-runtime-boot-failure")?.innerHTML || ""; },
      mount() { mounted = true; intervals.forEach(callback => callback()); },
      retry() { listeners.get("retry:click")(); return reloads; }
    };
  }
  const slow = scenario();
  slow.showAt(5000);
  assert.match(slow.feedback(), /読み込み中です/);
  assert.doesNotMatch(slow.feedback(), /起動を確認できません|Navigation=|runtime resources=|<code/);
  slow.mount();
  assert.equal(slow.feedback(), "", "A usable app removes loading feedback even without a navigation event");
  slow.showAt(10000);
  assert.equal(slow.feedback(), "", "Later timers do not restore an overlay over the app");

  const timeout = scenario();
  timeout.showAt(30000);
  assert.match(timeout.feedback(), /読み込みに時間がかかっています/);
  assert.match(timeout.feedback(), /<details[^>]*><summary>詳しい情報/);
  assert.doesNotMatch(timeout.feedback(), /<details[^>]*\bopen\b/);
  assert.equal(timeout.retry(), 1);
  timeout.mount();
  assert.equal(timeout.feedback(), "", "Late success removes timeout feedback");

  const failed = scenario();
  failed.state.recovery = "failed";
  failed.showAt(5000);
  assert.match(failed.feedback(), /読み込み中です/, "One failed fallback must not report total startup failure");
  failed.state.directMount = "failed";
  failed.showAt(10000);
  assert.match(failed.feedback(), /アプリを読み込めませんでした/);
  console.log("Boot feedback verified: loading before completion, removal on mount, timeout retry, and collapsed diagnostics.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
