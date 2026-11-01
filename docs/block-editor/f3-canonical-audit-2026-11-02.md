# F3 正式12方式：実装と受入の区別

正本: https://app.notion.com/p/406e71121fed8140b8b4c6b27f2ee86a
JSON正本: https://app.notion.com/p/3fee71121fed8162802ac12c7097d692

旧 `REPORT_VISUAL_TYPES` は互換用の11描画分類＋text-onlyであり、正式12方式ではない。
正式分類は `REPORT_FIGURE_TYPES`。FIG-CARDSとFIG-SPREADを区別し、文章中心3ページは分類外。
従来のF3-01〜06完了報告は正本の同ID要件の完了証拠として使用しない。

## 今回の開発

- 正式12方式のHTML/SVG描画、状態・必須データ検査、配列順維持、テキストエスケープ。
- 82図表ページの互換分類対応。TAR-02はFIG-CARDS、NUM-04はRELATION＋TIME。
- 確定結果の `figures: [{pageDefinitionId, figure}]` を実ページへ接続。計算版・結果revision・対象者・ページ証拠を照合する。
- 編集、印刷前測定、ブラウザ印刷で同じ描画を使用。sample、未接続、版違い等は発行を阻止。
- JSON正本の12例はそのまま `exampleOnly:true` で検査専用fixtureへ収録。正式出力は拒否。
- サンプル確認用HTML: `node scripts/generate-figure-gallery.mjs` → `output/f3/index.html`。
- 6占術の色は内部既定値。承認済み正式デザインセットの証拠とはしない。

## 未達の受入条件

| 項目 | 状態・理由 |
| --- | --- |
| 12方式の実ブラウザ画像 | 未検証。Computer Useが Local browser use is disabled in Work settings を返した |
| 実計算データ12方式の表示 | 未検証。今回の入力例はサンプル・架空値・部分カバレッジを含む。計算アダプターはF4依存 |
| 完全ホロスコープ・命盤 | 未達。例は6天体／主星のみ。完全図へ昇格させない |
| 正式カード画像素材 | 未接続。assetRefを任意URLとして使用せず、今回は正逆ラベル付きカード枠 |
| 正式デザインセット | 要照合。内部配色を承認済みと扱わない |
| スマホ・A4実物、最小寸法・分割規則 | 未検証。自動HTML検査と実ブラウザ受入を区別する |
| 利用者確認 | 未確認。Notionの利用者チェックは変更しない |

F3全体は未完了。自動テスト成功を実計算・画像・利用者確認の代わりにしない。
全43項目の開発完了数は未再監査、利用者確認数は今回増分0、F3の修正必要は正式分類と描画受入に関する項目。
