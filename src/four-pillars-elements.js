import { countPillarElements } from "./four-pillars-calculator.js";
// Retain the Draft's descriptive contract using the main calculator's one count implementation.
export function countVisiblePillarElements(pillars) {
  const includedPillars = ["year", "month", "day"];
  if (pillars?.hour != null) includedPillars.push("hour");
  const missing = includedPillars.find(key => typeof pillars?.[key] !== "string" || pillars[key].length !== 2);
  if (missing) return { state: "required-missing", missing, data: null, publicationAllowed: false };
  const counted = countPillarElements(includedPillars.map(key => pillars[key]));
  if (!counted) return { state: "calculation-error", reason: "PILLAR_INVALID", data: null, publicationAllowed: false };
  const { total, includeHiddenStems, ...visibleElementCounts } = counted;
  return { state: "available", data: { visibleElementCounts, includedPillars, total, includeHiddenStems }, optionalHourState: includedPillars.length === 3 ? "optional-missing" : "available", publicationAllowed: false };
}
