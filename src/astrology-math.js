const wrap = value => ((value % 360) + 360) % 360;
const valid = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 360;
const aspects = [{ name: "conjunction", angle: 0, natal: 8, comparison: 6 }, { name: "sextile", angle: 60, natal: 4, comparison: 3 }, { name: "square", angle: 90, natal: 6, comparison: 5 }, { name: "trine", angle: 120, natal: 6, comparison: 5 }, { name: "opposition", angle: 180, natal: 8, comparison: 6 }];
export function calculateAspect({ longitudePair, chartKind, pair = ["Sun", "Moon"] } = {}) {
  if (!Array.isArray(longitudePair) || longitudePair.length !== 2 || !longitudePair.every(valid) || !["natal", "synastry", "composite", "transit"].includes(chartKind) || !Array.isArray(pair) || pair.length !== 2) return { status: "input-incomplete", aspect: null };
  const axes = pair.filter(body => ["ASC", "MC"].includes(body)).length;
  if (axes === 2) return { status: "unsupported", aspect: null };
  const difference = Math.abs(longitudePair[0] - longitudePair[1]), separation = Math.min(difference, 360 - difference);
  for (const rule of aspects) {
    const orb = Math.min(chartKind === "transit" ? 2 : chartKind === "natal" ? rule.natal : rule.comparison, axes ? 3 : Infinity), error = Math.abs(separation - rule.angle);
    if (error <= orb) return { status: "calculated", aspect: rule.name, angle: rule.angle, orb, errorDegrees: error };
  }
  return { status: "empty", aspect: null };
}
export function calculateCompositeMidpoint(pairDegrees) {
  if (!Array.isArray(pairDegrees) || pairDegrees.length !== 2 || !pairDegrees.every(valid)) return { status: "input-incomplete", midpointDegrees: null };
  const [first, second] = pairDegrees, delta = wrap(second - first + 180) - 180;
  return Math.abs(delta) === 180 ? { status: "ambiguous", midpointDegrees: null } : { status: "calculated", midpointDegrees: wrap(first + delta / 2) };
}
