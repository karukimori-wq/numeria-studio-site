# 数秘術のローカルA4配置検査

Pro検証用アカウントについて利用者が「いまはない」と回答。実契約Freeの進行中四柱案件は変更せず、認証付きPro受入とは分けて、現行数秘術rendererのローカル配置検査を実施した。管理者UIのBusiness表示を実Proと見なさず、プランや権限を変更しない。

## 対象と結果

現行のbuildNumerologyRegisteredDraftとReactのNumerologyA4Viewをそのままlocalhostへ構築。架空の本人・相手、確認済み氏名、固定基準日2026-11-26から、通常／氏名未確認／相手なし／親子方向なし／不正日付の5条件×14ページ×2レイアウト＝140ケースを作成。PC1280×1300、320×900の各140/140がPASS。320pxのdocument横幅は320px以内。

氏名未確認でも氏名を必須としない06/08/12/13/14は利用可。相手なしは08/12、親子方向なしは12だけが停止。不正日付は全14を停止する。生成時に期待対象集合をassertし、単に全ページ停止しても合格しない。

原文単位ID・本文・注記・図表IDの順序／個数を改ページ前後で照合し、A4寸法、本文領域内の上下左右、子孫要素、SVG内部、HTMLの横overflowを実測。過大SVG・負の位置・SVG viewport外の子要素を意図的に配置し、同じ検査器が3件とも拒否することを確認した。登録原文210件・21選択fixture・14ページ44枠97段落16図表・氏名確認・Free/Pro投影の既存自動検査もPASS。

証拠JSONはsource HEAD、生成tool/runtimeと全数秘術ソース等のSHA-256、入力case/draftのSHA-256、React/ReactDOM/Viteの実版、viewportを保持する。両軸レビューの計測不足・版追跡不足を修正し、再レビューの必須指摘なし。

## 再現

`node scripts/build-numerology-a4-lab.mjs` でローカルoutput/numerology-a4-lab/distを生成し、localhostへ配信して「全140ケースを検査」を実行する。srcのアプリコード、API、承認store、保存制限、main、本番Worker、DB schemaは変更していない。生成bundleはGitへ追加せず、210件の原文を公開サイトへ配信しない。

証拠: evidence/2026-11-26/numerology-a4-local-desktop.json、numerology-a4-local-mobile.json、numerology-num07-desktop.png、numerology-num13-mobile.png。数秘マップと転機の画面を目視確認した。

## 判定の範囲

これはローカル配置検査で、実アプリ全体のCSS・認証API・保存復元・実Proアカウント・正式PDFの受入ではない。SVG等の境界検査は意味内容の正解や文字同士の重なりを保証せず、320pxで縮小した紙面の判読性も別途確認が必要。原文・素材の専門承認は行っていない。

正式85ページ受入0/85、開発確認済1/43・利用者確認済0/43を維持する。Notion「私の確認」は変更しない。次は適切な検証アカウントが用意できた時点で、数秘術の認証付き保存復元・全14ページ／両配置を確認する。
