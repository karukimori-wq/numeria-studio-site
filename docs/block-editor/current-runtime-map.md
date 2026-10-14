# ブロックエディタ runtime map（2026-10-13）

## 調査対象

- 調査 SHA: `2cec7dc`（作業ブランチ `codex/ui-ux-2026-10-08`）
- 取得済み remote main: `9aa9eb3`
- 想定公開入口: `https://numeria-studio.com/original.html`（`src/worker.js` の release status）

## 現在の配信経路

1. `npm run build` は最初に `vite build` を実行し、React の `src/main.jsx` / `src/styles.css` を `dist` に出力する。
2. 続く `scripts/restore-original-site.mjs` は `original.html` と静的 assets を `dist` に復元する。
3. その後 `scripts/patch-block-editor.mjs` が `scripts/block-editor-runtime.js` を、復元済みの静的 HTML に注入する。
4. `patch-block-editor-cloud-sync.mjs`、`patch-block-editor-print.mjs`、`patch-block-editor-ai-insert.mjs` が旧ランタイムへ追加の DOM patch を注入する。

従って、現在実利用者へ届くブロックエディタは `scripts/block-editor-runtime.js` である。React の `ReportFormatBuilder` は同じ概念の別データ形式を持つが、上記の公開 HTML の入口には接続されていない。

## 現在の二重実装と採否

| 実装 | 保存形式 | 公開経路 | 採否 |
| --- | --- | --- | --- |
| `scripts/block-editor-runtime.js` | `numeria.report-format.blocks.v3`（`pageId`/`layoutRegions`/`blockId`） | `original.html` へ build patch 注入 | 現在の唯一の公開編集経路。v2 は読み込み時に v3 へ変換する |
| `src/main.jsx` `ReportFormatBuilder` | `numeria:report-format:v1:{workspaceId}`（`sections`） | Vite bundle 内だが `original.html` の実編集入口ではない | 正本候補。公開 route へ一本化するまで単独で機能追加しない |

公開 route は静的 shell に注入される v3 runtime に固定した。React previewからも `ReportFormatBuilder` の編集入口を外し、v3と別形式の編集UIを利用できないようにした。将来のReact shell移行は、v3 importerを持つ置換PRとしてのみ行う。

## 既知の不適合

- v3 は固定 `620px` とモバイルでの2列縦積みを撤去した。320px以上の実機/スクリーンショット検証は未実施。
- v3 は owner-scoped `/api/report-formats/default` のPUT成功応答を確認後にだけ「サーバー保存済み」と表示する。Workerはv3 schemaとrevision conflictを検証する。複数formatのFree/Pro上限とplan別機能の検証は未実装。
- v3 の印刷は同一v3 documentを入力にする。Worker正式PDFとの共有physical-page planは未実装。
- React builderはブラウザ保存のみで、公開経路からは到達しない。

## 変更時の確認方法

`npm run build` 後に `dist/original.html` の script/asset を検査し、実編集入口、最終 JS/CSS、保存 API、PDF 出力が単一の正本 schema を参照することを自動テストで確認する。main への push は行わない。
