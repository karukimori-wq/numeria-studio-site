import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const patch=readFileSync("scripts/patch-reading-draft-persistence.mjs","utf8");
for(const token of ['saveEvent("saving")','saveEvent("error")','saveEvent("saved")',"numeria-reading-draft-save-status",'aria-live',"document.head.appendChild(style)"]){assert.ok(patch.includes(token), "Draft save feedback must contain "+token)}
assert.ok(patch.includes('saveEvent("saved") + ";" + successAnchor'),"Saved status is only inserted at the success anchor");
assert.ok(patch.includes('saveEvent("error")'),"Failure state comes from the failed response branch");
console.log("Reading draft save status guards passed.");
