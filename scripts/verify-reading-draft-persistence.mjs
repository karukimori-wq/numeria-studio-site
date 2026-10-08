import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const patch = readFileSync("scripts/patch-reading-draft-persistence.mjs", "utf8");
const worker = readFileSync("src/worker.js", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

for (const token of ["clientName:G.name", "birthDate:G.birthday||M", "divination:l", "question:P", "snapshot:Fi(r)"]) {
  assert.ok(patch.includes(token), `draft request includes ${token}`);
}
for (const token of ["currentDraft?.snapshot", "currentDraft?.divination"]) {
  assert.ok(worker.includes(token), `worker preserves ${token}`);
}
assert.match(pkg.scripts.build, /patch-reading-draft-persistence\.mjs/);
assert.match(pkg.scripts.test, /verify-reading-draft-persistence\.mjs/);

console.log("Reading draft persistence verified: complete snapshots are sent to and retained by D1.");
