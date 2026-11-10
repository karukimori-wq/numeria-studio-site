import { CORE_NUMBER_KEYS, NUMEROLOGY_VERSION } from "./numerology-copy-calculation.js";

export const NUMEROLOGY_FIGURE_VERSION = "ns.num.figures.2026-10-22.1";
export const NUMEROLOGY_ROLE_NAMES = {
  lifePath: "人生の道・本質", birthdayNumber: "生まれ日の才能", attitude: "姿勢・第一印象",
  destiny: "社会での役割", soul: "内面の願い", personality: "人から見える姿",
  maturity: "成熟後のテーマ", personalYear: "今年の流れ", personalMonth: "今月の数",
};

function figureError(code, key) { throw Object.assign(new Error(code), { code, key }); }

/** Input is the server-validated page draft. Never consumes the example JSON. */
export function attachNumerologyFigures(draft) {
  const subjects = draft.subjects;
  if (!subjects?.a) return { ...draft, figureVersion: NUMEROLOGY_FIGURE_VERSION,
    pages: draft.pages.map(page => ({ ...page, figures: [] })) };
  const value = (key, who = "a") => {
    const result = subjects[who]?.snapshot?.results?.[key];
    if (result?.state !== "ready") figureError(result?.state || "missing_input", key);
    return structuredClone(result.value);
  };
  const figure = (page, type, kind, alt, keys, data, slots = ["a"]) => ({
    schemaVersion: "ns.figure.v1", adapterVersion: NUMEROLOGY_FIGURE_VERSION,
    figureId: `${page.pageId}:${kind}`, pageId: page.pageId, type, kind,
    exampleOnly: draft.exampleOnly === true, state: "ready", alt,
    subjectRefs: slots.map(slot => subjects[slot].subjectRef),
    resultRevision: subjects.a.resultRevision,
    resultRevisions: slots.map(slot => ({ subjectRef: subjects[slot].subjectRef, resultRevision: subjects[slot].resultRevision })),
    calculationVersion: NUMEROLOGY_VERSION, copyStatus: "draft",
    resultBindings: slots.flatMap(slot => keys.map(key => ({ subjectRef: subjects[slot].subjectRef,
      resultRevision: subjects[slot].resultRevision, calculationVersion: NUMEROLOGY_VERSION,
      valueResultRef: `num.${key}`, value: value(key, slot) }))),
    data,
  });
  const items = keys => keys.map(key => ({ key, label: NUMEROLOGY_ROLE_NAMES[key], value: value(key), unit: "number" }));
  const y = Number(subjects.a.snapshot.referenceDate?.slice(0, 4));
  const month = subjects.a.snapshot.referenceDate?.slice(0, 7);
  const comparisonKeys = () => ["lifePath", ...["birthdayNumber", "attitude", "destiny", "soul", "personality"].filter(key =>
    subjects.a.snapshot.results[key].state === "ready" && subjects.b?.snapshot.results[key].state === "ready")];
  const pages = draft.pages.map(page => {
    if (page.state !== "preview_ready") return { ...page, figures: [] };
    try {
      let figures;
      const result = keys => [figure(page, "FIG-RESULT", "numbers", "役割別の確定ナンバー", keys, { items: items(keys), order: "declared" })];
      switch (page.pageId) {
        case "NUM-01": figures = result(CORE_NUMBER_KEYS); break;
        case "NUM-02": figures = result(["lifePath", "birthdayNumber", "destiny"]); break;
        case "NUM-03": figures = result(["soul", "maturity", "personalYear"]); break;
        case "NUM-04": figures = [
          figure(page, "FIG-RELATION", "maturity", "ライフパスとデスティニーから成熟数を求める計算の関係", ["lifePath", "destiny", "maturity"], {
            items: items(["lifePath", "destiny", "maturity"]), edges: [{ from: "lifePath", to: "maturity", kind: "calculation-input" }, { from: "destiny", to: "maturity", kind: "calculation-input" }],
            legend: "線は計算の入力関係を示します。", scoreAxis: false,
          }),
          figure(page, "FIG-TIME", "cycle-position", `${y}年の9周期内の位置`, ["personalYear"], {
            items: Array.from({ length: 9 }, (_, index) => ({ value: index + 1, label: `${index + 1}`, highlight: index + 1 === value("personalYear") })),
            referenceYear: y, unit: "cycle-position", scoreAxis: false,
          }),
        ]; break;
        case "NUM-05": {
          const counts = value("nameDigitCounts"), missing = value("missingDigits"), most = value("mostFrequentDigits");
          figures = [figure(page, "FIG-RELATION", "name-counts", "氏名に含まれる1から9の出現回数", ["nameDigitCounts", "missingDigits", "mostFrequentDigits"], {
            items: counts.map((count, index) => ({ value: index + 1, count, missing: missing.includes(index + 1), most: most.includes(index + 1) })),
            missing, most, uniform: most.length === 9, unit: "letters", edges: [],
          })]; break;
        }
        case "NUM-06": {
          const sequence = value("personalYearSequence");
          if (sequence.some(item => item.year >= 9999)) figureError("FIGURE_DATE_RANGE", "personalYearSequence");
          figures = [figure(page, "FIG-TIME", "nine-years", `${y - 4}年から${y + 4}年の9年サイクル`, ["personalYearSequence"], {
            timeZone: "Asia/Tokyo", intervalMode: "start-inclusive-end-exclusive", unit: "calendar-year", scoreAxis: false,
            items: sequence.map(item => ({ id: `year-${item.year}`, label: `${item.year}年`, year: item.year, value: item.value,
              start: `${String(item.year).padStart(4, "0")}-01-01`, end: `${String(item.year + 1).padStart(4, "0")}-01-01`, highlight: item.year === y })),
          })]; break;
        }
        case "NUM-07": {
          const positions = [[.2,.2],[.5,.2],[.8,.2],[.2,.5],[.5,.5],[.8,.5],[.35,.8],[.65,.8]];
          figures = [figure(page, "FIG-MAP", "role-map", "役割と由来で整理した数秘8コア", CORE_NUMBER_KEYS, {
            coordinateSystem: "normalized", layoutVersion: "num-eight-role-map.v1", edges: [],
            tradition: "NSの数秘結果整理図",
            items: items(CORE_NUMBER_KEYS).map((item, index) => ({ ...item, x: positions[index][0], y: positions[index][1],
              origin: index < 3 ? "生年月日" : index < 6 ? "選択した氏名" : index === 6 ? "本質と役割" : "生まれ月日と基準年" })),
          })]; break;
        }
        case "NUM-08":
        case "NUM-12": {
          const keys = comparisonKeys();
          figures = [figure(page, "FIG-RELATION", "comparison", "本人と相手の共通確定ナンバーを役割別に比較", keys, {
            items: keys.map(key => ({ key, label: NUMEROLOGY_ROLE_NAMES[key], first: value(key), second: value(key, "b"), same: value(key) === value(key, "b") })),
            relation: page.pageId === "NUM-12" ? page.frames[2].labels[0] : null,
            optionalMissing: ["birthdayNumber", "attitude", "destiny", "soul", "personality"].filter(key => !keys.includes(key)), scoreAxis: false,
          }, ["a", "b"])]; break;
        }
        case "NUM-09": figures = result(["soul", "personality", "lifePath"]); break;
        case "NUM-10": figures = [figure(page, "FIG-RELATION", "work-roles", "才能・役割・本質を並べて確認", ["birthdayNumber", "destiny", "lifePath"], { items: items(["birthdayNumber", "destiny", "lifePath"]), edges: [] })]; break;
        case "NUM-11": figures = result(["soul", "destiny", "lifePath"]); break;
        case "NUM-13": {
          const periods = page.frames[0].labels;
          const numbers = value("pinnacleNumbers");
          if (periods.length !== 4 || periods.some((p, index) => p.value !== numbers[index] || p.stage !== index + 1 || !p.startInclusive || (index < 3 && p.endExclusive !== periods[index + 1].startInclusive))) figureError("PINNACLE_BINDING_MISMATCH", "pinnacleNumbers");
          figures = [
            figure(page, "FIG-TIME", "pinnacles", "開始日を含み次の開始日を含まない4つのピナクル期間", ["pinnacleNumbers"], { items: structuredClone(periods), intervalMode: "start-inclusive-end-exclusive", scoreAxis: false, unit: "attained-age" }),
            figure(page, "FIG-TABLE", "challenges", "4つのチャレンジ。第3は生涯の主要課題", ["challengeNumbers"], {
              rows: value("challengeNumbers").map((number, index) => ({ stage: index + 1, value: number, lifelongMain: index === 2 })), periodMode: "none", repeatHeaderOnContinuation: true,
            }),
          ]; break;
        }
        case "NUM-14": {
          if (month === "9999-12") figureError("FIGURE_DATE_RANGE", "personalMonth");
          const [year, m] = month.split("-").map(Number);
          const end = `${String(m === 12 ? year + 1 : year).padStart(4, "0")}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
          figures = [figure(page, "FIG-TIME", "month", `${month}のパーソナルマンス`, ["personalMonth"], { yearMonth: month, value: value("personalMonth"), start: `${month}-01`, end, intervalMode: "start-inclusive-end-exclusive", scoreAxis: false })]; break;
        }
        default: figureError("UNSUPPORTED_NUMEROLOGY_PAGE", page.pageId);
      }
      return { ...page, figures };
    } catch (error) {
      return { ...page, figures: [{ schemaVersion: "ns.figure.v1", figureId: `${page.pageId}:unavailable`, pageId: page.pageId,
        state: "unsupported", error: { code: error.code || "FIGURE_ADAPTER_ERROR", key: error.key || null }, alt: "図表を確認できません", data: null }] };
    }
  });
  return { ...draft, figureVersion: NUMEROLOGY_FIGURE_VERSION, pages };
}
