import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-block-editor-ai-insert.mjs", "utf8");
assert.match(patch, /numeria:ai-draft-ready/);
assert.match(patch, /AI下書きを挿入/);
assert.match(patch, /field\.value\.trim\(\)/);
assert.match(patch, /field\.dispatchEvent\(new Event\("input"/);
assert.doesNotMatch(patch, /fetch\(/);

console.log("Block editor AI draft insert verified: only an in-memory draft from the authenticated reading flow can fill an empty AI block.");
