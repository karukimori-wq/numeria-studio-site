# F4 九星計算データ接続 — 初回Draft

基準main: e791da40a2c702eff4f3e5bc100a0a47ad2f9c0a。PR #81/#83/#84/#85 merged。F3 #80はDraft、取込・mergeなし。

## 再利用と接続範囲

`codex/rebuild-kigaku-20261024` の e59dbcb から以下を改変せず再利用：japan-birth-clock、kigaku-solar-calendar、kigaku-dayboard、kigaku-result、kigaku-directions、kigaku-period-seriesと既存5検査。元ファイルの実SHAは `git ls-tree origin/codex/rebuild-kigaku-20261024 src/` で追跡可能。再構築ブランチ全体のmergeではなく計算モジュールのみの移植。既存Report Snapshot／Worker／D1／下書きは変更しない。

`buildKigakuPageData` はKIG-01/02/03/04/05/06/07/14の計算データを返す。availableは値の利用可能性だけ。publicationAllowed=false、verificationState=review-requiredを維持。KIG-08/09/10/11/12/13はadapter未実装。sourcePathsは実在するローカルフィールドであり正式Result Keyを新設しない。85ページ台帳はJSONとMarkdown、再生成スクリプト付き。

境界不明はrequired-missing、共通吉0件はvalid-zero、計算例外はcalculation-error、異占術入力はunconnected。正式原文／図表接続は未実装。optional-missing／source-missing／asset-missingを含む全体状態schemaは後続。revision/subjectは外部からの参照情報で、これだけで確認済みや発行可能にはならない。

## Calculator棚卸し

| 占術 | 現行main／既存ブランチで確認したもの | 正式接続の不足 |
| --- | --- | --- |
| 数秘 | src/numerology-calculator.js、14ページpreview、checkpoint | Confirmed adapter、全氏名独立照合、原文／図表、画面／PDF |
| 九星 | main旧bundleは2月4日固定の概算。再構築ブランチに節入り・日盤・方位・期間・Report Snapshot実装あり | 今回8ページadapter。6ページadapter、正式key contract、UI/D1へのF4統合 |
| 四柱 | 旧bundleの干支・蔵干等のコード、固定節気表 | 採用lunar-typescript 1.8.6の依存・精密計算器・F4 adapterはmainにない |
| 西洋 | 旧bundleの星座・簡易入力経路 | Astronomy Engine採用版を今回依存に追加。ハウス／軸／天体／イベントadapterは未接続 |
| 紫微 | 旧bundleに未完成の命盤経路 | iztro 2.6.3依存・正式命盤adapterはmainにない |
| タロット | 旧bundleに6スプレッド・カード入力 | 安定位置IDの8スプレッド台帳、確定Draw Result、13ページadapter未接続 |

これは現行mainと九星ブランチの監査。全remoteブランチの全コード不存在を主張しない。台帳の必須入力は占術共通前提とページ別掲載条件までで、全85ページのフィールド単位schema完成ではない。

## 検証証拠と制限

- npm test、npm run build成功。既存SQLite保存／再開・未知フィールド保持等の回帰を含む。
- 九星：1944方位ルール組合せ、時刻不明、節入り境界、夏時間重複／欠落、範囲外の期間短縮拒否、JSON round trip、異占術の混入防止を検査。
- 独立比較：Notion 07に登録済みの国立天文台2026年立春・夏至・冬至の分精度値3例を再実行、すべて±60秒以内。入力・期待値・実値・出典・版・SHA256はevidence/kigaku-reference-run-2026-11-08.json。出典ページ自体の再取得ではなくNotion固定fixtureとの比較。
- 3例は節気だけ。九星全星・全日盤・全ページ合格、全許容年代の独立検証とは扱わない。
- 実ブラウザ、F4九星のD1 API往復、正式Report Snapshotへの接続、PDFは未検証。JSON round tripをD1／Report Snapshot受入と呼ばない。
- 既存アプリから新adapterはまだ呼び出さない。利用者が確認できる新機能URLは未作成。現在の本番URLで今回の変更を確認できるとは案内しない。

## 次の3作業

1. 再構築ブランチの残6ページをF4 contractへ再利用し、必須／任意／0件／原文／素材／確認状態を完全に分離。
2. 九星Reading SnapshotとF4 checkpointの統合、D1保存／再開・古いデータ保持を検証し、隔離previewで実ブラウザ受入。
3. 四柱の既存ブランチと採用計算器を照合し、正式三柱＋任意時柱から別PRを開始。

F4は未完了。85ページ受入：connected 0、partial 22（数秘14＋九星8）、unconnected 63、independent verified 0、browser verified 0、PDF verified 0。数秘11例・九星節気3例の部分照合と、ページ合格数を区別する。
