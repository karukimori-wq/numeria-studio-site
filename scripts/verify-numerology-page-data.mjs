import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { calculateNumerology } from "../src/numerology-calculator.js";
import { buildNumerologyPageData, numerologyPageDataFromReading, renderNumerologyCalculationPreview } from "../src/numerology-page-data.js";
import { reportPageDefinitionsFor } from "../src/report-page-definitions.js";
import { validateConfirmedDivinationResult } from "../src/divination-result-contract.js";

const subject = { birthday: "2009-11-11", romanName: "TARO YAMADA", romanNameConfirmed: true };
const referenceDate = "2026-11-01";
const input = { subject, partner: { birthday: "1990-01-02" }, referenceDate, familyRelation: "家族" };
const before = JSON.stringify(input);
const result = buildNumerologyPageData(input), page = id => result.pages.find(item => item.pageDefinitionId === id);
assert.equal(JSON.stringify(input), before, "calculations must not mutate reading inputs");
assert.deepEqual(result.pages.map(item => item.pageDefinitionId), Array.from({ length: 14 }, (_, i) => `NUM-${String(i + 1).padStart(2, "0")}`));
assert.ok(result.pages.every(item => item.status === "calculated"));
assert.equal(validateConfirmedDivinationResult(result).ok, false, "calculated page data cannot authorize publication");
assert.equal("pageAvailability" in result, false);
assert.equal("validationEvidence" in result, false);
assert.equal(page("NUM-01").data.lifePath, 33);
assert.deepEqual(page("NUM-04").data.dependencies, [{ inputs: ["lifePath", "destiny"], output: "maturity", kind: "calculation" }]);
assert.deepEqual(page("NUM-05").data.missingDigits, [3, 5, 8]);
assert.equal(page("NUM-06").data.personalYears[4].year, 2026);
assert.deepEqual(page("NUM-08").data.supplements.map(item => item.key), ["birthdayNumber", "attitude"]);
assert.equal("score" in page("NUM-08").data, false);
assert.equal(page("NUM-12").data.familyRelation, "家族");
const peaks = page("NUM-13").data.pinnacles;
assert.deepEqual(peaks.map(item => item.value), [22, 22, 8, 22]);
assert.deepEqual(peaks.map(item => [item.startAge, item.endAgeExclusive]), [[0, 30], [30, 39], [39, 48], [48, null]]);
const challenges = page("NUM-13").data.challengeNumbers;
assert.deepEqual(challenges.map(item => item.value), [0, 0, 0, 0]);
assert.equal(challenges[2].scope, "lifelong");
assert.ok(challenges.every(item => !("startAge" in item) && !("endAgeExclusive" in item)));
assert.equal(page("NUM-14").data.referenceMonth, "2026-11");
assert.equal(page("NUM-14").data.personalMonth, 7);
const lp8 = calculateNumerology({ birthday: "1990-01-06", referenceDate });
assert.equal(lp8.coreNumbers.lifePath, 8);
assert.deepEqual(lp8.pinnacles.slice(1).map(item => item.startAge), [28, 37, 46]);

const dateOnly = buildNumerologyPageData({ ...input, subject: { ...subject, romanNameConfirmed: false }, partner: undefined, familyRelation: "" });
assert.deepEqual(dateOnly.pages.filter(item => item.status === "calculated").map(item => item.pageDefinitionId), ["NUM-06", "NUM-13", "NUM-14"]);
assert.ok(dateOnly.pages.filter(item => item.status !== "calculated").every(item => item.data === null && item.missing.length));
const invalidName = buildNumerologyPageData({ ...input, subject: { ...subject, romanName: "太郎" } });
assert.equal(invalidName.pages.find(item => item.pageDefinitionId === "NUM-13").status, "calculated");
assert.equal(invalidName.pages.find(item => item.pageDefinitionId === "NUM-02").status, "input-incomplete");
assert.ok(buildNumerologyPageData({ ...input, referenceDate: undefined }).pages.every(item => item.status === "input-incomplete"));
assert.ok(buildNumerologyPageData({ ...input, referenceDate: 2026 }).pages.every(item => item.status === "input-incomplete"));
assert.ok(buildNumerologyPageData({ ...input, subject: { birthday: "2026-02-30" } }).pages.every(item => item.status === "input-incomplete"));
assert.equal(buildNumerologyPageData({ ...input, familyRelation: "" }).pages.find(item => item.pageDefinitionId === "NUM-12").status, "input-incomplete");
assert.equal(buildNumerologyPageData({ ...input, partner: { birthday: "bad" } }).pages.find(item => item.pageDefinitionId === "NUM-08").status, "input-incomplete");
const bothNamed = buildNumerologyPageData({ ...input, partner: { ...subject, birthday: "1990-01-02" } });
assert.equal(bothNamed.pages.find(item => item.pageDefinitionId === "NUM-08").data.supplements.length, 5);
const noConsonants = buildNumerologyPageData({ ...input, subject: { ...subject, romanName: "AI" } });
assert.equal(noConsonants.pages.find(item => item.pageDefinitionId === "NUM-09").data, null);

