# 保存・競合・復元

## 正本と表示

クラウドの owner-scoped format record が正本である。ブラウザは ACK 待ちの下書きだけを持つ。画面の状態は `未保存`、`保存中`、`サーバー保存済み`、`保存失敗（再試行）` の四つに限定し、HTTP 成功 ACK 前に保存済みと表示しない。

## API 契約（実装予定）

- `GET /api/report-formats/default` は認証済み owner の document、revision、schemaVersion を返す。
- `PUT /api/report-formats/default` は owner、v3 schema、expectedRevision を Worker 側で検証する。plan entitlement は未実装である。
- revision 不一致は `409 FORMAT_CONFLICT` と current document を返し、利用者に再読み込み/複製保存を選ばせる。
- 所有者が異なる formatId は存在を明かさず 404 とする。

## 復元と失敗

ログイン直後および他端末相当の起動時には server document を読み、同一 schema を hydration する。ネットワーク失敗時は変更を local draft queue に残し、再試行では expectedRevision を保持する。local draft だけをクラウド保存済みと表記しない。

## 現状

`src/worker-entry.js` の `/api/report-formats/default` はD1のowner-scoped workspace recordを介して、v3 schemaとrevision conflictを検証する。旧patchのv2 generic saveは公開bundleから撤去した。plan entitlement、複数format、実端末復元のE2Eは未実装または未検証なので、受入 A-05/A-06/A-07 はPassにしない。
