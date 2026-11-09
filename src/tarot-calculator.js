export const TAROT_CALCULATION_VERSION = "numeria-tarot-manual-2026-10-19.v1";
export const TAROT_SPREAD_POSITIONS = Object.freeze({
  "one-oracle": ["message"], "three-time": ["past", "present", "future"],
  "choice-five": ["present", "a-process", "a-outcome", "b-process", "b-outcome"],
  "relationship-six": ["self-feeling", "other-feeling", "relationship-now", "hidden-influence", "action", "outcome"],
  "horseshoe-seven": ["past", "present", "near-future", "attitude", "environment", "obstacle", "outcome"],
  "celtic-cross": ["present", "challenge", "conscious", "unconscious", "past", "near-future", "self-position", "environment", "hopes-fears", "outcome"],
  "three-months": ["month-0", "month-1", "month-2"], "problem-solving-three": ["problem", "background", "action"],
});
Object.values(TAROT_SPREAD_POSITIONS).forEach(Object.freeze);
const tarotMajors = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
export const TAROT_CARD_IDS = Object.freeze([...tarotMajors, ...["W", "P", "S", "C"].flatMap(suit => ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "ペイジ", "ナイト", "クイーン", "キング"].map(rank => `${suit}-${rank}`))]);

export function calculateTarot({ spreadId, cards = [], deckSize = 22, reversalsEnabled = true, referenceDate, theme = "", optionA = "", optionB = "", partnerRef = "" } = {}) {
  const fail = (code, missing = []) => ({ methodKey: "tarot", status: "input-incomplete", code, missing, calculationVersion: TAROT_CALCULATION_VERSION, pages: Array.from({ length: 13 }, (_, index) => ({ pageDefinitionId: `TAR-${String(index + 1).padStart(2, "0")}`, status: "input-incomplete", reason: code, data: null })) });
  const positions = Object.hasOwn(TAROT_SPREAD_POSITIONS, spreadId) ? TAROT_SPREAD_POSITIONS[spreadId] : null;
  if (!positions) return fail("SPREAD_UNSUPPORTED");
  if (![22, 78].includes(deckSize) || typeof reversalsEnabled !== "boolean" || !Array.isArray(cards)) return fail("TAROT_INPUT_INVALID");
  const allowed = new Set(deckSize === 22 ? tarotMajors : TAROT_CARD_IDS), used = new Set(), assigned = new Set();
  for (const card of cards) {
    if (!card || !positions.includes(card.positionId) || !allowed.has(card.cardId) || !["upright", "reversed"].includes(card.orientation) || (!reversalsEnabled && card.orientation !== "upright")) return fail("CARD_INPUT_INVALID");
    if (used.has(card.cardId)) return fail("DUPLICATE_CARD");
    if (assigned.has(card.positionId)) return fail("DUPLICATE_POSITION");
    used.add(card.cardId); assigned.add(card.positionId);
  }
  const missing = positions.filter(position => !assigned.has(position));
  if (missing.length) return fail("CARD_POSITION_MISSING", missing);
  const ordered = positions.map(position => { const card = cards.find(card => card.positionId === position); return { positionId: position, cardId: card.cardId, orientation: card.orientation }; });
  const has = id => assigned.has(id), choice = spreadId === "choice-five", relation = spreadId === "relationship-six";
  const text = value => typeof value === "string" && Boolean(value.trim());
  let months = null;
  if (typeof referenceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    const date = new Date(`${referenceDate}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === referenceDate) {
      const year = Number(referenceDate.slice(0, 4)), month = Number(referenceDate.slice(5, 7)) - 1;
      if (year >= 1 && year + Math.floor((month + 2) / 12) <= 9999) months = Array.from({ length: 3 }, (_, offset) => `${String(year + Math.floor((month + offset) / 12)).padStart(4, "0")}-${String((month + offset) % 12 + 1).padStart(2, "0")}`);
    }
  }
  const conditions = [true, true, has("past") && has("present") && (has("future") || has("near-future")), ordered.length > 1, has("message") || has("future") || has("outcome") || choice,
    has("action") || has("attitude"), relation && text(partnerRef), has("other-feeling") && text(partnerRef), relation && text(partnerRef) && theme === "love",
    choice && theme === "work" && text(optionA) && text(optionB), choice && text(optionA) && text(optionB), spreadId === "three-months" && months !== null, spreadId === "problem-solving-three"];
  return { methodKey: "tarot", status: "calculated", calculationVersion: TAROT_CALCULATION_VERSION, spreadId, spreadVersion: "v1", deckSize, reversalsEnabled, referenceDate: referenceDate || null,
    cards: ordered, pages: conditions.map((ready, index) => ({ pageDefinitionId: `TAR-${String(index + 1).padStart(2, "0")}`, status: ready ? "calculated" : "input-incomplete",
      reason: ready ? "" : "このページに対応する配置・相談用途・必要入力が不足しています", data: ready ? {
        cards: (index === 2 ? ["past", "present", has("future") ? "future" : "near-future"] : index === 4 ? choice ? ["a-outcome", "b-outcome"] : [has("message") ? "message" : has("future") ? "future" : "outcome"] : index === 5 ? [has("action") ? "action" : "attitude"] : index === 7 ? ["other-feeling", "relationship-now"] : positions).map(id => ({ ...ordered.find(card => card.positionId === id) })),
        ...(index === 11 ? { months } : {}), ...([6, 7, 8].includes(index) ? { partnerRef } : {}), ...([9, 10].includes(index) ? { optionA: optionA.trim(), optionB: optionB.trim() } : {}),
      } : null })) };
}
