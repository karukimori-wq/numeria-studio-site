# ブロックエディタ起動時の監視ループ｜2026-11-16

## 再現と原因

認証済み検証環境 SHA `72621ff6f39db33128789ed497f19bd6a5a4d9ce` のフォーマット設定は表示され、保存済みMagazine選択も復元できる。しかしブロックエディタを開くとタブの入力と観測が応答しなくなった。

`decorateEditor` はdocument全体のchildListを監視するMutationObserverから呼ばれる。同関数が「自由ページを追加／削除／複製」のtextContentを無条件で再代入していた。ブラウザでは同じ文字列でも子テキストノードを置換するため、再度observerが呼ばれる。開いている間microtaskが連続し、入力処理に戻れない。

## 修正と回帰

3ボタンのtextContentを、現在値と異なる場合だけ更新する。ラベル、固定／自由ページ制約、保存データ、削除処理は変更しない。

実際のdecorateEditor関数を抽出して実行する `verify-block-editor-observer-idempotence.mjs` を先に追加。初回装飾後の再実行でchildList更新が0件となることを検査する。修正前は `3 !== 0` で失敗、修正後は成功。全package test、production build、git diff --check成功。

## 範囲と受入

F1/F2の実操作検査を止めていた起動不具合の修正。PR #95基点の短命ブランチ。preview配信対象へ本ブランチを追加するが、共有D1 migrationは行わない。main／本番未変更。ブラウザ再検査の結果は配信後に追記する。修正だけで43項目の完了数を増やさない。
