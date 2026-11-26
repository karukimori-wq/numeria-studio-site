import assert from "node:assert/strict";
import { kigakuDayboard, KIGAKU_DAYBOARD_SCHEMA, KIGAKU_DAYBOARD_VERSION } from "../src/kigaku-dayboard.js";

const atSolsticeAnchor = kigakuDayboard("2024-06-29");
assert.equal(KIGAKU_DAYBOARD_VERSION, "ns.kigaku.koyomi8-jst.v1");
assert.equal(atSolsticeAnchor.schemaVersion, KIGAKU_DAYBOARD_SCHEMA);
assert.equal(atSolsticeAnchor.interval.dayIndex, 0);
assert.equal(atSolsticeAnchor.interval.initialStar, 9);
assert.equal(atSolsticeAnchor.centerStar, 9);
assert.equal(kigakuDayboard("2024-06-30").interval.dayIndex, 1);
assert.equal(kigakuDayboard("2024-12-21").verificationStatus, "calculated-not-independently-verified");
assert.throws(() => kigakuDayboard("2024-02-30"), /KIGAKU_DATE_INVALID/);
assert.throws(() => kigakuDayboard("1900-12-31"), /KIGAKU_DATE_OUT_OF_RANGE/);
assert.throws(() => kigakuDayboard("2101-01-01"), /KIGAKU_DATE_OUT_OF_RANGE/);
console.log("Kigaku dayboard contract verified.");
