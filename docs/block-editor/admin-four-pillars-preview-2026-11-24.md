# 管理者用の四柱14ページ下書き確認

通常のページ一覧は実契約のまま保持し、計算入力に「管理者用：全14ページの下書きを確認」を別途追加した。既存の保存済み下書きとrendererを使い、A4改ページ検査も利用できる。管理者検証・契約変更なし・未承認・正式発行不可を表示する。通常のFree/Proカタログ、保存上限、使用量、課金、正式発行contract、承認storeは変更しない。

GET `/api/admin/four-pillars-draft-definitions` は既存のサーバー認証でverifiedとadminModeの両方を要求する。返すのは14ページの定義だけで、利用者や保存データを取得せず、DB書込み・usage迂回も行わない。未認証401、通常ユーザー403、GET以外405、no-store。UIのroleはボタン表示だけに使い、サーバーで再確認する。

非同期応答後に保存中・鑑定切替・フォーム置換・閉じたエディタを検出し、古い画面を開かない。認証失敗は通常見本を案内し、ボタンを再利用可能へ戻す。

二軸レビューで既存の管理者判定を補強。未署名のclient-emailヘッダーを管理者根拠として転送・採用する経路を除去し、Backendメールはverification.statusがverifiedのものだけを採用。管理者ID allowlist・署名済みメール・検証済みBackend照合は保持する。

実helperを使った回帰は、一般の認証済みユーザー＋管理者メールヘッダーが修正前200→修正後403。正規ID/署名メール/verified Backendは200、unverified Backend403、未認証401を確認した。専用フォーム検査では遅延応答・鑑定切替・閉エディタ・失敗時の制御復帰を確認。全npm test/buildと、修正後の仕様/規約・セキュリティレビューが成功。実Free/Pro別受入・正式PDF・専門承認と混同しない。main/本番Worker/DB schemaは変更しない。

配信run45281961439成功、preview SHA13766aa10921c40950dbcfc5ad468fe3fe170531一致。noindex/no-store、未ログインの専用API401 AUTH_SESSION_REQUIREDも確認。Chromeの既存ログインが失効していたため、管理者の14件表示とA4実画面は利用者の再ログイン待ち。実画面合格には加算していない。
