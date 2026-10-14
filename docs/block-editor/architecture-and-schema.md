# ブロックエディタ正本 Schema と移行方針

## 方針

Format version 3 を唯一の編集正本にする。物理 A4 page は組版の派生値であり、保存しない。全 ID は UUID 相当の新規値を用い、複製で再利用しない。

## 正本の形

```text
Format { schemaVersion, formatId, templateId, templateVersion,
         selectedDivination, globalStyle, allowedFeatures, pages[] }
LogicalPage { pageId, title, position, regions[], manualBreakBefore }
LayoutRegion { regionId, position, columns: 1|2, ratio,
               columnBlocks: Block[][] }
Block { blockId, type, position, style, content, dataBinding, aiConfig }
ReportSnapshot { snapshotVersion, format, characterSnapshot,
                 confirmedResult, renderedLayout, generatedAt }
```

`type` は `page-title`、`heading`、`body`、`ai-text`、`divider` のみを共通 block とする。占術専用 block は selectedDivination の確定値 schema と素材がある場合だけ validation を通す。未対応の占術は追加パネルに出さない。

## 互換読み込み

- React v1 (`sections` / `id`) と旧ランタイム v2 (`columns` / `id`) は read-only importer で v3 に変換する。
- importer は元データと source version を backup payload に残す。公開ランタイムでは v1/v2 を初めて v3 へ移す前に `numeria.report-format.blocks.migration-backup.v1` へ元JSONとsource keyを保存する。変換不能な block は削除せず migration error として利用者に示す。
- v3 を旧形式へ自動で書き戻さない。旧 runtime は v3 が存在すると編集不能な移行案内だけを表示する。

## ロールバック

サーバーは各 update 前の document と version を保存する。migration 実行中は source record を immutable backup として保管し、ロールバックはその backup を同一 tenant/owner にだけ復元する。現在の公開ランタイムで実装済みなのは、上記の端末内backupから同じ importer を再実行する障害時復帰までである。サーバー側の immutable backup と復元APIは未実装であり、クライアント local cache はクラウド正本を上書きしない。

## Report Snapshot

鑑定完了操作だけが、確定計算結果、Character snapshot、format v3、組版済み physical-page plan を snapshot する。AI 下書き生成と PDF 再出力では snapshot/event/count を新規作成しない。
