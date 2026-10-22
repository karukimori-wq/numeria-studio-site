import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const patch=readFileSync("scripts/patch-reading-draft-persistence.mjs","utf8");
for(const token of ['saveEvent("saving")','saveEvent("error")','saveEvent("saved")',"numeria-reading-draft-save-status",'aria-live',"document.head.appendChild(style)"]){assert.ok(patch.includes(token), "Draft save feedback must contain "+token)}
assert.ok(patch.includes('replaceAllExactly(savingAnchor, saveEvent("saving")'),"Both draft entry points publish saving state");
assert.ok(patch.includes('replaceExactly(profileSuccessAnchor, saveEvent("saved")'),"Profile saved status follows the successful response");
assert.ok(patch.includes('replaceExactly(readingSuccessAnchor, saveEvent("saved")'),"Reading saved status follows the successful response");
assert.ok(patch.includes('replaceExactly(profileFailureAnchor, "if(!a.ok){" + saveEvent("error")'),"Profile failure publishes error state");
assert.ok(patch.includes('replaceExactly(readingFailureAnchor, "if(!a.ok){" + saveEvent("error")'),"Reading failure publishes error state");
assert.ok(!patch.includes("Draft save status not attached"),"A changed generated bundle must fail the build instead of silently omitting feedback");
console.log("Reading draft save status guards passed.");
