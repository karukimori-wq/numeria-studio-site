# F4 九星14ページ計算adapter・下書きcheckpoint

最新main: c24ca9ffa09b56c1149ecbee142ce6c6ccc59134（数秘の#87/#88/#89を含む）。F4ブランチへ取り込み、package.jsonの競合は数秘・九星双方の検査を保持して解消。F3 #80は取り込んでいない。PR #86の継続でありmain merge／本番公開なし。

## 今回の変更

九星KIG-08/09/10/11/12/13へ、本人と相手の五行関係、恋愛／仕事／家族の関係種別、作成年／節月の回座、手動8方位と目的を接続。これで14ページに計算用adapterあり。五行比較関数は再構築ブランチe59dbcbのkigaku-remaining-pages.jsから同一コードを抽出し再利用。原文catalogやRendererを移植して完成と見せていない。

ページ別必須／任意入力一覧を定義し、85ページ台帳へ反映。出生時刻不明で必要な星が一意でない場合はrequired-missing。2名比較の月命星は両方確定時だけ追加し、それ以外はoptional-missing。本命星の比較を月命星不足で止めない。人物ID不足・本人相手同一ID・関係種別なし・未対応目的・中宮指定を不足とする。相手入力の異常が本人の年盤・日盤等を消さない。

state（計算の利用可否）、optionalInputs、copyState、assetState、reviewStateを別に保持し、available／optional-missing／valid-zero／required-missing／calculation-error／unconnected／source-missing／asset-missing／review-requiredを区別。正常0件は共通吉方位が空の場合だけ。凶と判定された指定方位も有効な判定であり、必須不足と混同しない。期間外の年／月判定を黙示短縮しない。

## 保存の境界

src/kigaku-calculation-checkpoint.jsは、明示的なkigakuInputを持つ九星下書きへだけ加算する純粋helper。既存の生日・出生地を自動で確認済み日本時計へ変換しない。旧下書きと未知フィールドは保持、入力を破壊せず、確定／完了Snapshotは自動更新しない。正式Result Keyやconfirmedは生成せず、publicationAllowed=falseを保存。

入力・基準瞬間・人物・revision・計算版・14ページ結果と各不足理由をcheckpointへ含め、再計算によるスコープ／改変検出を実装。これは自己整合の検査であり独立正解検証ではない。

既存Worker実SQLをSQLiteで実行し、隔離fixture workspaceでsave-draft→session取得の往復を確認。14ページcheckpoint、編集済み本文、未知フィールドが一致。既存の元Report、CAS競合、書込失敗等の回帰検査も維持。識別／D1 transportはfixture。本番D1確認やClerk実ログイン確認ではない。

本番UIからこのhelperを呼ぶ実装はまだない。正式Report Snapshotへの取込も未実装。保存helperのテストを利用者が画面操作できる状態と誤記しない。

## 独立照合

- 既存3節気（立春・夏至・冬至）の公表分精度fixtureは維持。
- Notionの五行対応・相生・相剋・人物方向の確定規則から、81組の期待値表を手動導出し固定。計算関数で期待値を生成していない。81組すべて一致。入力・期待値・実値・Calculator version・fixture/module SHA256をevidence/kigaku-pair-run-2026-11-09.jsonへ保存。
- 81組は規則の手計算との照合。出生星・全日盤・許容全期間・ページ全体の独立合格ではない。全ページindependent verifiedは0。

## 確認したテスト

npm test／npm run build。九星全14ページ、9状態、任意月命星、人物識別、関係種別、指定方位／目的、時刻不明境界、範囲外、相手異常の分離、未知フィールド、JSON保存復元、改変0／発行フラグ／古い基準日／異占術を検査。Worker SQL/SQLite往復も追加。

## 状態

connected 0、partial 28（数秘14＋九星14）、unconnected 57。browser verified 0、PDF verified 0、independent page verified 0。数秘は最新mainに承認対象照合と確認依頼UIあり、正式ページの原文／図表接続は未完。四柱・西洋・紫微・タロットは参照Mappingのみ、正式計算への接続なし。

## 次の3作業

1. 九星再構築Reading入力とF4 checkpointを既存アプリの保存／再開UIへ接続し、隔離previewで本人／相手・不足表示・保存ACKを実ブラウザ検証。
2. 正式honmei_star／getsumei_starとページ固有結果の承認scopeを整え、F3契約へ渡すadapterを実装。草案原文・素材・Renderer未受入を発行許可にしない。
3. 四柱の既存remoteブランチを棚卸し、採用lunar-typescript 1.8.6と確定三柱／任意時柱の接続を別PRへ分離。
