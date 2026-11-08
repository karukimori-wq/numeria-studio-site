import assert from "node:assert/strict";
import {
  KIGAKU_SOLAR_VERSION,
  kigakuAnnualCenter,
  kigakuBoardFromCenter,
  kigakuMonthCenter,
  kigakuSolarPeriod,
  kigakuSolarTerms,
} from "../src/kigaku-solar-calendar.js";

assert.equal(KIGAKU_SOLAR_VERSION, "ns.kigaku.solar-jst.v1");
const terms = kigakuSolarTerms(2026);
assert.equal(terms.length, 12);
assert.deepEqual(terms.map((term) => term.name), ["立春", "啓蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]);
assert.deepEqual(terms.map((term) => term.jstDate), ["2026-02-04", "2026-03-05", "2026-04-05", "2026-05-05", "2026-06-06", "2026-07-07", "2026-08-07", "2026-09-07", "2026-10-08", "2026-11-07", "2026-12-07", "2026-01-05"]);

for (const term of terms.slice(0, -1)) {
  const exact = kigakuSolarPeriod(term.instant);
  const before = kigakuSolarPeriod(new Date(Date.parse(term.instant) - 1).toISOString());
  assert.equal(exact.period.index, term.solarMonthIndex);
  assert.notEqual(before.period.index, exact.period.index);
}
assert.equal(kigakuAnnualCenter(2026), 1);
assert.equal(kigakuMonthCenter(2026, 0), 8);
assert.deepEqual(kigakuBoardFromCenter(1), { C: 1, NW: 2, W: 3, NE: 4, S: 5, N: 6, SW: 7, E: 8, SE: 9 });
assert.throws(() => kigakuSolarTerms(2200), /KIGAKU_YEAR_OUT_OF_RANGE/);
assert.throws(() => kigakuBoardFromCenter(0), /KIGAKU_CENTER_STAR_INVALID/);
console.log("Kigaku solar calendar contract verified.");
