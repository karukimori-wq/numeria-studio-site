import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const legacyBundle = readFileSync("assets/numeria-app-Cckhajir.js", "utf8");
const patchSource = readFileSync("scripts/patch-legacy-static-assets.mjs", "utf8");

const count = (source, value) => source.split(value).length - 1;

// The checked-in legacy bundle is the input to the production restore/patch step.
// These assertions intentionally verify the exact legacy targets so a bundle change
// cannot silently disable the admin preview patch.
assert.equal(count(legacyBundle, "let r=ar!==`free`;"), 1);
assert.equal(
  count(
    legacyBundle,
    "p=d!==s||r?.plan===`free`?[d]:f.includes(d)?f:[d,...f]",
  ),
  1,
);
assert.equal(
  count(
    legacyBundle,
    "タロットを選んだFreeユーザーはタロットを利用できます。",
  ),
  1,
);
assert.equal(
  count(
    legacyBundle,
    "無料版では最初に使う占術を1つ選びます。タロットを選ぶとタロットを利用できます。",
  ),
  1,
);
assert.equal(
  count(
    legacyBundle,
    "category:`卜術`,adminOnly:!0,defaultMenuName:`タロット3枚引き`,defaultPrice:5500,statusNote:`現在は管理者だけが確認できます。`",
  ),
  1,
);
assert.equal(count(legacyBundle, "xr=l===`tarot`&&tr===`admin`"), 1);
assert.equal(
  count(
    legacyBundle,
    "di=()=>{if(l===`tarot`&&tr!==`admin`){u(`numerology`),k(`account`),B(`タロットは現在、管理者確認用です。命術を選択してください。`);return}Ce(W.defaultMenuName),Te(W.defaultPrice),k(`reading`),re(`edit`)}",
  ),
  1,
);
assert.equal(count(legacyBundle, "na.filter(e=>e.category===`命術`).map(e=>"), 1);

// Admin preview must bypass only feature-preview gates. The real subscription
// plan (ar) remains the source for CURRENT PLAN and is never rewritten to Pro/Business.
assert.match(patchSource, /ar!==`free`\|\|tr===`admin`/);
assert.match(patchSource, /r\?\.plan===`free`&&tr!==`admin`/);
assert.match(patchSource, /ADMIN PREVIEW/);
assert.match(
  patchSource,
  /管理者プレビュー：実契約プランは変更せず、開発中を含む全占術を確認できます。/,
);
assert.match(
  patchSource,
  /タロットを選んだFreeユーザーはタロットを利用できます。Proでは数秘術など他の占術と併用できます。/,
);
assert.match(
  patchSource,
  /category:`卜術`,defaultMenuName:`タロット3枚引き`,defaultPrice:5500,statusNote:`タロット鑑定、スプレッド、カード意味辞典、鑑定書プレビューに対応しました。`/,
);
assert.match(
  patchSource,
  /xr=l===`tarot`/,
);
assert.match(
  patchSource,
  /tarot new reading redirect/,
);
assert.match(
  patchSource,
  /na\.filter\(e=>e\.category===`命術`\|\|e\.id===`tarot`\)\.map\(e=>/,
);
assert.doesNotMatch(patchSource, /ar\s*=\s*`(?:pro|business)`/);
assert.doesNotMatch(patchSource, /plan\s*:\s*`business`/);

console.log("Admin developer preview patch contract verified.");
