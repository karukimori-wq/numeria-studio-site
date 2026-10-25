import { validateKigakuResult } from "./kigaku-result.js";
import { kigakuYearBranch } from "./kigaku-solar-calendar.js";

export const KIGAKU_DIRECTION_VERSION = "ns.kigaku.direction-main-star.v1";
export const KIGAKU_DIRECTIONS = Object.freeze(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
const LABELS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
const ELEMENTS = [null, "water", "earth", "wood", "wood", "earth", "metal", "metal", "earth", "fire"];
const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const BRANCH_DIRECTIONS = ["N", "NE", "NE", "E", "SE", "SE", "S", "SW", "SW", "W", "NW", "NW"];
const REASON_LABELS = { five_yellow: "五黄殺", opposite_five_yellow: "暗剣殺", main_star: "本命殺", opposite_main_star: "本命的殺", year_break: "歳破", month_break: "月破" };
const opposite = (direction) => KIGAKU_DIRECTIONS[(KIGAKU_DIRECTIONS.indexOf(direction) + 4) % 8];

function relation(person, target) {
  if (person === target) return { kind: "biwa", label: "比和", flow: null };
  if (GENERATES[person] === target) return { kind: "gasei", label: "我生", flow: "person-to-direction" };
  if (GENERATES[target] === person) return { kind: "seiga", label: "生我", flow: "direction-to-person" };
  return { kind: "other", label: "相生・比和に該当せず", flow: null };
}

// Pure rule evaluator. The public snapshot factory below always recomputes its source.
export function evaluateKigakuDirections({ board, mainStar, branchIndex, period }) {
  if (!Number.isInteger(mainStar) || mainStar < 1 || mainStar > 9) throw new TypeError("KIGAKU_MAIN_STAR_INVALID");
  if (!["year", "month"].includes(period) || !Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex > 11) throw new TypeError("KIGAKU_DIRECTION_PERIOD_INVALID");
  if (!board || Object.keys(board).length !== 9 || new Set(Object.values(board)).size !== 9 || Object.values(board).some((star) => !Number.isInteger(star) || star < 1 || star > 9) || !["C", ...KIGAKU_DIRECTIONS].every((key) => Object.hasOwn(board, key))) throw new TypeError("KIGAKU_BOARD_INVALID");
  const five = KIGAKU_DIRECTIONS.find((key) => board[key] === 5);
  const own = KIGAKU_DIRECTIONS.find((key) => board[key] === mainStar);
  const breakDirection = opposite(BRANCH_DIRECTIONS[branchIndex]);
  return KIGAKU_DIRECTIONS.map((direction, index) => {
    const star = board[direction];
    const elementRelation = relation(ELEMENTS[mainStar], ELEMENTS[star]);
    const candidateExclusions = [];
    if (star === mainStar) candidateExclusions.push("OWN_STAR");
    if (star === 5) candidateExclusions.push("FIVE_YELLOW");
    const goodCandidate = elementRelation.kind !== "other" && candidateExclusions.length === 0;
    const dangerReasons = [];
    if (direction === five) dangerReasons.push("five_yellow");
    if (five && direction === opposite(five)) dangerReasons.push("opposite_five_yellow");
    if (direction === own) dangerReasons.push("main_star");
    if (own && direction === opposite(own)) dangerReasons.push("opposite_main_star");
    if (direction === breakDirection) dangerReasons.push(`${period}_break`);
    const judgement = dangerReasons.length ? "bad" : goodCandidate ? "good" : "not_good";
    return { direction, label: LABELS[index], star, element: ELEMENTS[star], elementRelation, goodCandidate, candidateExclusions, dangerReasons: dangerReasons.map((code) => ({ code, label: REASON_LABELS[code] })), judgement, judgementLabel: { bad: "凶理由あり", good: "吉条件に該当", not_good: "吉条件に該当せず" }[judgement] };
  });
}

export function createKigakuDirectionResult({ sourceResult, selectedDirection = null }) {
  if (selectedDirection !== null && !KIGAKU_DIRECTIONS.includes(selectedDirection)) throw new TypeError("KIGAKU_SELECTED_DIRECTION_INVALID");
  const source = validateKigakuResult(sourceResult);
  const mainStar = source.natal.mainStar;
  let analysis;
  if (mainStar.state !== "ready") {
    analysis = { state: "missing_input", reasonCode: "MAIN_STAR_REQUIRED", year: null, month: null, common: null, selected: null };
  } else {
    const year = evaluateKigakuDirections({ board: source.year.board, mainStar: mainStar.value, branchIndex: kigakuYearBranch(source.year.kiYear), period: "year" });
    const month = evaluateKigakuDirections({ board: source.month.board, mainStar: mainStar.value, branchIndex: (source.month.solarMonthIndex + 2) % 12, period: "month" });
    const directions = KIGAKU_DIRECTIONS.filter((direction) => year.find((row) => row.direction === direction).judgement === "good" && month.find((row) => row.direction === direction).judgement === "good");
    analysis = { state: "ready", reasonCode: null, year, month, common: { state: directions.length ? "ready" : "empty", directions }, selected: selectedDirection === null ? { state: "missing_input", reasonCode: "MANUAL_DIRECTION_REQUIRED" } : { state: "ready", direction: selectedDirection, year: year.find((row) => row.direction === selectedDirection), month: month.find((row) => row.direction === selectedDirection), commonGood: directions.includes(selectedDirection) } };
  }
  return { schemaVersion: "numeria.kigaku.direction-result.v1", calculationVersion: KIGAKU_DIRECTION_VERSION, sourceResult: source, selectedDirection, directionBasis: "practitioner-manual-from-origin", analysis };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function validateKigakuDirectionResult(value) {
  if (!value || value.schemaVersion !== "numeria.kigaku.direction-result.v1") throw new TypeError("KIGAKU_DIRECTION_SCHEMA_INVALID");
  const canonical = createKigakuDirectionResult(value);
  if (stable(value) !== stable(canonical)) throw new TypeError("KIGAKU_DIRECTION_RECOMPUTATION_MISMATCH");
  return canonical;
}
