import assert from "node:assert/strict";
import { withNumerologyCalculationCheckpoint } from "../src/numerology-result-checkpoint.js";
import { runNumerologyReviewAction, mountNumerologyReviewForm } from "../src/numerology-review-client.js";

const saved = withNumerologyCalculationCheckpoint({ id: "reading-a", divination: "numerology", name: "架空", birthday: "2009-11-11", visitDate: "2026-10-19" });
const pending = { state: "pending", requestId: "request-1", submittedAt: "2026-11-09T00:00:00Z", calculationVersion: saved.numerologyCalculation.calculationVersion };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });
const sessionReply = () => reply({ status: "success", session: { id: saved.id, draftVersion: "v1", snapshot: saved } });
let current = saved, calls = [], finish;
const options = fetcher => ({ method: "POST", snapshot: current, getCurrentSnapshot: () => current, getHeaders: async () => ({ Authorization: "Bearer fixture", "Content-Type": "application/json" }), fetcher: async (path, init) => { calls.push({ path, init }); return fetcher(path, init); } });
const success = (path, init) => path.endsWith("numerology-review") ? reply({ status: "success", reviewRequest: pending, approval: null }) : sessionReply();
let result = await runNumerologyReviewAction(options(success));
assert.equal(result.ok, true); assert.match(result.message, /確認待ち/);
assert.equal(calls.length, 2); assert.equal(calls[0].init.method, "GET");
assert.deepEqual(JSON.parse(calls[1].init.body), { expectedDraftVersion: "v1" });
assert.equal(calls[1].init.headers.Authorization, "Bearer fixture");
assert.doesNotMatch(calls[1].init.body, /birthday|name|approval|complete/);
current = withNumerologyCalculationCheckpoint({ ...saved, visitDate: "2027-01-01" }); calls = [];
result = await runNumerologyReviewAction(options(success));
assert.equal(result.ok, false); assert.match(result.message, /未保存/); assert.equal(calls.length, 1);
current = saved; calls = [];
result = await runNumerologyReviewAction({ ...options(success), snapshot: { ...saved, id: "" } });
assert.equal(result.ok, false); assert.equal(calls.length, 0);
for (const status of [401, 403, 404, 409, 422, 503]) {
  result = await runNumerologyReviewAction(options(path => path.endsWith("numerology-review") ? reply({ status: "error" }, status) : sessionReply()));
  assert.equal(result.ok, false); assert.doesNotMatch(result.message, /確認待ち/);
}
for (const malformed of [{ status: "success", reviewRequest: null, approval: null }, { status: "success", reviewRequest: { ...pending, state: "approved" }, approval: {} }, { status: "success", reviewRequest: { ...pending, calculationVersion: "old" }, approval: null }]) {
  assert.equal((await runNumerologyReviewAction(options(path => path.endsWith("numerology-review") ? reply(malformed) : sessionReply()))).ok, false);
}
result = await runNumerologyReviewAction({ ...options(path => path.endsWith("numerology-review") ? reply({ status: "success", reviewRequest: null, approval: null }) : sessionReply()), method: "GET" });
assert.equal(result.ok, true); assert.match(result.message, /依頼はありません/);
assert.equal((await runNumerologyReviewAction(options(() => { throw Error("offline"); }))).ok, false);
assert.equal((await runNumerologyReviewAction(options(() => new Response("broken")))).ok, false);
let waiting = runNumerologyReviewAction(options(() => new Promise(resolve => { finish = resolve; })));
await new Promise(resolve => setTimeout(resolve, 0));
current = { ...saved, id: "reading-b" }; finish(sessionReply());
result = await waiting; assert.equal(result.ok, false); assert.match(result.message, /入力が変わりました/);
current = saved;
waiting = runNumerologyReviewAction(options(path => path.endsWith("numerology-review") ? new Promise(resolve => { finish = resolve; }) : sessionReply()));
await new Promise(resolve => setTimeout(resolve, 0));
current = withNumerologyCalculationCheckpoint({ ...saved, visitDate: "2027-01-01" });
finish(reply({ status: "success", reviewRequest: pending, approval: null }));
assert.match((await waiting).message, /入力が変わりました/);

const submit = {}, check = {}, feedback = {};
const container = { isConnected: true, innerHTML: "", querySelector: key => key.includes("submit") ? submit : key.includes("check") ? check : feedback };
current = saved; calls = [];
const invalidate = mountNumerologyReviewForm(container, { getSnapshot: () => current, getHeaders: async () => ({}), fetcher: async (...args) => { calls.push(args); return new Promise(resolve => { finish = resolve; }); } });
waiting = submit.onclick(); await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(submit.disabled, true); assert.equal(check.disabled, true);
await check.onclick(); assert.equal(calls.length, 1, "Concurrent clicks must not start duplicate requests.");
current = { ...saved, id: "reading-b" }; invalidate(); assert.match(feedback.textContent, /入力が変わりました/);
finish(sessionReply()); await waiting;
assert.equal(submit.disabled, false); assert.equal(check.disabled, false); assert.match(feedback.textContent, /入力が変わりました/);
assert.doesNotMatch(feedback.textContent, /確認待ち/);
console.log("Numerology review UI: saved-input gate, version-only submission, auth/error/malformed responses, stale async results and duplicate-click prevention verified.");
