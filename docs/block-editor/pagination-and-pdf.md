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

旧 print patch は localStorage の旧 schema から別 HTML を作り、Worker の PDF は `createReportPdfBase64` による別実装である。共有 physical-page plan は未実装なので、D-01〜D-08 を未達として扱う。
