# ブロックエディタ受入状況（開始時監査）

更新日: 2026-10-13

## 判定

**Incomplete**。この記録は完成報告ではなく、実装開始時の監査結果である。

| 範囲 | 結果 | 根拠 |
| --- | --- | --- |
| A-01 | Fail | runtime map は作成したが、公開中の SHA と認証済み実画面は未確認 |
| A-02 | Not implemented | 公開runtimeとReact previewの編集入口はv3へ一本化した。旧React component sourceの削除、legacy data cleanup、実機での経路確認が未完了 |
| A-03〜A-07 | Not implemented | v2読み込み移行とACK表示は実装済み。旧presetの保存/復元、revision conflict、owner/tenant E2Eは未検証 |
| B-01〜B-08 | Not implemented | v3は5共通block、位置指定insert、ページ/region CRUD、複製、Undo/Redo、ページ並び替え、blockの上下・列間・次ページ移動を実装。drag/long-pressと移動先選択、実機アクセシビリティは未達 |
| C-01〜C-09 | Blocked | numerology/tarot の確定 result schema・素材、APC contract repository/権限、Character 正本が未確認 |
| D-01〜D-08 | Not implemented | editor、legacy print、Worker PDF が別組版 |
| E-01〜E-07 | Fail | legacy mobile は固定幅、横スクロール、完成 A4 の2列縦積み |
| F-01〜F-06 | Not implemented / Blocked | UI 限定の feature gate はあるが server format authorization、E2E、実機、CI、PR 本番承認が未確認 |

## 実施済みのローカル検証

- `scripts/verify-static-site-with-entrypoint.mjs`: Pass
- `scripts/verify-block-editor-ai-insert.mjs`: Pass（これは旧 runtime の in-memory 下書き挿入だけを確認する）
- `scripts/verify-d1-persistence.mjs`: Pass
- build chain: Pass。Vite build の直後に `original.html` を復元し、旧 block editor と cloud-sync / print / AI insert patch を最終 asset に注入することを再現した。
- `scripts/verify-block-editor-v3.mjs`: Pass。v3 schema、ACK状態、mobile CSS、旧v2 cloud/print patchの除去を確認。

## 実行不能だった検証

- package script としての `npm test`: 実行環境に npm がなく未実行。
- 代替で `pnpm run test`: lockfile/依存関係の状態確認で registry へ接続しようとして失敗。依存関係は変更していない。
- 全 `verify-*.mjs` の一括実行: production host の DNS 解決ができず途中停止。
- CI、認証済み本番、iPhone Safari/Chrome、日本語 IME、実 PDF 比較、別端末復元: このローカル環境に証跡なし。
- ローカルbrowser: 未認証状態まで確認。Clerk設定がローカルでは反映されず、認証後の編集入口をE2E実行できない。

## 次の実装ゲート

1. 公開編集 route と single canonical schema / API を承認して決める。
2. server-side owner/plan/revision validation と migration/rollback を実装・テストする。
3. public runtime を一本化してから、UI、pagination/PDF、AI contract の順に実装する。
