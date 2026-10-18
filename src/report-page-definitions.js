const groups = {
  numerology: { prefix: "NUM", basic: [1, 2, 3, 6], count: 14 },
  tarot: { prefix: "TAR", basic: [1, 2, 5, 6], count: 13 },
  "nine-star-ki": { prefix: "KIG", basic: [1, 2, 3, 4], count: 14 },
  "four-pillars": { prefix: "BAZ", basic: [1, 2, 3, 4, 6], count: 14 },
  "western-astrology": { prefix: "AST", basic: [1, 2, 3, 8], count: 16 },
  "zi-wei-dou-shu": { prefix: "ZIW", basic: [1, 2, 3, 7], count: 14 },
};

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

export const REPORT_PAGE_DEFINITIONS = Object.entries(groups).flatMap(([methodKey, group]) =>
  Array.from({ length: group.count }, (_, index) => {
    const ordinal = index + 1;
    const metadata = basicMetadata[`${group.prefix}-${String(ordinal).padStart(2, "0")}`];
    return {
      pageDefinitionId: `${group.prefix}-${String(ordinal).padStart(2, "0")}`,
      methodKey,
      tier: group.basic.includes(ordinal) ? "basic" : "additional",
      commentSlots: 1,
      commentDefaultEnabled: true,
      title: metadata?.[0] || null,
      diagramSpecification: metadata?.[1] || null,
      availabilityCondition: metadata?.[2] || null,
    };
  }),
);

export const REPORT_PAGE_DEFINITION_IDS = new Set(REPORT_PAGE_DEFINITIONS.map((definition) => definition.pageDefinitionId));

export function reportPageDefinitionsFor(methodKey, planId = "free") {
  return REPORT_PAGE_DEFINITIONS.filter((definition) => definition.methodKey === methodKey && (planId === "pro" || definition.tier === "basic"));
}
