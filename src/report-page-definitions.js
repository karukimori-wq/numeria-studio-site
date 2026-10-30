const groups = {
  numerology: { prefix: "NUM", basic: [1, 2, 3, 6], count: 14 },
  tarot: { prefix: "TAR", basic: [1, 2, 5, 6], count: 13 },
  "nine-star-ki": { prefix: "KIG", basic: [1, 2, 3, 4], count: 14 },
  "four-pillars": { prefix: "BAZ", basic: [1, 2, 3, 4, 6], count: 14 },
  "western-astrology": { prefix: "AST", basic: [1, 2, 3, 8], count: 16 },
  "zi-wei-dou-shu": { prefix: "ZIW", basic: [1, 2, 3, 7], count: 14 },
};

export const REPORT_VISUAL_TYPES = Object.freeze([
  { rendererType: "result-icons", label: "結果アイコン", visual: true },
  { rendererType: "result-table", label: "結果表", visual: true },
  { rendererType: "relationship-map", label: "関係図", visual: true },
  { rendererType: "period-timeline", label: "期間図", visual: true },
  { rendererType: "placement-map", label: "配置マップ", visual: true },
  { rendererType: "card-spread", label: "カード配置図", visual: true },
  { rendererType: "direction-board", label: "方位盤", visual: true },
  { rendererType: "direction-map", label: "方位マップ", visual: true },
  { rendererType: "composition-ratio", label: "構成比", visual: true },
  { rendererType: "natal-wheel", label: "天体図", visual: true },
  { rendererType: "destiny-chart", label: "命盤", visual: true },
  { rendererType: "text-only", label: "文章中心", visual: false },
].map(Object.freeze));

export const REPORT_RENDERER_TYPES = Object.freeze(REPORT_VISUAL_TYPES.map((type) => type.rendererType));

const reportVisualTypeByRenderer = new Map(REPORT_VISUAL_TYPES.map((type) => [type.rendererType, type]));

export function reportVisualTypeFor(rendererType) {
  const type = reportVisualTypeByRenderer.get(rendererType);
  if (!type) throw new Error(`REPORT_VISUAL_RENDERER_UNKNOWN:${rendererType}`);
  return type;
}

const methodResultKeys = Object.freeze({
  numerology: ["core_numbers"],
  tarot: ["spread"],
  "nine-star-ki": ["honmei_star", "getsumei_star"],
  "four-pillars": ["natal_chart"],
  "western-astrology": ["natal_chart"],
  "zi-wei-dou-shu": ["natal_chart"],
});

function rendererTypeFor(specification = "") {
  if (specification === "なし・文章中心") return "text-only";
  if (specification.includes("カード")) return "card-spread";
  if (specification.includes("方位マップ")) return "direction-map";
  if (specification.includes("方位盤")) return "direction-board";
  if (specification.includes("天体図")) return "natal-wheel";
  if (specification.includes("命盤")) return "destiny-chart";
  if (specification.includes("構成比")) return "composition-ratio";
  if (specification.includes("期間図")) return "period-timeline";
  if (specification.includes("配置マップ")) return "placement-map";
  if (specification.includes("関係図")) return "relationship-map";
  if (specification.includes("結果表")) return "result-table";
  return "result-icons";
}

