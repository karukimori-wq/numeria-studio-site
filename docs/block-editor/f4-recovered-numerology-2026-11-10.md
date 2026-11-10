# 作成済み数秘術コードの再利用・現Main接続

## 回収と出典

Notionの以下の添付4件を読み取り取得し、記載SHA-256と一致確認。基点22a756d6を一時ディレクトリへ展開して順に適用し、既存ファイルを回収した。現Mainへ古い累積patchを直接適用してはいない。

| 添付 | SHA-256 | 参照 |
| --- | --- | --- |
| numerology-page-copy-data-46422a5.patch.txt | 115ed2e040aafe78031dd5cf6c5409cd0222789e0935b5e0b2e88a9f5b525134 | https://www.notion.so/400e71121fed81ba8cd3e8103f40f176 |
| numerology-page-copy-runtime-39de03f.patch.txt | 724bc82d8f10bda5f7bf53cbbd26fe614bfb9dda9fa0470f51dd7338a2ed4a9f | 同上 |
| numerology-figures-a4.patch.txt | c076ae41be2ed8939c31f9017fcd95d8d875b1823bb02c8de6b3b05dca6e920e | https://www.notion.so/400e71121fed81daaaf0d1a25e50c543 |
| numerology-name-editing.patch.txt | d5f01e518998fb8c6b434d0aa91cb6215fea8ea633f5252d643b69fe47bc0a01 | https://www.notion.so/400e71121fed81b8afddd355333e33eb |

## 再利用したもの

- 210原文・14ページmanifestを含むnumerology-copy-data.jsは全文を維持。draft/公開無効を維持し、本文を再生成していない。
- numerology-page-copy.jsの44枠の選択・版/一意性検査・人物/結果/期間の束縛・プラン投影。
- numerology-figures.jsの16図表adapter、numerology-figure-renderer.js、numerology-a4.jsの実測による改ページ計画/描画。
- 原文選択21ケースの入力/期待値fixture。期待値を新しい実装から生成していない。

## 現在の実装へ合わせた変更

旧計算器は移植せず、現行numerology-calculator.jsの結果を旧selectorの状態形式へ投影する互換層を追加。計算版は現行v2、氏名は現行の明示確認だけを採用。ピナクルの境界をselector側で再計算せず、現在の計算結果の日付を使用する。これにより2月29日→非閏年3月1日の利用者決定を図表にも反映する。

回収fixtureのNSL-07は旧計算器が不正誕生日でも氏名補助を返していたが、現計算器では不正日付の全体拒否を維持。NSL-11は旧「閏日未決」の停止から、決定済み3月1日へ変更。欠損reasonの内部ラベル差は比較から除き、状態/必要キー/原文ID/枠数は照合する。7ケースの意図的破損注入を独立した計算正解例と数えない。

認証付きPOST /api/numerology/page-draftで現在入力から再計算。署名検証済み本人性とサーバー実効プランを使用し、ブラウザ指定Proを信用しない。Freeは基本4ページの本文だけを返す。210原文のregistryは配信クライアントbundleへ埋め込まない。

実際の復元legacy React入力画面へ、ローマ字確認、明示家族種別/親子方向、登録原文・図表、標準/マガジンの確認用A4を接続。入力が変わった応答を表示せず、本文はReact文字列で描画する。

「原文・図表を確認」を押すと選択参照の保存を有効にする。Fiへ設定・家族入力を含め、下書き保存時にサーバーが原文ID/版/人物/結果参照を再生成してSnapshotへ保持する。本文/図表の完成Reportを永続化する実装ではなく、本文は認証preview APIから現在の権限で取得する。旧下書きは自動でこの機能を有効化しない。

## 検証と限界

210件のID一意性・未承認状態、既存21選択ケース、現計算器との束縛、14ページ44枠97段落/16図表、正常0課題、氏名未確認、家族方向不足、版違い・重複/欠落原文・改変値拒否を検査。

Reactの静的描画とA4計画の寸法fixtureによる段落順序/欠損寸法/巨大図表拒否、署名付きJWTで実APIのFree/Pro/降格/偽Pro、Worker保存/読戻し、既存実SQL/SQLiteで選択参照の永続化を検査。寸法fixtureは実ブラウザ測定ではない。

原文承認・正式発行は行わない。F4全体、F3共通12方式の受入、本番Clerk/D1の実操作、iPhoneとPCの実画面、新しい版での全A4測定/PDF確認は未完。回収元の古いPDF/ブラウザ証拠を今回の版の合格へ流用しない。

次は同じ固定結果から旧8コア表示/AI/PDFの経路を統一し、回収済みの文章編集/独自コメントと固定Report保存を接続する。九星の既存2ブランチは再実装せず差分統合する。
