# Gate A 監査記録 — 2026-10-15

## 実行環境

- branch / HEAD: `codex/ui-ux-2026-10-08` / `9b66490`
- `origin/main`: `9b66490`（ローカルHEADと一致）
- 実行元: ローカル開発環境

## 正本と公開経路

- build は `vite build` 後に `scripts/restore-original-site.mjs` と各patchを適用する。
- 公開編集入口は `scripts/block-editor-runtime.js` が注入する v3 runtime。
- 保存正本は `GET/PUT /api/report-formats/default` の D1 `workspace_states.app_settings.report_format_blocks_v3`。
- 旧 v2 localStorage は読み込み時に v3へ移行する。localStorageは未送信下書きのみ。
- 正式PDFは `src/worker.js#createReportPdfBase64`、ブラウザ印刷は v3 runtime の `print()` であり、組版は未統合。

## 仕様資料の到達性

READMEで指定されたNotion v1.0/v1.1/v1.2/監査の5 URLは、2026-10-15にアクセスを試行したがこの実行環境では全件 `not accessible` だった。資料にのみある要件は推測で実装しない。

## Gate A 判定

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| mainとの差分監査 | Pass | `origin/main` とHEADが一致 |
| 公開入口の特定 | Pass | build chainと注入runtimeを確認 |
| v3正本の特定 | Pass | runtime / Worker D1経路を確認 |
| 旧データ移行の実証 | In progress | v2読込変換はあるがv1/presetのE2E未実施 |
| Notion仕様の再確認 | Blocked | 実行環境に閲覧権限または接続経路がない |
| 本番・認証済み確認 | Blocked | Clerk認証済みテスト環境がない |

## 以降の保護方針

- P0/P1の受入試験が揃うまで、main反映・完成宣言を行わない。
- 確定結果schema、APC contract、Notion固有の37ビジュアル名称は資料正本を確認してから実装する。
