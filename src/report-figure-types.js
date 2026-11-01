// Notion 07: 12 figure modes. Text-only is deliberately outside this catalog.
export const REPORT_FIGURE_TYPES = Object.freeze({
  "FIG-RESULT": "結果アイコン", "FIG-RELATION": "関係図", "FIG-TIME": "期間図",
  "FIG-MAP": "配置マップ", "FIG-CARDS": "カード一覧", "FIG-SPREAD": "スプレッド",
  "FIG-TABLE": "結果表", "FIG-BALANCE": "構成比", "FIG-ASTRO": "ホロスコープ",
  "FIG-ZIW": "命盤", "FIG-DIRECTION": "方位盤", "FIG-GEO": "指定方位の確認図",
});

const legacyFigureTypes = Object.freeze({
  "result-icons": "FIG-RESULT", "relationship-map": "FIG-RELATION", "period-timeline": "FIG-TIME",
  "placement-map": "FIG-MAP", "card-spread": "FIG-SPREAD", "result-table": "FIG-TABLE",
  "composition-ratio": "FIG-BALANCE", "natal-wheel": "FIG-ASTRO", "destiny-chart": "FIG-ZIW",
  "direction-board": "FIG-DIRECTION", "direction-map": "FIG-GEO",
});

export function reportFigureTypesForPage(definition) {
  if (!definition?.visualRequired) return [];
  if (definition.pageDefinitionId === "TAR-02") return ["FIG-CARDS"];
  if (definition.pageDefinitionId === "NUM-04") return ["FIG-RELATION", "FIG-TIME"];
  const type = legacyFigureTypes[definition.rendererType];
  return type ? [type] : [];
}
