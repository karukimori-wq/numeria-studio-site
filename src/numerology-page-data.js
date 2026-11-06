import { calculateNumerology } from "./numerology-calculator.js";
import { selectedNumerologyName } from "./numerology-name-input.js";

const NUMEROLOGY_CORE_KEYS = ["lifePath", "birthdayNumber", "attitude", "destiny", "soul", "personality", "maturity", "personalYear"];
const NUMEROLOGY_COMPARISON_KEYS = ["birthdayNumber", "attitude", "destiny", "soul", "personality"];

function calculateNumerologySubject(input, referenceDate) {
  const nameConfirmed = input?.romanNameConfirmed === true;
  const result = calculateNumerology({ birthday: input?.birthday, referenceDate, romanName: nameConfirmed ? input.romanName : "" });
  // An invalid name cannot hide results that only depend on the birth date.
  return result.code === "NUMEROLOGY_NAME_INVALID"
    ? calculateNumerology({ birthday: input?.birthday, referenceDate }) : result;
}

export function buildNumerologyPageData({ subject, partner, referenceDate, familyRelation = "" } = {}) {
  const own = calculateNumerologySubject(subject, referenceDate);
  const other = calculateNumerologySubject(partner, referenceDate);
  const core = own.coreNumbers || {};
  const coreData = keys => Object.fromEntries(keys.map(key => [key, core[key] ?? null]));
  const pages = [];
  const add = (id, required, data) => {
    const missing = required.filter(([, value]) => value === null || value === undefined || value === false || value === "").map(([key]) => key);
    pages.push({ pageDefinitionId: id, status: missing.length ? "input-incomplete" : "calculated", missing, data: missing.length ? null : data });
  };
  const addCore = (id, keys) => add(id, keys.map(key => [key, core[key]]), coreData(keys));
  addCore("NUM-01", NUMEROLOGY_CORE_KEYS);
  addCore("NUM-02", ["lifePath", "birthdayNumber", "destiny"]);
  addCore("NUM-03", ["soul", "maturity", "personalYear"]);
  add("NUM-04", ["lifePath", "destiny", "maturity", "personalYear"].map(key => [key, core[key]]), {
    ...coreData(["lifePath", "destiny", "maturity", "personalYear"]),
    dependencies: [{ inputs: ["lifePath", "destiny"], output: "maturity", kind: "calculation" }], referenceDate,
  });
  add("NUM-05", [["confirmedRomanName", own.nameDigitCounts]], {
    nameDigitCounts: own.nameDigitCounts, missingDigits: own.missingDigits, mostFrequentDigits: own.mostFrequentDigits,
  });
  add("NUM-06", [["personalYears", own.personalYears]], { personalYears: own.personalYears, referenceDate });
  add("NUM-07", NUMEROLOGY_CORE_KEYS.map(key => [key, core[key]]), {
    coreNumbers: coreData(NUMEROLOGY_CORE_KEYS),
    sourceGroups: { birthDate: ["lifePath", "birthdayNumber", "attitude"], confirmedName: ["destiny", "soul", "personality"], derived: ["maturity"], referenceDate: ["personalYear"] },
    dependencies: [{ inputs: ["lifePath", "destiny"], output: "maturity", kind: "calculation" }],
  });
  const comparison = { lifePath: { subject: core.lifePath, partner: other.coreNumbers?.lifePath },
    supplements: NUMEROLOGY_COMPARISON_KEYS.filter(key => core[key] != null && other.coreNumbers?.[key] != null)
      .map(key => ({ key, subject: core[key], partner: other.coreNumbers[key] })) };
  const pairRequired = [["lifePath", core.lifePath], ["partner.lifePath", other.coreNumbers?.lifePath]];
  add("NUM-08", pairRequired, comparison);
  addCore("NUM-09", ["soul", "personality", "lifePath"]);
  addCore("NUM-10", ["birthdayNumber", "destiny", "lifePath"]);
  addCore("NUM-11", ["soul", "destiny", "lifePath"]);
  add("NUM-12", [...pairRequired, ["familyRelation", typeof familyRelation === "string" ? familyRelation.trim() : ""]], { ...comparison, familyRelation });
  add("NUM-13", [["pinnacles", own.pinnacles], ["challengeNumbers", own.challengeNumbers]], { pinnacles: own.pinnacles, challengeNumbers: own.challengeNumbers });
  add("NUM-14", [["personalMonth", own.personalMonth]], { personalMonth: own.personalMonth, referenceMonth: typeof referenceDate === "string" ? referenceDate.slice(0, 7) : null });
  return { methodKey: "numerology", status: own.status, calculationVersion: own.calculationVersion, referenceDate,
    birthday: subject?.birthday, normalizedRomanName: own.normalizedRomanName || "", coreNumbers: coreData(NUMEROLOGY_CORE_KEYS), pages };
}

