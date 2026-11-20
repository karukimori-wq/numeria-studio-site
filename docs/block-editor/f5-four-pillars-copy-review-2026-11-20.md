# 四柱128原文の内容確認用資料

登録原文・shortの専門確認を進められるよう、正本128部品と14ページ割当を35ページの確認用PDFと、確認欄がすべてnullのJSONへまとめた。正本は https://app.notion.com/p/3ffe71121fed81559799c75b93cd6c57 （2026-11-20再取得、最終編集2026-10-20）。原文版ns.baz.copy.draft.2026-10-20.1、全件draft・releaseEnabled=falseを維持する。

これは原文を読むための開発補助資料で、アプリの鑑定書を出力したPDFではない。専門承認・素材承認、正式A4組版・改ページ・アプリ生成PDFの受入は未完。前回の計算/図表/原文見本は引き続き未承認で、正式発行/ネイティブ印刷guard・承認storeは変更していない。Notionの「私の確認」も変更しない。

PDFは表紙1ページ、14ページ割当2ページ、原文4件ずつ32ページ。各部品にcopyId・全文・短文・版・草案状態と未記入の確認結果/確認者/メモ欄を置いた。JSONは同じ本文と出所、データSHA256、review.decision/reviewer/date/comment=nullを保持。記入した内容をアプリ承認へ自動で取り込む処理はない。

生成前に、正本の節・行・用途列からID→本文を復元し、128件のID集合と各本文を厳密照合する。「本文が正本のどこかにある」だけでは合格にしない。shortは各本文の最初の一文と一致。本文交換・原文変更・誤ID・重複行・未知節を拒否する回帰を追加。正本の構造が変わった場合は推測せず停止する。

検証: 全npm test成功。35ページ、128本文/短文/IDがそれぞれ想定ページに収録、14割当、全ページ未承認、確認欄null、AcroFormなし、全文の印字領域内をpypdf/pdfplumberで確認。全35ページをPNGへレンダリングし、全ページ一覧と代表ページの詳細画像を目視確認。専門的な本文の妥当性をこの技術検査で承認したものではない。

証拠はevidence/2026-11-20/four-pillars-copy-review.pdf、four-pillars-copy-review-data.json、copy-review-pdf-proof.json、copy-review-cover.png、copy-review-page-04.png。データSHA256は42b091c10321576fef5ac8eae7030345b196bb8364f5f7fe272f47c445a1fede。正式受入0/85、開発完了1/43・利用者確認0/43を維持する。

再生成手順（元のNotion取得JSONと日本語TrueTypeフォントが必要）:

```sh
node scripts/build-four-pillars-copy-review.mjs source.json review-data.json
python3 scripts/render-four-pillars-copy-review.py review-data.json review.pdf /path/to/japanese-font.ttf
python3 scripts/verify-four-pillars-copy-review-pdf.py review-data.json review.pdf proof.json
```

確認結果を扱う際はcopyId・原文版を指定し、修正案/内容確認/保留を分ける。本文の変更・専門承認・アプリへの登録版更新・正式PDFの発行判定は別の作業として記録する。
