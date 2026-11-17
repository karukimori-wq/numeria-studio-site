# F4 西洋占星術：5ページ計算投影

main `5d002e2818e2385f896f3a7243024c98488ddda7` 起点の `codex/f4-astrology-results`。既存 `calculatePlanetPositions`（Astronomy Engine 2.1.19）、`calculateAspect`、`normalizeJapanBirthTime` を再利用。四柱系#94/#95/#96/#99やF3 #80をマージしていない。

正本はNotion85ページ一覧 `3fbe71121fed813abb45c7377a6073be`、決定37〜51/81/83と実装定義 `3fee71121fed81ab8cbfc5c9f1558f42`。地心・光行差を含む見かけの真黄道／真春分点、10天体各1票、ASC/MC加算なし。出生日時は日本の歴史時計をUTCへ正規化し、夏時間gap拒否・fold明示offset選択を維持。

| ページ | 計算source path | 限定・不足 |
| --- | --- | --- |
| AST-02 | planets.Sun / planets.Moon | 太陽・月のみ。ASC=null / optional-missing |
| AST-03 | planets | 採用10天体、黄経・黄緯・サイン。ハウスなし |
| AST-04 | elementCounts | 10票、4区分と0を保持 |
| AST-05 | modalityCounts | 10票、3区分と0を保持 |
| AST-06 | aspects | 既存5アスペクト・出生図オーブを再利用。天体45組のみ。ASC/MCアスペクトはunconnectedで完全出生図ではない |

残11ページはunconnected。汎用natal_chartキー宣言は存在するが、正式結果へのadapterとして接続したと偽装せず、本PRはローカルsource pathのみ。全ページpublicationAllowed=false、原文source-missing、図表asset-missing、review-required。AST-08は図表なしだが本PRの共通asset状態は未評価であり、図表必須と解釈しない。正式図表要否は85行台帳のvisualTypeを参照。

時刻不明時の全日区間保証は未実装。正午も仮ASCも代入せず、対象5ページはrequired-missing / UNKNOWN_TIME_INTERVAL_ADAPTER_UNCONNECTED。座標未入力でも地心天体は計算可能。国内出生確認を必須とし、東京等の仮座標を使わない。ハウス・軸・期間イベント・相性・合成図・テーマ参照は未接続のまま。

## 検証

- 16ページschema、5投影／11未接続、票数10、0区分、サイン半開境界、異占術隔離、入力非破壊、JSON保存復元の等価性。
- 不正度数・天体不足／重複・sample・座標系違いの拒否。出生／基準日範囲、時刻不明、日本確認不足、DST gap/foldを検査。
- 既存独立JPL fixture6例（Sun/Moon/Mars/Jupiter/Neptune/Pluto、2000-01-01T12:00Z）を出生時計→計算→AST-03データ経路で再照合。入力・期待値・実値・出典・計算版・fixture SHA256・PASSは `evidence/2026-11-17/astrology-reference-results.json`。今回新規にJPLへ問い合わせたものではない。残4天体／全期間／完全出生図／完全ページの正解確認には加算しない。
- 四柱や九星の計算結果を読み込まない。持込のresult/confirmed値を参照せず入力から再計算。DB schemaと保存APIを変更せず顧客データへ書き込まない。
- npm test / npm run buildを実行。実D1保存・実ブラウザ・アプリPDFは未検証。JSON等価性をD1受入の代用にしない。

## 85行再棚卸し

`f4-cross-branch-ledger-20261117.json` と同名Markdownに全85行を記録。数秘14(main)、九星14(#86)、四柱10(#99)、タロット13(main)、西洋5(本枝)、紫微0の計算投影が実在する。**connected 0 / partial 56 / unconnected 29**。これは各枝の計算投影を数えた台帳で、一つの統合ビルドで動作した56ページではない。四柱#94起運helperと#99の10ページは合算しない。旧33/52からの増分には既存mainタロット13ページの再分類が含まれ、今回23ページを新規実装したという意味ではない。

正式ページ単位の独立・Browser・PDF合格はいずれも0。#99の入力／下書き結果プレビュー・保存／復元実画面証拠は限定的な開発証拠として別記し、正式原文／図表つき全ページの受入へ昇格しない。

## 再現・次の接続

本枝checkout後、`npm install --ignore-scripts`、`node scripts/verify-astrology-page-data.mjs`、`node scripts/verify-astrology-references.mjs`、`node scripts/generate-f4-cross-branch-ledger.mjs`。現時点でこのadapterの配信preview URLはない。UIへ未接続のため、既存previewで確認済みと記録しない。

次は版付き計算checkpoint／既存Session保存経路、時刻不明区間保証、独立照合済みPlacidus/ASC/MCの接続。原文・F3図表・Browser/PDF受入は別途必要。main反映／本番公開なし。
