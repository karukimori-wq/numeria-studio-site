import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { calculateNumerology, NUMEROLOGY_CALCULATION_VERSION } from "../src/numerology-calculator.js";
import { buildNumerologyPageData } from "../src/numerology-page-data.js";

const fixtureText = readFileSync("test-fixtures/numerology-reference-cases.json", "utf8");
const fixture = JSON.parse(fixtureText);
const cases = fixture.cases.map(item => {
  const input = { ...fixture.harnessDefaults, ...item.input };
  const parameters = { birthday: input.date, romanName: input.name ?? "", referenceDate: input.referenceDate };
  const result = calculateNumerology(parameters);
  const page = buildNumerologyPageData({ subject: { ...parameters, romanNameConfirmed: Boolean(input.name) }, referenceDate: input.referenceDate }).pages.find(row => row.pageDefinitionId === "NUM-01");
  const observations = { ...result.coreNumbers, personalMonth: result.personalMonth, counts: result.nameDigitCounts,
    missingDigits: result.missingDigits, mostFrequentDigits: result.mostFrequentDigits,
    pinnacles: result.pinnacles?.map(row => row.value), challenges: result.challengeNumbers?.map(row => row.value),
    secondStarts: result.pinnacles?.[1].startDate, thirdStarts: result.pinnacles?.[2].startDate, fourthStarts: result.pinnacles?.[3].startDate,
    num01Availability: page.status === "input-incomplete" ? "missing_input" : "calculated",
    soulStatus: result.coreNumbers?.soul === null ? "missing_input" : "calculated" };
  const actual = Object.fromEntries(Object.keys(item.expected).map(key => [key, observations[key]]));
  assert.deepEqual(actual, item.expected, `${item.id}: mismatch against ${item.source}`);
  if (item.input.lifePath != null) assert.equal(result.coreNumbers.lifePath, item.input.lifePath);
  return { id: item.id, kind: item.kind, source: item.source, sourceVerificationStatus: item.sourceVerificationStatus || "published-example",
    input: parameters, expected: item.expected, actual, outcome: "pass", executionScope: "local-production-calculator-module" };
});
const report = { executedAt: new Date().toISOString(), calculationVersion: NUMEROLOGY_CALCULATION_VERSION,
  moduleSha256: Object.fromEntries(["src/numerology-calculator.js", "src/numerology-page-data.js"].map(path => [path, createHash("sha256").update(readFileSync(path)).digest("hex")])),
  fixtureSha256: createHash("sha256").update(fixtureText).digest("hex"), cases,
  summary: { total: cases.length, passed: cases.length, externalPublishedExamples: cases.filter(row => row.kind === "external-published-example").length },
  coverage: "partial", publicationApproved: false,
  limitations: ["No logged-in browser/PDF acceptance", "No external validation of all name rules or all birth dates", "Mar 1 non-leap anniversary policy is a user decision, not independent numerical evidence", "No original text/material approval"] };
const outputFlag = process.argv.indexOf("--write-evidence");
if (outputFlag !== -1) {
  const path = process.argv[outputFlag + 1];
  assert.ok(path, "Evidence file path required");
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
}
console.log(`Numerology references: ${cases.length} passed (${report.summary.externalPublishedExamples} external published examples, 6 Notion cases). Coverage remains partial; no publication approval.`);