const snapshot = { id: "reading-a", divination: "numerology", birthday: subject.birthday, birthName: "TARO YAMADA", visitDate: referenceDate, includeCompatibility: true, partnerBirthday: input.partner.birthday, partnerRelation: "家族" };
const fromReading = numerologyPageDataFromReading(snapshot);
assert.equal(fromReading.normalizedRomanName, "", "legacy birthName has no explicit confirmation");
assert.equal(fromReading.pages.find(item => item.pageDefinitionId === "NUM-08").status, "calculated");
assert.equal(numerologyPageDataFromReading({ ...snapshot, divination: "tarot" }), null);
assert.ok(numerologyPageDataFromReading({ ...snapshot, visitDate: "" }).pages.every(item => item.status !== "calculated"), "never silently substitute today's date");
const definitions = reportPageDefinitionsFor("numerology", "pro");
assert.equal(definitions.find(item => item.pageDefinitionId === "NUM-07").title, "あなたの数秘マップ");
const html = renderNumerologyCalculationPreview(result, definitions);
assert.equal((html.match(/data-numerology-page-preview=/g) || []).length, 14);
assert.match(html, /33/); assert.match(html, /11日生まれ/); assert.match(html, /生涯の主要課題/);
assert.doesNotMatch(html, /\[object Object\]|coreNumbers|validationEvidence/);
const freeHtml = renderNumerologyCalculationPreview(result, reportPageDefinitionsFor("numerology", "free"));
assert.equal((freeHtml.match(/data-numerology-page-preview=/g) || []).length, 4);
assert.doesNotMatch(freeHtml, /data-numerology-page-preview="NUM-13"/);
assert.doesNotMatch(renderNumerologyCalculationPreview(result, [{ ...definitions[0], title: '<script>bad</script>' }]), /<script>/);
assert.match(renderNumerologyCalculationPreview(dateOnly, definitions), /入力不足/);

// Exercise the production decorator seam with the real snapshot adapter/renderer.
const runtime = readFileSync("scripts/block-editor-runtime.js", "utf8");
const start = runtime.indexOf('  if(settings&&data.selectedDivination==="numerology"');
const end = runtime.indexOf('  if(settings&&!settings.querySelector("[data-v3-divination-visuals]"))', start);
const inserted = [];
vm.runInNewContext(runtime.slice(start, end), {
  settings: { querySelector: () => false, append: item => inserted.push(item) }, data: { selectedDivination: "numerology" },
  document: { createElement: () => ({ dataset: {} }) }, window: { NumeriaNavigation: { getReadingSnapshot: () => snapshot } },
  numerologyPageDataFromReading, renderNumerologyCalculationPreview, pageDefinitions: definitions,
});
assert.equal(inserted.length, 1);
assert.match(inserted[0].innerHTML, /2026-11-01/);
assert.match(inserted[0].innerHTML, /計算プレビュー/);
assert.match(inserted[0].innerHTML, /正式発行はできません/);
console.log("Numerology: 14 page projections, peak/challenge boundaries, pair inputs, missing names, saved-date preview, plan filtering and publication isolation verified.");