const basicMetadata = {
  "NUM-01": ["8つのコアナンバー", "結果アイコン（対象数8）", "8結果が全て確定。未算出項目があれば理由付き利用不可"],
  "NUM-02": ["本質・才能・社会での役割", "結果アイコン（3）", "意味対応が正式に定義され、対象3結果が確定"],
  "NUM-03": ["内面・成長・今年の流れ", "結果アイコン（3）", "対象2コアと作成年の年数結果が確定"],
  "NUM-06": ["あなたの9年サイクル", "期間図（9年を1図）", "作成年を起点に連続9年の確定結果あり"],
  "TAR-01": ["ご相談とカードの展開", "カード配置図（1）", "選択スプレッドの全必要位置が確定"],
  "TAR-02": ["引かれたカード", "カード一覧（確定位置数N）", "全カード画像・正逆・登録文がそろう"],
  "TAR-05": ["ご相談への答え", "なし・文章中心", "必要カードが確定し、専用回答位置または登録済み全体読解の参照範囲がある"],
  "TAR-06": ["これからの行動とメッセージ", "なし・文章中心", "必要カードが確定し、専用助言位置または登録済み全体読解の参照範囲がある"],
  "KIG-01": ["あなたの九星", "結果アイコン（2星表示）", "2星の確定結果あり"],
  "KIG-02": ["基本性格と運勢傾向", "結果アイコン（本人2星の配置1）", "本人2星と組合せ原文あり"],
  "KIG-03": ["今年の運勢", "方位盤（1）", "作成年の年盤と本人位置が確定"],
  "KIG-04": ["今月の運勢", "方位盤（1）", "作成月の月盤と本人位置が確定"],
  "BAZ-01": ["あなたの命式", "結果表（1表）", "年柱・月柱・日柱が確定。時柱は任意で不明表示可。時刻なし三柱を計算側が保証できない場合は利用不可"],
  "BAZ-02": ["生まれ持った本質", "関係図（命式の対象強調1）", "必要な柱が確定し原文ルールあり"],
  "BAZ-03": ["五行のバランス", "構成比（1）", "集計対象・重み付けが定義され結果あり"],
  "BAZ-04": ["才能・仕事・人間関係", "関係図（1）", "対象星・テーマの参照関係が確定"],
  "BAZ-06": ["10年ごとの運勢", "結果表（1表）", "起運・対象期間・全掲載区間の計算完了"],
  "AST-01": ["あなたのホロスコープ", "天体図（1）", "出生時刻・出生地を含む出生図の必須入力と、定義された天体・ハウス・軸の計算が完了"],
  "AST-02": ["太陽・月・アセンダント", "結果アイコン（最大3表示）", "太陽の確定結果あり。月・ASCは任意で、確度不十分なら未算出表示。太陽も確定できない場合は利用不可"],
  "AST-03": ["惑星が示す個性", "結果表（1表）", "採用天体リストと各計算結果あり"],
  "AST-08": ["総合ホロスコープ鑑定", "なし・文章中心", "総合解説の参照結果と原文組立規則が定義され、必須の確定結果がある。全組合せ専用原文は不要"],
  "ZIW-01": ["あなたの命盤", "命盤（1）", "命盤作成に必要な情報と確定結果あり"],
  "ZIW-02": ["生まれ持った性質", "命盤（命盤対象強調1）", "命盤と参照原文が確定"],
  "ZIW-03": ["十二宮が示す人生", "命盤（命盤1）", "全12宮と必要星曜が確定"],
  "ZIW-07": ["今年の運勢", "命盤（1）", "命盤と作成年の流年結果あり"],
};

