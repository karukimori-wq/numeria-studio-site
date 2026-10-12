import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const patch=readFileSync("scripts/patch-reading-draft-persistence.mjs","utf8");
for(const token of ['saveEvent("saving")','saveEvent("error")','saveEvent("saved")',"numeria-reading-draft-save-status",'aria-live',"document.head.appendChild(style)"]){assert.ok(patch.includes(token), "Draft save feedback must contain "+token)}
assert.match(patch,/only mark saved after success/);
assert.match(patch,/only mark network save as failed after response/);
console.log("Reading draft save status guards passed.");
