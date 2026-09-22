import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patchSource = readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8");
const legacySource = readFileSync("assets/numeria-app-Cckhajir.js", "utf8");
const planSource = readFileSync("src/plan-config.js", "utf8");
const workerSource = readFileSync("src/worker.js", "utf8");

assert.match(planSource, /monthlyAppraisals:\s*20/);
assert.match(planSource, /appraisalClients:\s*3/);
assert.match(planSource, /inProgressAppraisals:\s*1/);
assert.match(planSource, /viewableCompletedAppraisals:\s*3/);

assert.match(workerSource, /create_appraisal_client/);
assert.match(workerSource, /save_in_progress_appraisal/);
assert.match(workerSource, /complete_appraisal/);
assert.match(workerSource, /lockedCompletedAppraisalIds/);

assert.match(patchSource, /NumeriaAuthenticatedFetch/);
assert.match(patchSource, /\/api\/appraisal-clients/);
assert.match(patchSource, /\/api\/appraisals\/complete/);
assert.match(patchSource, /\/api\/appraisals\/status/);
assert.match(patchSource, /Freeでは鑑定対象者は3名までです/);
assert.match(patchSource, /Freeでは最新3件まで詳細を表示できます/);
assert.match(patchSource, /tr===`admin`\?\{ok:!0,data:\{status:`admin-preview`\}\}/);
assert.match(patchSource, /tr===`admin`\)return!0/);
assert.match(patchSource, /legacy draft API fetches/);
assert.match(patchSource, /numerology PDF completion gate/);
assert.match(patchSource, /mantic PDF completion gate/);
assert.match(patchSource, /Free history detail rendering/);

assert.match(legacySource, /_i=\(\)=>\{if\(!S\.name\.trim\(\)\)/);
assert.match(legacySource, /xi=e=>\{let t=d\.find/);
assert.match(legacySource, /Gi=async\(e,t,n=t\)=>\{try\{await fetch\(`\/contracts\/status`/);
assert.match(legacySource, /G\.history\.map\(\(e,t\)=>\{let n=na\.find/);
assert.match(legacySource, /Y=\(e,t\)=>\{if\(!t\.snapshot\)/);
assert.match(legacySource, /vi=e=>\{if\(typeof e==`number`\)/);
assert.equal(
  legacySource.split("let a=await fetch(`/api/appraisals/save-draft`,").length - 1,
  2,
  "Expected two legacy explicit draft API calls.",
);

console.log("Free plan Production UI guard contract verified.");