const additionalMetadata = {
  "NUM-04":["数字のつながりと9年サイクル","関係図（1）＋期間図（現在位置1）","登録済み関係ルールと9年周期の現在位置が確定"],"NUM-05":["他のナンバーとの相関図","関係図（1）","補助ナンバー種類と関係ルールが定義済み"],"NUM-07":["生命の樹・数秘マップ","配置マップ（1）","採用する数秘マップ体系、配置規則が確認済み"],"NUM-08":["ふたりの数秘・相性鑑定","関係図（2名比較1図）","2名の対象結果と採用済み相性ルールあり"],"NUM-09":["恋愛・結婚の傾向","結果アイコン（関連結果のみ）","本人の関連コアとテーマ対応ルールあり"],"NUM-10":["仕事・適職・才能","関係図（1）","関連結果とテーマ対応ルールあり"],"NUM-11":["金運・お金との向き合い方","結果アイコン（関連結果）","関連結果と登録解説ルールあり"],"NUM-12":["家族・親子の数秘","関係図（1）","2名の結果と親子・家族の関係種別あり"],"NUM-13":["人生の重要な転機","期間図（1図、2系列）","各期間・開始終了・値が確定"],"NUM-14":["今月のテーマ","期間図（作成月1）","作成月の結果と原文あり"],
  "TAR-03":["過去・現在・未来の流れ","カード配置図（1）","過去・現在・未来の役割を持つスプレッドのみ"],"TAR-04":["カード同士のつながり","関係図（1）","2枚以上かつ関係規則が定義済み"],"TAR-07":["ふたりの相性・関係性","カード配置図（相性配置1）","2名の役割と相性スプレッド結果が確定"],"TAR-08":["相手の気持ち","カード配置図（相手テーマ1）","相手テーマ対応スプレッドと相手識別あり"],"TAR-09":["恋愛・結婚の行方","カード配置図（恋愛配置1）","恋愛テーマ対応スプレッド確定"],"TAR-10":["仕事・転職の選択","カード配置図（仕事選択配置1）","必要な選択肢が入力済みで対応配置が確定"],"TAR-11":["AとBの選択","カード配置図（1）","二者択一対応スプレッド、A/B入力あり"],"TAR-12":["今後3か月の流れ","期間図（3区間1図）","作成月起点の3区間に対応するスプレッド"],"TAR-13":["障害と解決のヒント","カード配置図（課題解決配置1）","3役割を持つ対応スプレッド確定"],
  "KIG-05":["日々の運勢","方位盤（1）","作成日の確定日盤あり"],"KIG-06":["吉方位と開運行動","方位盤（1）","基準地点・期間・判定規則・確定方位あり"],"KIG-07":["運勢のまとめ","期間図（確定期間だけ1図）","対象とする期間と結果が確定"],"KIG-08":["ふたりの九星・相性鑑定","関係図（1）","2名入力、星・相性規則が確定"],"KIG-09":["恋愛・結婚の相性","関係図（恋愛テーマ1）","2名入力と該当原文ルールあり"],"KIG-10":["仕事・職場の人間関係","関係図（2名1図）","2名と職場テーマ入力、規則あり"],"KIG-11":["転職・独立のタイミング","期間図（年/月比較1図）","年/月の結果とテーマ規則あり"],"KIG-12":["引越し・旅行の方位","方位マップ（1）","出発地・目的地・目的、作成日から固定した対象期間、その期間の確定方位結果がある"],"KIG-13":["家族・親子の相性","関係図（家族2名1図）","2名と家族関係種別・原文あり"],"KIG-14":["9年間の運勢","期間図（9年1図）","9年分の確定結果あり"],
  "BAZ-05":["人生のエネルギー","結果表（1表）","掲載対象柱の確定十二運あり"],"BAZ-07":["これからの運勢","期間図（大運＋当年1表）","大運と年運結果あり"],"BAZ-08":["ふたりの命式・相性鑑定","結果表（1）","2名の必要柱・相性規則が確定"],"BAZ-09":["恋愛・結婚の傾向","関係図（関連星強調1）","本人結果と登録テーマルールあり"],"BAZ-10":["仕事・適職・社会運","関係図（仕事強調1）","関連結果と原文ルールあり"],"BAZ-11":["財運・お金との関係","関係図（五行・通変星の確定配置1）","財星の扱いと解説規則が確定"],"BAZ-12":["家族・親子の関係","結果表（家族2名1）","2名と家族テーマ原文あり"],"BAZ-13":["今年・来年の運勢","期間図（2年比較1）","2年分と対応大運が確定"],"BAZ-14":["人生の重要な転機","期間図（1）","境界の日時・年齢・関係規則が確定"],
  "AST-04":["4元素のバランス","構成比（1）","集計方式と4値が確定"],"AST-05":["行動と変化のパターン","構成比（1）","3値と集計ルールあり"],"AST-06":["惑星同士の関係","天体図（1図＋必要なら一覧）","計算側で採用されたアスペクト集合あり"],"AST-07":["人生のテーマ","天体図（関連領域強調1）","出生時刻・出生地・ハウスと注目規則あり"],"AST-09":["ふたりのホロスコープ・相性","天体図（2名比較1）","2名の必要入力とシナストリー規則あり"],"AST-10":["ふたりの関係性","天体図（1）","2名入力・採用コンポジット方式が確定"],"AST-11":["恋愛・結婚の傾向","天体図（関連天体強調1）","テーマの参照対象と原文が確定"],"AST-12":["仕事・適職・キャリア","天体図（MC・関連ハウス強調1）","出生時刻・地とテーマ結果あり"],"AST-13":["金運・価値観","天体図（関連ハウス強調1）","ハウス算出可能かつ参照規則あり"],"AST-14":["今後1年間の運勢","期間図（対象期間1図＋表）","対象期間の計算完了、イベント採否規則あり"],"AST-15":["人生の転機","期間図（確定周期1図）","採用周期・期間と確定イベントあり"],"AST-16":["家族・親子の相性","天体図（家族2名1）","2名の必要結果と家族テーマ規則あり"],
  "ZIW-04":["主星が示す才能","結果表（1表）","主星対象リストと確定配置あり"],"ZIW-05":["人生の変化と四化","命盤（1）","四化種別と計算結果が確定"],"ZIW-06":["10年ごとの運勢","結果表（1表）","採用範囲の大限が確定"],"ZIW-08":["ふたりの命盤・相性鑑定","命盤（2命盤比較1）","2名の必要情報・比較ルールが確定"],"ZIW-09":["恋愛・結婚の傾向","命盤（夫妻宮等強調1）","関連宮選定と原文ルールあり"],"ZIW-10":["仕事・社会的な役割","命盤（官禄宮等強調1）","仕事テーマの参照規則あり"],"ZIW-11":["財運・資産の傾向","命盤（財帛宮等強調1）","財運テーマの参照規則あり"],"ZIW-12":["家族・親子の関係","命盤（関連宮・2名比較1）","2名の確定結果と家族比較ルールあり"],"ZIW-13":["人生の転機","期間図（大限・流年の確定期間1図）","対象期間の大限・流年と比較規則が確定"],"ZIW-14":["重要な人生領域","命盤（選択宮強調1）","1つ以上の選択領域と対応結果あり"],
};

