# AI contract 移行

現行 `studio-ai-report.v1` の sections 返却を破壊しない。block ごとの生成が必要な場合は、互換な新 version を professional-platform-contracts 側で先に schema 化し、正常・blockId 不一致・参照切れの例と contract test を追加する。

AI request には `blockId`、commentPurpose、contextMode、sourceBlockIds、sourceDataKeys、customInstruction、Character snapshot/version、Tone、Task、confirmed result を分離して渡す。AI response は `blockId` 一致を検証後に draft としてだけ保持し、採用操作前の既存本文を上書きしない。

本リポジトリ単独では APC contract の変更権限と contract test が確認できていない。よって blockId API、Character snapshot、ページ/全体生成は Blocked であり、暫定 DOM 挿入を完成機能として扱わない。
