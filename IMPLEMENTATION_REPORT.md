# ②テンプレート見直し・各占術ビジュアル導入 実装報告

実施日: 2026-10-27  
開始点: `origin/main` / `f6ebfca35638420030aebf5c50095a2a8cdf9cad`  
作業ブランチ: `feat/report-templates-visuals-v1`

## 監査結果とデータフロー

現行アプリは、編集可能な契約・Workerソースを `src/` に置く一方、認証済みワークスペース本体は `assets/numeria-app-Cckhajir.js` を正本バックアップとして保持し、`npm run build` の `restore-original-site.mjs` と一連の `patch-*.mjs` で `dist/` に再生成する構成だった。`dist/` は生成物かつgit管理外である。

レポート設定の流れは次の通り。

1. 固定ページ定義: `src/report-page-definitions.js`
2. 確定結果の入口: `src/divination-result-contract.js`
3. 版付きプリセット正規化: `src/report-template-contract.js`
4. ページと共通描画方式の対応: `src/report-visual-registry.js`
5. standard / magazine の論理構造: `src/report-layout-contract.js`
6. 物理ページ計画: `src/report-physical-page-plan.js`
7. 設定UIへの安全な後付け: `scripts/patch-report-format-settings.mjs`
8. buildで生成されたワークスペースbundleとCSSへ反映

`patch-block-editor*.mjs` と `verify-block-editor*.mjs` は廃止済みの利用者向け自由編集UIと命名が矛盾するが、現状では保存ACK、印刷、AI下書き挿入との回帰契約が残る。今回の②だけで内部処理を削除すると③・④を壊すため、削除していない。新規のレイアウトUIは固定レイアウト選択だけで、自由配置・追加・サイズ変更を提供しない。

## 実装内容

- 85固定ページに安定した `visualId`、12共通 `rendererType`、必須・任意結果キー、利用不可理由を追加。
- 6占術の件数を 14 / 13 / 14 / 14 / 16 / 14 として検証。
- 表紙・依頼内容・自由ページは85件へ混入させず、固定ページだけを台帳で扱う。
- `numeria-report-template.v2` を追加。`layoutId`、`designSetId`、表示設定、背景・配色、固定ページ順を独立保存する。
- 不明な `layoutId` は元値を `requestedLayoutId` に保持して `standard` へフォールバックする。
- 旧プリセットの未知ページと未知フィールドを `migrationAudit` に保持し、黙って破棄しない。
- `standard` と `magazine` の論理ページ構造を追加。命盤、ホロスコープ、多カード配置はレイアウト選択を維持したまま論理ページだけ全幅へ適応する。
- 図表を `break-inside: avoid` / `page-break-inside: avoid` とし、利用者向けの自由配置・サイズ変更UIは追加しない。
- `not-calculated`、`input-incomplete`、`contract-unconnected`、確定済み正常0件 `empty`、描画可能 `ready`、文章中心 `text-only` を分離。
- 装飾素材4点は引き続き `awaiting-confirmed-result-schema`。実結果・Snapshotへ格納する経路は追加していない。
- 現行preset railの横スクロール、44px操作領域、focus-visible、選択状態を再利用。旧presetブランチはmerge/cherry-pickしていない。

## テスト

- 対象契約テスト: 成功
- 全 `package.json#scripts.test`: 成功
- 本番 `package.json#scripts.build`: 成功
- `git diff --check`: 成功
- build後 runtime asset検証: 成功

追加した自動検査は、85件・占術別件数・図表必須82件・文章中心3件、旧プリセット非破壊移行、レイアウト切替時の本文／結果保持、状態分離、Snapshotへの未確定図表混入防止、magazine左右対応、全幅fallback、図表非分割CSSを対象とする。

## ③〜⑥へ残した連携点と制約

- ③: 同じ論理レイアウト入力を供給するが、正式PDF一致と実測ページングの全面改修は行っていない。
- ④: 確定結果Contractだけを受け入れ、APC生成フローは変更していない。
- ⑤・⑥: 既存billing / plan gateを変更・迂回していない。
- 各占術の正式計算Contract、85ページ原文、最終素材・フォント・配色は未確定のため、未接続状態を選択不可として扱う。
- 実ブラウザでの320 / 375 / 768px目視と印刷プレビュー目視は未実施。自動回帰と本番buildは成功している。

## 手動確認

1. `npm run dev` を起動し `/app/settings` を開く。
2. 「レイアウト」でスタンダード／マガジンを切り替え、選択状態と内容保持を確認する。
3. 320 / 375 / 768pxでpreset railとレイアウト選択が横幅を壊さないことを確認する。
4. 確定結果未接続の図表が実結果として表示・保存されないことを確認する。