export const REPORT_PAGE_DEFINITIONS = Object.entries(groups).flatMap(([methodKey, group]) =>
  Array.from({ length: group.count }, (_, index) => {
    const ordinal = index + 1;
    const metadata = (group.basic.includes(ordinal) ? basicMetadata : additionalMetadata)[`${group.prefix}-${String(ordinal).padStart(2, "0")}`];
    const rendererType = rendererTypeFor(metadata?.[1]);
    return {
      pageDefinitionId: `${group.prefix}-${String(ordinal).padStart(2, "0")}`,
      methodKey,
      tier: group.basic.includes(ordinal) ? "basic" : "additional",
      pageMode: "fixed",
      commentSlots: 1,
      commentDefaultEnabled: true,
      title: metadata?.[0] || null,
      diagramSpecification: metadata?.[1] || null,
      visualRequired: metadata?.[1] !== "なし・文章中心",
      availabilityCondition: metadata?.[2] || null,
      rendererType,
      rendererLabel: reportVisualTypeFor(rendererType).label,
      visualId: metadata?.[1] === "なし・文章中心" ? null : `visual.${group.prefix.toLowerCase()}.${String(ordinal).padStart(2, "0")}.v1`,
      requiredResultKeys: [...(methodResultKeys[methodKey] || [])],
      optionalResultKeys: [],
      unavailableReason: "confirmed-result-contract-required",
    };
  }),
);

export const REPORT_PAGE_DEFINITION_IDS = new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId));

export function reportPageDefinitionsFor(methodKey, planId = "free") {
  return REPORT_PAGE_DEFINITIONS.filter((definition) => definition.methodKey === methodKey && (planId === "pro" || definition.tier === "basic"));
}
