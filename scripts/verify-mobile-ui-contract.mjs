import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const restoreSource = readFileSync("scripts/restore-original-site.mjs", "utf8");
const patchSource = readFileSync("scripts/patch-mobile-ui-contract.mjs", "utf8");

// Japanese/roman-name input fix must remain composition-aware.
assert.match(restoreSource, /function installRomanInputFix\(\)/);
assert.match(restoreSource, /event\.isComposing/);
assert.match(restoreSource, /beforeinput/);
assert.match(restoreSource, /numeriaRomanRaw/);

// The legacy PDF quickbar may still exist in the source backup, but Production build must remove it.
assert.match(patchSource, /Expected mobile PDF quickbar generator was not found/);
assert.match(patchSource, /Unused mobile PDF quickbar generator remains after patch/);
assert.match(patchSource, /html\.includes\("function ensureMobileReportQuickbar\(\)\{"\)/);

// The removed draft-save instruction must not be injected back into the appraisal screen.
assert.doesNotMatch(restoreSource, /途中保存は画面上部または下部/);
assert.doesNotMatch(restoreSource, /reading-save-helper/);

// Fixed mobile navigation must never cover save/report/settings actions.
assert.match(patchSource, /padding-bottom:calc\(168px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(patchSource, /scroll-margin-bottom:176px/);
assert.match(patchSource, /\.save-draft-button/);
assert.match(patchSource, /\.settings-header>div:last-child button/);

console.log("Mobile UI safety contract verified.");