// Only explicit confirmation belongs to the input. Legacy birthName alone does
// not confirm a name; the saved reference date is never replaced with today.
export function numerologyPageDataFromReading(snapshot) {
  if (snapshot?.divination !== "numerology") return null;
  const subjectName = selectedNumerologyName(snapshot), partnerName = selectedNumerologyName(snapshot, "partner");
  return { ...buildNumerologyPageData({ subject: { birthday: snapshot.birthday, ...subjectName },
    partner: snapshot.includeCompatibility === true ? { birthday: snapshot.partnerBirthday, ...partnerName } : undefined,
    referenceDate: snapshot.visitDate,
    familyRelation: snapshot.includeCompatibility === true && snapshot.partnerRelation === "家族" ? "家族" : "",
  }), nameSources: { subject: subjectName, partner: snapshot.includeCompatibility === true ? partnerName : null } };
}

export function renderNumerologyCalculationPreview(connection, definitions) {
  if (!connection) return "<p>数秘術の鑑定を開くと計算プレビューを確認できます。</p>";
  const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const labels = { lifePath: "ライフパス", birthdayNumber: "バースデー", attitude: "アティチュード", destiny: "デスティニー", soul: "ソウル", personality: "パーソナリティ", maturity: "マチュリティ", personalYear: "個人年", confirmedRomanName: "確認済みローマ字氏名", personalYears: "9年周期と基準日", "partner.lifePath": "相手の生年月日", familyRelation: "家族関係", pinnacles: "ピークと生年月日・基準日", challengeNumbers: "チャレンジと生年月日・基準日", personalMonth: "個人月と基準日" };
  const usedNames = Object.entries(connection.nameSources || {}).filter(([, value]) => value?.romanNameConfirmed)
    .map(([role, value]) => `${role === "subject" ? "本人" : "相手"}：${value.nameKind === "current" ? "現在" : "出生時"}の氏名 ${value.romanName}`).join(" ／ ");
  return `<p>基準日：${escape(connection.referenceDate || "未入力")} · 計算プレビュー（正式発行前の確認用）</p><p>${usedNames ? `使用氏名：${escape(usedNames)}` : "氏名を使う結果はローマ字氏名の確認後に利用できます。"}</p>${(Array.isArray(definitions) ? definitions : []).filter(item => item.methodKey === "numerology").map(definition => {
    const page = connection.pages.find(item => item.pageDefinitionId === definition.pageDefinitionId);
    if (!page) return "";
    const values = page.data || {}, rows = [];
    const row = (label, value) => rows.push(`<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`);
    for (const [key, value] of Object.entries(values.coreNumbers || values)) if (NUMEROLOGY_CORE_KEYS.includes(key) && typeof value === "number") row(labels[key], key === "birthdayNumber" ? `${value}（${Number(connection.birthday?.slice(-2))}日生まれ）` : value);
    if (values.nameDigitCounts) {
      for (const [digit, count] of Object.entries(values.nameDigitCounts)) row(`数字${digit}の出現`, `${count}回`);
      row("未出現", values.missingDigits.join("、") || "該当なし"); row("最多出現", values.mostFrequentDigits.join("、"));
    }
    for (const item of values.personalYears || []) row(`${item.year}年${item.current ? "（基準年）" : ""}`, item.value);
    if (values.lifePath && typeof values.lifePath === "object") {
      row("本人のライフパス", values.lifePath.subject); row("相手のライフパス", values.lifePath.partner);
      for (const item of values.supplements) row(labels[item.key], `本人 ${item.subject} ／ 相手 ${item.partner}`);
      if (values.familyRelation) row("関係", values.familyRelation);
    }
    for (const item of values.pinnacles || []) row(`第${item.stage}ピーク（${item.startAge}歳〜${item.endAgeExclusive === null ? "" : `${item.endAgeExclusive}歳の誕生日前まで`}）`, `${item.value} ／ ${item.dateBoundaryStatus === "resolved" ? `${item.startDate}〜${item.endDateExclusive ? `${item.endDateExclusive}の前日` : ""}` : "日付境界は要確認（年齢のみ）"}`);
    for (const item of values.challengeNumbers || []) row(`第${item.stage}チャレンジ${item.scope === "lifelong" ? "（生涯の主要課題）" : "（人生段階の傾向）"}`, item.value);
    if (values.personalMonth != null) row(`${values.referenceMonth}の個人月`, values.personalMonth);
    return `<details data-numerology-page-preview="${escape(page.pageDefinitionId)}"><summary>${escape(definition.title)} · ${page.status === "calculated" ? "計算済み" : "入力不足"}</summary>${page.status === "calculated" ? `<dl>${rows.join("")}</dl>` : `<p>必要な入力・結果：${escape(page.missing.map(key => labels[key] || key).join("、"))}</p>`}</details>`;
  }).join("")}<p>独立照合と原文・図表の接続が完了するまで、このプレビューから正式発行はできません。</p>`;
}
