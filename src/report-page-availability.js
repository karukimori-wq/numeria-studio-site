import { validateConfirmedDivinationResult } from "./divination-result-contract.js";

const RESULT_LABELS = Object.freeze({
  core_numbers: "コアナンバー",
  spread: "カード展開",
  honmei_star: "本命星",
  getsumei_star: "月命星",
  natal_chart: "命式・出生図",
});

function resultRecords(source) {
  if (Array.isArray(source)) return source;
  return source && typeof source === "object" ? [source] : [];
}

export function assessReportPageAvailability(definition, confirmedResultSource) {
  const methodKey = String(definition?.methodKey || "");
  const record = resultRecords(confirmedResultSource).find((item) => item?.methodKey === methodKey);
  if (!record) return { available: false, code: "CONFIRMED_RESULT_REQUIRED", reason: "確定済みの鑑定結果がありません" };
  const contract = validateConfirmedDivinationResult(record);
  if (!contract.ok) {
    const reasons = {
      RESULT_NOT_CONFIRMED: "鑑定結果がまだ確定していません",
      CALCULATION_VERSION_REQUIRED: "計算方式のバージョン情報が不足しています",
      VALIDATION_EVIDENCE_REQUIRED: "計算結果の検証情報が不足しています",
    };
    const missing = Array.isArray(contract.missing) ? contract.missing : [];
    return {
      available: false,
      code: contract.code,
      missing,
      reason: missing.length
        ? `不足している確定結果：${missing.map((key) => RESULT_LABELS[key] || key).join("、")}`
        : reasons[contract.code] || "確定結果の利用条件を満たしていません",
    };
  }
  const pageEvidence = (Array.isArray(record.pageAvailability) ? record.pageAvailability : [])
    .find((item) => item?.pageDefinitionId === definition?.pageDefinitionId);
  if (!pageEvidence) return { available: false, code: "PAGE_EVIDENCE_REQUIRED", reason: "このページの必要条件が確認されていません" };
  if (pageEvidence.available !== true) {
    return { available: false, code: "PAGE_INPUT_INCOMPLETE", reason: String(pageEvidence.unavailableReason || definition?.availabilityCondition || "このページに必要な入力が不足しています") };
  }
  if (!Array.isArray(pageEvidence.validationEvidence) || !pageEvidence.validationEvidence.some((item) => typeof item === "string" && item.trim())) {
    return { available: false, code: "PAGE_EVIDENCE_REQUIRED", reason: "このページ固有の検証証拠が不足しています" };
  }
  return { available: true, code: "AVAILABLE", reason: "" };
}

export function reportPublicationBlockers(format, definitions, confirmedResultSource) {
  const definitionById = new Map((Array.isArray(definitions) ? definitions : []).map((definition) => [definition.pageDefinitionId, definition]));
  const visibility = new Map((Array.isArray(format?.pageSelection) ? format.pageSelection : []).map((selection) => [selection.pageDefinitionId, selection.visible !== false]));
  return (Array.isArray(format?.pages) ? format.pages : []).flatMap((page) => {
    if (!page?.pageDefinitionId || visibility.get(page.pageDefinitionId) === false || (page.methodKey && page.methodKey !== format?.selectedDivination)) return [];
    const definition = definitionById.get(page.pageDefinitionId);
    if (!definition) return [];
    const availability = assessReportPageAvailability(definition, confirmedResultSource);
    return availability.available ? [] : [{ pageDefinitionId: definition.pageDefinitionId, title: definition.title, ...availability }];
  });
}
