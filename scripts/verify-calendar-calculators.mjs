import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { astro } from "iztro";
import { CALENDAR_DEPENDENCY_VERSIONS, calculateChineseCalendarDate, calculateCoreSolarTerms, calculatePlanetPositions, calculateZiWeiBirth, nineStarIntervalValue, calculateNineStarDay, calculateNineStarPlates } from "../src/calendar-calculators.js";

const fixture = JSON.parse(readFileSync("test-fixtures/calendar-reference-cases.json", "utf8")), report = [];
const configBefore = JSON.stringify(astro.getConfig());
for (const item of fixture.cases) {
  let actual;
  if (item.id.startsWith("LUNAR-")) {
    const result = calculateChineseCalendarDate(item.input.gregorianDate);
    actual = Object.fromEntries(Object.keys(item.expected).map(key => [key, result[key]])); assert.deepEqual(actual, item.expected);
  } else if (item.id.startsWith("TERM-")) {
    const result = calculateCoreSolarTerms(item.input.year).terms.find(term => term.event === item.input.event);
    const errorSeconds = Math.abs(Date.parse(result.instantUTC) - Date.parse(item.expected.publicMinute)) / 1000;
    actual = { ...result, errorSeconds }; assert.ok(errorSeconds <= item.expected.toleranceSeconds, item.id);
  } else if (item.id.startsWith("JPL-")) {
    const result = calculatePlanetPositions(item.input.instant).planets.find(planet => planet.body === item.input.body);
    const delta = Math.abs(result.longitudeDegrees - item.expected.longitudeDegrees);
    actual = { ...result, longitudeError: Math.min(delta, 360 - delta), latitudeError: Math.abs(result.latitudeDegrees - item.expected.latitudeDegrees) };
    assert.ok(actual.longitudeError <= item.expected.toleranceDegrees && actual.latitudeError <= item.expected.toleranceDegrees, item.id);
  } else if (item.id.startsWith("KIG-ANCHOR-")) {
    actual = { centerStar: nineStarIntervalValue(item.input) }; assert.deepEqual(actual, item.expected);
  } else if (item.id.startsWith("ZIW-")) {
    const result = calculateZiWeiBirth({ birthDate: item.input.solarDate, standardHour: item.input.standardHour, standardTimeConfirmed: true, gender: "male", referenceDate: "2026-10-19" });
    actual = { soulBranch: result.soulBranch, bodyBranch: result.bodyBranch };
    assert.equal(result.birthDate, item.input.solarDate);
    assert.equal(actual.soulBranch, item.expected.soulBranch); assert.equal(actual.bodyBranch, item.expected.bodyBranch);
    if (item.expected.lunar) {
      actual.lunar = Object.fromEntries(Object.keys(item.expected.lunar).map(key => [key, result.lunar[key]])); assert.deepEqual(actual.lunar, item.expected.lunar);
    }
    assert.equal(result.rawChart.palaces.length, 12);
    assert.equal(result.rawChart.palaces.flatMap(palace => palace.majorStars).length, 14);
  }
  report.push({ id: item.id, kind: item.kind, source: item.oracle, sourceVerificationStatus: item.verificationStatus, input: item.input, expected: item.expected, actual, outcome: "pass", executionScope: "local-core-module" });
}
assert.equal(JSON.stringify(astro.getConfig()), configBefore, "Per-chart configuration must not mutate global defaults.");
assert.equal(calculateZiWeiBirth({ birthDate: "2023-04-05", standardHour: 0, gender: "male", referenceDate: "2026-10-19" }).code, "CONFIRMED_JST_STANDARD_TIME_REQUIRED");
assert.equal(calculateChineseCalendarDate("2026-02-30").status, "input-incomplete");
assert.equal(calculateChineseCalendarDate("1900-12-31").status, "input-incomplete");
assert.equal(calculatePlanetPositions(undefined).status, "input-incomplete");
assert.equal(calculatePlanetPositions("2000-02-30T00:00:00Z").status, "input-incomplete");
assert.equal(calculatePlanetPositions("2000-01-01T12:00:00Z").planets.length, 10);
assert.equal(nineStarIntervalValue({ period: "winter", length: 120, offsetDays: 0 }), null);
assert.equal(nineStarIntervalValue({ period: "winter", length: 180, offsetDays: 180 }), null);
const lichun = Date.parse(calculateCoreSolarTerms(2026).terms.find(term => term.event === "lichun").instantUTC);
const before = calculateNineStarPlates(new Date(lichun - 1000).toISOString()), after = calculateNineStarPlates(new Date(lichun).toISOString());
assert.deepEqual([before.effectiveYear, before.year.center, before.month.center], [2025, 2, 9]);
assert.deepEqual([after.effectiveYear, after.year.center, after.month.center], [2026, 1, 8]);
for (const date of ["1901-01-01", "1948-05-01", "2000-01-07", "2023-12-31", "2026-01-01", "2026-12-31", "2100-12-31"]) {
  const result = calculateNineStarDay(date);
  assert.equal(result.status, "calculated", date); assert.ok([180, 240].includes(result.intervalDays));
  assert.deepEqual([...new Set(result.plate.map(item => item.star))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(result.plate.map(item => item.direction), ["center", "NW", "W", "NE", "S", "N", "SW", "E", "SE"]);
}
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
for (const [name, version] of [["lunar-typescript", "1.8.6"], ["astronomy-engine", "2.1.19"], ["iztro", "2.6.3"]]) assert.equal(packageJson.dependencies[name], version);
const notice = readFileSync("public/third-party-calculators.txt", "utf8");
for (const name of ["lunar-typescript@1.8.6", "astronomy-engine@2.1.19", "iztro@2.6.3", "dayjs@1.11.23", "i18next@23.16.8", "lunar-lite@0.2.8", "@babel/runtime@7.29.10"]) assert.ok(notice.includes(name));
const flag = process.argv.indexOf("--write-evidence");
if (flag >= 0) {
  const path = process.argv[flag + 1]; assert.ok(path); mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ executedAt: new Date().toISOString(), dependencies: CALENDAR_DEPENDENCY_VERSIONS, moduleSha256: createHash("sha256").update(readFileSync("src/calendar-calculators.js")).digest("hex"), cases: report, coverage: "partial", publicationApproved: false, limitations: ["Local arithmetic only; no production UI/save/page connection", "No independent verification of all stars/houses/directions/dates", "Gender male supplied only by geometry test harness, never defaulted in production", "No full astrology house solver or transport/DST normalization"] }, null, 2) + "\n");
}
console.log(`Calendar cores: ${report.length} recorded reference cases passed; lunar/term/JPL comparisons and normative anchor/ziwei cases distinguished. UI and full charts remain unconnected.`);
