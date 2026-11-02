// Notion 06, fetched 2026-11-02. These are required references, not claims
// that an API with matching keys is already connected.
export const REPORT_RESULT_REFERENCE_SOURCE = "https://app.notion.com/p/3fee71121fed810fb3b9eb2c7fa839eb";
export const REPORT_RESULT_REFERENCES = Object.freeze([
  {
    "pageDefinitionId": "NUM-01",
    "resultReference": "8コア全件",
    "publicationRule": "各コアの短い意味。全8結果が必須",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "NUM-02",
    "resultReference": "lifePath・birthdayNumber・destiny",
    "publicationRule": "本質・才能・社会での役割を3枠へ固定",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "NUM-03",
    "resultReference": "soul・maturity・personalYear",
    "publicationRule": "内面・成長・今年の流れを3枠へ固定",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "NUM-04",
    "resultReference": "lifePath・destiny→maturity、personalYear",
    "publicationRule": "計算上のつながりと現在周期を説明。性格の因果線は作らない",
    "figureTypes": [
      "FIG-RELATION",
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "NUM-05",
    "resultReference": "nameDigitCounts・missingDigits・mostFrequentDigits",
    "publicationRule": "未出現と最多の意味。同率・該当なし対応。氏名必須",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "NUM-06",
    "resultReference": "personalYears（基準年±4）",
    "publicationRule": "9年の年別原文、当年を強調",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "NUM-07",
    "resultReference": "8コア・由来区分・計算上の依存",
    "publicationRule": "役割別マップの読み方。全8コア確定必須",
    "figureTypes": [
      "FIG-MAP"
    ]
  },
  {
    "pageDefinitionId": "NUM-08",
    "resultReference": "2名のlifePath中心＋共通確定補足項目",
    "publicationRule": "2名比較の短い意味と関わり方。スコアなし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "NUM-09",
    "resultReference": "soul・personality・lifePath",
    "publicationRule": "恋愛観・距離感・結婚観。参照項目が必要",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "NUM-10",
    "resultReference": "birthdayNumber・destiny・lifePath",
    "publicationRule": "才能・働き方・社会との関わり",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "NUM-11",
    "resultReference": "soul・destiny・lifePath",
    "publicationRule": "お金の価値観と行動上の視点。金額予測なし",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "NUM-12",
    "resultReference": "2名の比較結果・家族関係種別",
    "publicationRule": "本人／相手／関わり。家族全員へ拡張しない",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "NUM-13",
    "resultReference": "pinnacles・challengeNumbers",
    "publicationRule": "ピナクル期間＋期間を持たない課題一覧",
    "figureTypes": [
      "FIG-TIME",
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "NUM-14",
    "resultReference": "personalMonth・基準年月",
    "publicationRule": "対象月の数とテーマ",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "TAR-01",
    "resultReference": "spreadId/version・positions・cards",
    "publicationRule": "全必要位置が確定。相談本文は短い問いのみ",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-02",
    "resultReference": "全positionsのcardId/orientation",
    "publicationRule": "位置順のカード固有原文。画像・原文欠落は発行阻止",
    "figureTypes": [
      "FIG-CARDS"
    ]
  },
  {
    "pageDefinitionId": "TAR-03",
    "resultReference": "past・present・future/near-future",
    "publicationRule": "three-time／horseshoe-seven／celtic-crossのみ",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-04",
    "resultReference": "spread定義の役割接続・確定カード",
    "publicationRule": "2枚以上。時間順・分岐・役割を示し因果を作らない",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "TAR-05",
    "resultReference": "message／future／a-outcome+b-outcome／outcome",
    "publicationRule": "対応スプレッド表に限定。回答を組み立てる原文とコメント",
    "figureTypes": []
  },
  {
    "pageDefinitionId": "TAR-06",
    "resultReference": "action／attitude",
    "publicationRule": "relationship-six／horseshoe-seven／problem-solving-threeのみ",
    "figureTypes": []
  },
  {
    "pageDefinitionId": "TAR-07",
    "resultReference": "relationship-sixの6位置・2名の役割",
    "publicationRule": "相性・関係性。氏名等の相手識別は必要、出生年月日は不要",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-08",
    "resultReference": "relationship-six.other-feeling・relationship-now",
    "publicationRule": "相手の立場を読む解説。事実として心理を確定しない",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-09",
    "resultReference": "relationship-six・恋愛テーマ",
    "publicationRule": "関係性の恋愛テーマ解説。対象相手あり",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-10",
    "resultReference": "choice-five・仕事テーマ・A/B名称",
    "publicationRule": "仕事選択の過程・可能性",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-11",
    "resultReference": "choice-five・A/B名称",
    "publicationRule": "A/B各2位置＋比較。勝率スコアなし",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "TAR-12",
    "resultReference": "three-months.month-0/1/2・基準年月",
    "publicationRule": "作成月・翌月・翌々月を年月ラベル付きで固定",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "TAR-13",
    "resultReference": "problem-solving-three.problem/background/action",
    "publicationRule": "課題・背景・行動を別原文で表示",
    "figureTypes": [
      "FIG-SPREAD"
    ]
  },
  {
    "pageDefinitionId": "KIG-01",
    "resultReference": "honmei・getsumei",
    "publicationRule": "2星必須。未確定を推測表示しない",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "KIG-02",
    "resultReference": "honmei・getsumei・各五行",
    "publicationRule": "各星の性質を基本とし、必要な関係だけ登録原文で補足",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "KIG-03",
    "resultReference": "yearBoard・honmeiPosition・節年区間",
    "publicationRule": "年全体と本人回座宮のテーマ",
    "figureTypes": [
      "FIG-DIRECTION"
    ]
  },
  {
    "pageDefinitionId": "KIG-04",
    "resultReference": "monthBoard・honmeiPosition・節月区間",
    "publicationRule": "月全体と本人回座宮。年運の長文再掲なし",
    "figureTypes": [
      "FIG-DIRECTION"
    ]
  },
  {
    "pageDefinitionId": "KIG-05",
    "resultReference": "dayBoard・基準日",
    "publicationRule": "採用済み日盤方式による対象日のテーマ",
    "figureTypes": [
      "FIG-DIRECTION"
    ]
  },
  {
    "pageDefinitionId": "KIG-06",
    "resultReference": "yearDirectionAssessment・monthDirectionAssessment",
    "publicationRule": "8方位の理由と年/月共通吉。日盤で上書きしない",
    "figureTypes": [
      "FIG-DIRECTION"
    ]
  },
  {
    "pageDefinitionId": "KIG-07",
    "resultReference": "当年の確定年盤・12節月と本人回座宮",
    "publicationRule": "確定節年内の月別テーマ。点数折れ線なし",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "KIG-08",
    "resultReference": "2名のhonmeiと五行、共通確定getsumei",
    "publicationRule": "五行関係を方向付きで比較。善悪・優劣判定なし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "KIG-09",
    "resultReference": "2名比較・恋愛関係種別",
    "publicationRule": "距離感・関わり方。08の基本文再掲なし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "KIG-10",
    "resultReference": "2名比較・職場関係種別",
    "publicationRule": "協力の視点。職場全体ネットワークなし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "KIG-11",
    "resultReference": "当年・当節月の本人回座と原文",
    "publicationRule": "年/月の仕事テーマ比較。未来適日検索なし",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "KIG-12",
    "resultReference": "manualDirection・目的・年/月判定",
    "publicationRule": "8方位を手動指定。住所・距離・予定日不要",
    "figureTypes": [
      "FIG-GEO"
    ]
  },
  {
    "pageDefinitionId": "KIG-13",
    "resultReference": "2名比較・親子等の関係種別",
    "publicationRule": "星の違い・関わり方。家族全員一括なし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "KIG-14",
    "resultReference": "基準節年から9節年のyearBoards",
    "publicationRule": "対象区間と9年テーマ。数秘の前後4年設定と混同しない",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "BAZ-01",
    "resultReference": "確定year/month/day柱・任意hour柱",
    "publicationRule": "確定三柱必須。時柱不明を明記",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-02",
    "resultReference": "dayStem・参照命式",
    "publicationRule": "日干の性質と命式内の位置",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "BAZ-03",
    "resultReference": "visibleElementCounts・includedPillars",
    "publicationRule": "6字または8字の構成数。蔵干を足さない",
    "figureTypes": [
      "FIG-BALANCE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-04",
    "resultReference": "tenGods・対象柱",
    "publicationRule": "才能・仕事・対人の概要。日主自身を独立の通変星として誤算しない",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "BAZ-05",
    "resultReference": "twelveStages・掲載柱",
    "publicationRule": "十二運の配置・意味。数値エネルギーへ変換しない",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-06",
    "resultReference": "yunStart・dayunIntervals",
    "publicationRule": "起運後の大運区間を一覧表示。掲載区間を版付きで明記し、全掲載区間が対応範囲内で確定",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-07",
    "resultReference": "基準日時点の大運・節年年運",
    "publicationRule": "現在の大運と当年テーマ。大運未確定は不可",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "BAZ-08",
    "resultReference": "2名の日干・確定柱・採用干合支合冲",
    "publicationRule": "比較概要と存在する関係だけを解説",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-09",
    "resultReference": "dayStem・dayBranch・関連tenGods",
    "publicationRule": "本人の恋愛・結婚観。性別から相手の属性を決めない",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "BAZ-10",
    "resultReference": "tenGods・dayStem・対象柱",
    "publicationRule": "才能を働き方・社会的役割へ展開",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "BAZ-11",
    "resultReference": "wealthTenGods・dayStem・配置",
    "publicationRule": "財星に関する読み方。資産・利益の数値予測なし",
    "figureTypes": [
      "FIG-RELATION"
    ]
  },
  {
    "pageDefinitionId": "BAZ-12",
    "resultReference": "2名の確定命式・親子等関係種別",
    "publicationRule": "構成差と関わり方。相手命式の代用禁止",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "BAZ-13",
    "resultReference": "作成節年と翌節年の年運・対応大運",
    "publicationRule": "2年の違いを比較。範囲外を短縮しない",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "BAZ-14",
    "resultReference": "現在大運と次大運・境界日時・命式関係",
    "publicationRule": "次の切替を中心に解説。現在大運の一覧再掲なし",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "AST-01",
    "resultReference": "10天体の度数・ASC/MC・12ハウス",
    "publicationRule": "出生時刻・地必須の完全出生図",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-02",
    "resultReference": "確定Sun.sign・任意Moon.sign/ASC.sign",
    "publicationRule": "太陽必須。月・ASCの不足を明示",
    "figureTypes": [
      "FIG-RESULT"
    ]
  },
  {
    "pageDefinitionId": "AST-03",
    "resultReference": "採用10天体の確定位置",
    "publicationRule": "全採用天体が必要。星座のみ確定の値を度数に偽装しない",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "AST-04",
    "resultReference": "10天体のelementCounts",
    "publicationRule": "各1票。ASC/MCは除外、母数10を明示",
    "figureTypes": [
      "FIG-BALANCE"
    ]
  },
  {
    "pageDefinitionId": "AST-05",
    "resultReference": "10天体のmodalityCounts",
    "publicationRule": "活動・不動・柔軟を各1票、母数10",
    "figureTypes": [
      "FIG-BALANCE"
    ]
  },
  {
    "pageDefinitionId": "AST-06",
    "resultReference": "出生図採用aspects",
    "publicationRule": "5種類・用途別オーブ。0件は正常説明",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-07",
    "resultReference": "1/4/7/10ハウス・所在天体",
    "publicationRule": "本人・基盤・対人・社会の4領域を固定参照。時刻・地必須",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-08",
    "resultReference": "Sun/Moon・確定主要配置・採用aspects",
    "publicationRule": "確定結果から強み／課題を整理。参照範囲を保存",
    "figureTypes": []
  },
  {
    "pageDefinitionId": "AST-09",
    "resultReference": "2名の確定天体・crossAspects",
    "publicationRule": "シナストリー。時刻不明で確定できない度数は対象外",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-10",
    "resultReference": "compositePlanets・任意compositeAxes/Houses",
    "publicationRule": "短弧中点の合成図。本人出生図と混同しない",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-11",
    "resultReference": "Venus/Mars・確定Moon、任意7ハウス",
    "publicationRule": "恋愛傾向。必要なVenus/Mars確定、ハウス不足を代用しない",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-12",
    "resultReference": "MC・2/6/10ハウス・関連天体",
    "publicationRule": "MCとハウス確定必須",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-13",
    "resultReference": "2/8ハウス・Venus・所在天体",
    "publicationRule": "価値観と金銭との関わり。ハウス必須",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "AST-14",
    "resultReference": "出生確定度数と1暦年のtransitEvents",
    "publicationRule": "期間計算完了。該当0件は正常",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "AST-15",
    "resultReference": "土星・天王星・海王星・冥王星の出生天体への採用イベント",
    "publicationRule": "AST-14と同じ対象1年から長期天体イベントを抽出。独立の点数周期を作らない",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "AST-16",
    "resultReference": "2名のSun/Moon/Mercury・採用crossAspects・家族種別",
    "publicationRule": "家族テーマへ参照対象を限定。必要天体の度数が未確定なら対応関係を確定しない",
    "figureTypes": [
      "FIG-ASTRO"
    ]
  },
  {
    "pageDefinitionId": "ZIW-01",
    "resultReference": "12palaces・starPlacements・soul/body・fiveElementClass",
    "publicationRule": "完全命盤。時刻必須",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-02",
    "resultReference": "命宮・身宮と所属主星",
    "publicationRule": "命宮と身宮の役割を分ける。無主星を計算失敗にしない",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-03",
    "resultReference": "12宮・各宮星曜",
    "publicationRule": "各宮の短い基本説明。選択宮詳細と分離",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-04",
    "resultReference": "14主星の確定配置",
    "publicationRule": "星IDごとの意味と配置。解説対象は異なる掲載主星",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "ZIW-05",
    "resultReference": "natalFourTransformations",
    "publicationRule": "生年四化を掲載。流年四化と別キー",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-06",
    "resultReference": "decadalIntervals",
    "publicationRule": "採用版の起限による大限区間を掲載。掲載範囲を明記し、数え年と西暦期間を併記",
    "figureTypes": [
      "FIG-TABLE"
    ]
  },
  {
    "pageDefinitionId": "ZIW-07",
    "resultReference": "作成基準日に属する旧暦年のannualChart/annualFourTransformations",
    "publicationRule": "流年命盤。旧暦年度の開始・終了を明記",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-08",
    "resultReference": "2名の命/身宮・14主星・対応人生領域",
    "publicationRule": "別命盤を並列比較。架空の合盤・飛化を自動新設しない",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-09",
    "resultReference": "夫妻宮・命宮・福徳宮と星曜",
    "publicationRule": "本人傾向。相手の実際の感情を確定しない",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-10",
    "resultReference": "官禄宮・命宮・遷移宮と星曜",
    "publicationRule": "仕事・社会・外での役割",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-11",
    "resultReference": "財帛宮・田宅宮・福徳宮と星曜",
    "publicationRule": "お金・資産への姿勢。資産額予測なし",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-12",
    "resultReference": "2名の命宮・父母宮・子女宮＋家族種別",
    "publicationRule": "双方の命盤を参照。本人だけで相手を代用しない",
    "figureTypes": [
      "FIG-ZIW"
    ]
  },
  {
    "pageDefinitionId": "ZIW-13",
    "resultReference": "現在・次大限と境界年の流年",
    "publicationRule": "大限切替と流年の参照結果を別表示",
    "figureTypes": [
      "FIG-TIME"
    ]
  },
  {
    "pageDefinitionId": "ZIW-14",
    "resultReference": "選択宮1〜12件と各宮の星曜",
    "publicationRule": "宮を所定リストから選択、概要より深い解説",
    "figureTypes": [
      "FIG-ZIW"
    ]
  }
].map(row => Object.freeze({ ...row, figureTypes: Object.freeze(row.figureTypes), connectionStatus: "unconnected" })));

export function reportResultReferenceFor(pageDefinitionId) {
  return REPORT_RESULT_REFERENCES.find(row => row.pageDefinitionId === pageDefinitionId) || null;
}
