# F1–F5 再監査と統合候補｜2026-11-13 JST

## 判定

全43項目の最終完了ではない。Notionの開発確認済み1/43（F1-01）・利用者確認済み0/43を保持する。今回の変更はDraftの統合候補で、main／本番には未反映。85ページの正式受入合格0/85。承認済み原文・素材・実認証・実PDF・独立照合を自動テストで代替しない。

依頼元はローカルの `numeria_studio_codex_F1-F5_completion_20261113` 全8指示書。既存作業フォルダの未コミット数秘術編集は変更せず、独立cloneで作業。

## 開始時の取得

最新main: `5d002e2818e2385f896f3a7243024c98488ddda7`（#93）。全remote headsをfetchし再計算した。対象DraftはGitHub接続でもopenを確認。

| PR | ahead | behind | 扱い |
| --- | ---: | ---: | --- |
| #94 四柱 | 3 | 0 | mainの計算器を置換すると時刻不明／節入り境界の対応が後退するため、必要な契約だけ移植 |
| #86 九星 | 9 | 4 | mainと統合し、Workerで数秘の登録原文選択と九星checkpointを合成 |
| #80 F3 | 2 | 11 | mainの数秘／タロットruntimeと印刷基盤を保持して統合 |
| #45 PDF ACK | 2 | 41 | mergeせず、ACK厳格化と失敗12ケースのみ移植 |

開始時のopen PRは #43/#45/#73/#80/#82/#86/#94。mainのF1 #50–56、F2 #57–66、F3 #67–79、F4 #81/#83–85/#87–93はコード／履歴上の実装範囲であり、受入完了ではない。

本番と検証サイトの `/version` はともに `0.3.12-report-delivery-status` を返したがSHAなし。GitHub接続のmain workflow/status取得は空だったため、実デプロイSHAは確認不能。mainと同一と推定しない。検証サイトはChromeでログイン画面まで到達、認証済み操作は未実施。

## 変更と不具合修正

- 日本出生時計の正本を `japan-birth-clock.js` に一本化。従来の `normalizeJapanBirthTime` は互換adapterとし、既存呼出しのエラーと明示offset契約を保持。
- 四柱はmainのJST/CST節入り処理・sect=2・時刻不明の三柱／境界停止を保持。BAZ-01/02/03へ計算データを対応付ける。BAZ-04〜14は未接続と理由を明示。正式Result Keyや専門承認は捏造しない。
- 九星の計算／14ページadapter／入力UI／保存をmainと合成。利用者本文と未知フィールドを保持。
- F3は正式12方式を統合。sampleと未接続full-chartは正式出力不可のまま。
- PDF完了処理はHTTP成功だけで進めず、success status、対象Session ID一致、非空Report IDを要求。
- 二軸レビューでNUM-13のFIG-TABLE欠落、九星のconfirmed/completedを使った再計算回避、再保存による夏時間fold選択消失を発見し修正。85件の図表割当を正本へ直接接続し全件比較。状態偽装はWorker実SQL/SQLiteで再計算・draft保存を確認。

## 証拠

- `f1-f5-audit-43-2026-11-13.json`: 43項目の保守的分類。
- `f1-f5-acceptance-85.json` / `.md`: 85行の占術・tier・必要結果・実装source path・承認・2レイアウト・mobile・PDF・プラン・異常系の台帳。全行未完了。
- `evidence/2026-11-13/f3-sample-*.jpg`: Chrome上のサンプル描画。正式実データの画像ではない。
- `evidence/2026-11-13/f3-sample-widths.json`: Standard/Magazine × 320/375/390/768/1280/794px、12図表、article横はみ出し0。794pxは画面上のA4相当幅で、印刷PDFの検査ではない。
- 自動検査: 全既存testとbuild、四柱23時境界4例・夏時間4年gap/fold・三柱/六字と四柱/八字、九星1944方位組合せ・81手動比較・3節気、全85図表割当、ACK失敗12ケース、Worker SQLite保存復元。
- 新規四柱fixtureは採用ライブラリ回帰と内部整合。独立命式の合格数へ加算しない。

## 残件と必要な操作

1. 検証サイト `https://integration-preview.numeria-studio.com/app/home` で検証用Free/Proにログインし、プランを確認する。資格情報はチャットへ送らない。今回branchのデプロイ先は別途必要で、既存previewを今回変更の証拠にしない。
2. 承認済み原文／素材の正本、承認者・日時・版が必要。現仕様の1,386原文はdraft／公開無効であり、Codexは承認を生成しない。
3. 四柱残11ページ、ASTRO/ZIW full-chart、タロット13ページの正式原文／素材／図表接続、独立照合を継続する。今回統合だけではこれらが完成したとはしない。
4. 今回branchの認証付き保存→再開→再編集→PDF、Free/Pro、全85ページ×2レイアウト、スマホ、アプリ生成PDFは未検証。
5. 公開／本番migration／main mergeは今回実施しない。開発証拠が揃った対象だけを利用者確認待ちへ進める。

## レビューとrollback

Standards: 文書化された規約違反0、割当重複1件（NUM-13）を修正。Spec: 具体的不具合3件を修正し再レビュー合格、受入不足1件は継続。レビュー後の図表／checkpoint／入力フォーム／Worker SQLite検査も成功。

rollbackはmain／本番未変更のため不要。統合候補を採用しない場合はDraftを閉じる。後日の採用はPR単位でrevert可能にし、#45の古いruntimeは復活させない。D1 migration追加なし。
