import assert from "node:assert/strict";
import { kigakuBoardFromCenter } from "../src/kigaku-solar-calendar.js";
import { createKigakuResultFromClock } from "../src/kigaku-result.js";
import { evaluateKigakuDirections, createKigakuDirectionResult, validateKigakuDirectionResult } from "../src/kigaku-directions.js";

const candidateStars = [null, [3, 4, 6, 7], [6, 7, 8, 9], [1, 4, 9], [1, 3, 9], [2, 6, 7, 8, 9], [1, 2, 7, 8], [1, 2, 6, 8], [2, 6, 7, 9], [2, 3, 4, 8]];
const breakDirections = ["S", "SW", "SW", "W", "NW", "NW", "N", "NE", "NE", "E", "SE", "SE"];
let combinations = 0;
for (const period of ["year", "month"]) for (let branchIndex = 0; branchIndex < 12; branchIndex++) for (let center = 1; center <= 9; center++) for (let mainStar = 1; mainStar <= 9; mainStar++) {
  const board = kigakuBoardFromCenter(center);
  const rows = evaluateKigakuDirections({ board, mainStar, branchIndex, period });
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.filter((row) => row.goodCandidate).map((row) => row.star).sort((a, b) => a - b), candidateStars[mainStar].filter((star) => star !== center));
  assert.deepEqual(rows.filter((row) => row.dangerReasons.some((reason) => reason.code === `${period}_break`)).map((row) => row.direction), [breakDirections[branchIndex]]);
  for (const row of rows) {
    const codes = row.dangerReasons.map((reason) => reason.code);
    assert.equal(codes.includes("five_yellow"), row.star === 5);
    assert.equal(codes.includes("main_star"), row.star === mainStar);
    assert.equal(row.judgement, codes.length ? "bad" : row.goodCandidate ? "good" : "not_good");
    if (center === 5) assert.equal(codes.includes("opposite_five_yellow"), false);
    if (center === mainStar) assert.equal(codes.includes("opposite_main_star"), false);
  }
  combinations++;
}
const overlap = evaluateKigakuDirections({ board: kigakuBoardFromCenter(1), mainStar: 5, branchIndex: 0, period: "year" }).find((row) => row.direction === "S");
assert.deepEqual(overlap.dangerReasons.map((reason) => reason.code), ["five_yellow", "main_star", "year_break"]);
const birthClock = { date: "1990-06-15", time: "12:00", countryCode: "JP", zoneId: "Asia/Tokyo", zoneConfirmed: true };
const sourceResult = createKigakuResultFromClock({ referenceInstant: "2026-10-24T12:00:00+09:00", birthClock });
const draft = createKigakuDirectionResult({ sourceResult, selectedDirection: "NE" });
assert.deepEqual(draft.analysis.common.directions, draft.analysis.year.filter((row) => row.judgement === "good" && draft.analysis.month.find((month) => month.direction === row.direction).judgement === "good").map((row) => row.direction));
assert.deepEqual(validateKigakuDirectionResult(JSON.parse(JSON.stringify(draft))), draft);
const altered = structuredClone(draft);
altered.analysis.common.directions.push("C");
assert.throws(() => validateKigakuDirectionResult(altered), /RECOMPUTATION_MISMATCH/);
assert.equal(createKigakuDirectionResult({ sourceResult }).analysis.selected.reasonCode, "MANUAL_DIRECTION_REQUIRED");
assert.throws(() => createKigakuDirectionResult({ sourceResult, selectedDirection: "C" }), /SELECTED_DIRECTION_INVALID/);
const uncertainMonth = createKigakuResultFromClock({ referenceInstant: "2026-10-24T12:00:00+09:00", birthClock: { ...birthClock, date: "2026-03-05", time: null } });
assert.equal(uncertainMonth.natal.monthStar.state, "missing_input");
assert.equal(createKigakuDirectionResult({ sourceResult: uncertainMonth }).analysis.state, "ready");
const noBirth = createKigakuResultFromClock({ referenceInstant: "2026-10-24T12:00:00+09:00" });
assert.equal(createKigakuDirectionResult({ sourceResult: noBirth }).analysis.reasonCode, "MAIN_STAR_REQUIRED");
const lower = createKigakuResultFromClock({ referenceInstant: "2026-10-24T12:00:00+09:00", birthClock: { ...birthClock, date: "1901-01-01", time: null } });
assert.equal(lower.natal.mainStar.state, "ready");
console.log(`Kigaku directions: ${combinations} rule combinations, overlapping reasons, partial input and recomputation verified.`);
