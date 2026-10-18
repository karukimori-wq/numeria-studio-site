const groups = {
  numerology: { prefix: "NUM", basic: [1, 2, 3, 6], count: 14 },
  tarot: { prefix: "TAR", basic: [1, 2, 5, 6], count: 13 },
  "nine-star-ki": { prefix: "KIG", basic: [1, 2, 3, 4], count: 14 },
  "four-pillars": { prefix: "BAZ", basic: [1, 2, 3, 4, 6], count: 14 },
  "western-astrology": { prefix: "AST", basic: [1, 2, 3, 8], count: 16 },
  "zi-wei-dou-shu": { prefix: "ZIW", basic: [1, 2, 3, 7], count: 14 },
};

export const REPORT_PAGE_DEFINITIONS = Object.entries(groups).flatMap(([methodKey, group]) =>
  Array.from({ length: group.count }, (_, index) => {
    const ordinal = index + 1;
    return {
      pageDefinitionId: `${group.prefix}-${String(ordinal).padStart(2, "0")}`,
      methodKey,
      tier: group.basic.includes(ordinal) ? "basic" : "additional",
      commentSlots: 1,
      commentDefaultEnabled: true,
    };
  }),
);

export const REPORT_PAGE_DEFINITION_IDS = new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId));

export function reportPageDefinitionsFor(methodKey, planId = "free") {
  return REPORT_PAGE_DEFINITIONS.filter((definition) => definition.methodKey === methodKey && (planId === "pro" || definition.tier === "basic"));
}
