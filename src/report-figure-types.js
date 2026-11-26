import { REPORT_RESULT_REFERENCES } from "./report-result-references.js";
// Notion 07: 12 figure modes. Text-only is deliberately outside this catalog.
export const REPORT_FIGURE_TYPES = Object.freeze({
  "FIG-RESULT": "結果アイコン", "FIG-RELATION": "関係図", "FIG-TIME": "期間図",
  "FIG-MAP": "配置マップ", "FIG-CARDS": "カード一覧", "FIG-SPREAD": "スプレッド",
  "FIG-TABLE": "結果表", "FIG-BALANCE": "構成比", "FIG-ASTRO": "ホロスコープ",
  "FIG-ZIW": "命盤", "FIG-DIRECTION": "方位盤", "FIG-GEO": "指定方位の確認図",
});

const canonicalFigureTypes = new Map(REPORT_RESULT_REFERENCES.map(row => [row.pageDefinitionId, row.figureTypes]));
export function reportFigureTypesForPage(definition) {
  if (!definition?.visualRequired) return [];
  return [...(canonicalFigureTypes.get(definition.pageDefinitionId) || [])];
}
