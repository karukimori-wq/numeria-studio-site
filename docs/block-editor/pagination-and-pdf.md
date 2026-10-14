# A4 組版と PDF

## 共有する組版入力

editor preview、print preview、正式 PDF は同じ Format v3 と physical-page plan を入力にする。A4 は 210 × 297mm 縦、余白と style を明示した print CSS を使う。

## 分割規則

- 実描画した font、font size、line-height、column width、実改行に基づいて高さを測る。文字数で決めない。
- 本文と AI 文章は段落境界を優先し、必要時は行境界で継続する。見出しを単独行にしない。
- 図表、カード、ビジュアルは途中で分割しない。過大なら比例縮小の警告を出す。
- 2列の片列が溢れたら、次の physical page の 1列へ継続する。両列が溢れた場合は左列から右列の読書順で継続し、空白は保持する。
- 手動改ページは LogicalPage / Region の操作であり、内容の増減による physical page の統合・削除とは別である。

## 現状

ブラウザ印刷は `src/report-physical-page-plan.js` の physical-page plan を使用する。プレビューで測定した各ブロックの実高を入力にし、計測値が欠ける場合は印刷を開始しない。計画器は次を実装済みである。

- logical page と手動改ページを physical page に展開する
- 2列領域の初頁は2列を維持し、溢れた続きだけを1列にする
- 見出し／ページタイトルと直後のブロックを同じ physical page に置く
- ブロック高がA4本文領域を超えた場合に警告する

この計画器は `scripts/patch-block-editor.mjs` により公開ランタイムへ注入され、`scripts/verify-report-physical-page-plan.mjs` で2列継続、未計測値、見出し孤立防止を検証する。

残りの制約は明示する。本文を行単位で分割する処理、カード／図表の縮小UI、正式PDF（Worker の `createReportPdfBase64`）への同じ plan の適用は未実装である。従って D-01〜D-08 全体を完了とは扱わず、ブラウザ印刷のブロック境界組版までを実装済みとする。
