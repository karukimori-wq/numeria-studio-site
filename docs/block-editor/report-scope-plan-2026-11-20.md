# ページ定義・保存scopeの実契約判定

管理者用アカウントはBusiness UIプレビューを持つが、現行の `developerPreviewMetadata` は `subscriptionPlanUnaffected:true`、`serverUsageBypassEnabled:false` とする。管理者UIを実Pro契約と読み替えず、契約・管理者allowlist・DB・使用量制限は変更しない。

別件として、`src/worker-entry.js` の `resolveAuthenticatedScope` が `/api/usage` の応答を `usageBody.planId` から読んでいた。実応答は `src/worker.js` の `{usage:{planId}}` であり、実ProでもFreeへfallbackしていた。これはページ定義とレポート形式保存のscopeに共通する。

`usageBody.usage?.planId === "pro"` の場合だけPro、それ以外はFreeへ正規化する。Freeは四柱5ページと自由3ページ、Proは四柱14ページと自由30ページの既存規則を使う。管理者UI用Business投影や、クライアントのplan/管理者ヘッダーを根拠にしない。

回帰コマンド: `node scripts/verify-report-scope-plan.mjs`。実entrypointをVMで実行し、core `/api/usage` の応答境界のみstub。修正前は `nested pro usage must determine catalog plan: free !== pro`、修正後はFree5/Pro14とscope整合が成功。偽top-level Pro、Freeに重ねたPro、未知Business/invalid、偽ヘッダー、認証401の維持を確認。全npm test/buildも成功。実Proアカウントの認証付き受入とは別である。

管理者向けに全ページをサーバーで検査できる機能を追加する場合は、既存のUI限定プレビューとは別の仕様・認証境界が必要。今回の修正はその権限拡張を含めない。main/本番Worker/DB schemaは未変更。

二軸レビューで、隣接する既存のバックアップ復元POSTが構造検証だけを行い、現在のpageLimitを適用していないことも発見。Pro時のバックアップをFree降格後に復元すると3ページを超過できた。構造検証の後に現在プランの上限検証を追加し、超過は400 `REPORT_FORMAT_PAGE_LIMIT_EXCEEDED`、書込なし、バックアップ保持の案内とした。元のバックアップを短縮・削除しない。

追加回帰は実POST経路で修正前 `free restoration must obey current page limit: 200 !== 400` を再現。修正後Free3/Pro30は成功、Free4/Pro31は理由付き拒否し、拒否時D1書込0を確認。通常保存と復元の上限を一致させる修正で、利用者の契約や管理者権限を変えない。

両修正後の全npm test/build成功。仕様軸・規約/セキュリティ軸の再レビューとも残る指摘なし。
