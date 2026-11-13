import assert from 'node:assert/strict';
import { LunarUtil } from 'lunar-typescript';
import { pillarTenGod, pillarTwelveStage, fixedPillarDetails } from '../src/four-pillars-fixed-tables.js';
import { buildFourPillarsPageData } from '../src/four-pillars-page-data.js';
// Literal normative rows transcribed from the user-confirmed 100-pair table.
// These are rule compliance fixtures, not independent natal-chart acceptance.
const stems='甲乙丙丁戊己庚辛壬癸', branches='子丑寅卯辰巳午未申酉戌亥';
const rows=[
 '比肩 劫財 食神 傷官 偏財 正財 偏官 正官 偏印 印綬',
 '劫財 比肩 傷官 食神 正財 偏財 正官 偏官 印綬 偏印',
 '偏印 印綬 比肩 劫財 食神 傷官 偏財 正財 偏官 正官',
 '印綬 偏印 劫財 比肩 傷官 食神 正財 偏財 正官 偏官',
 '偏官 正官 偏印 印綬 比肩 劫財 食神 傷官 偏財 正財',
 '正官 偏官 印綬 偏印 劫財 比肩 傷官 食神 正財 偏財',
 '偏財 正財 偏官 正官 偏印 印綬 比肩 劫財 食神 傷官',
 '正財 偏財 正官 偏官 印綬 偏印 劫財 比肩 傷官 食神',
 '食神 傷官 偏財 正財 偏官 正官 偏印 印綬 比肩 劫財',
 '傷官 食神 正財 偏財 正官 偏官 印綬 偏印 劫財 比肩',
].map(row=>row.split(' '));
for(let day=0;day<10;day++)for(let target=0;target<10;target++)assert.equal(pillarTenGod(stems[day],stems[target]),rows[day][target]);
// Fixed-library compatibility is explicitly separate from the normative table.
for(const stem of stems)for(let b=0;b<12;b++){
 const offset=LunarUtil.CHANG_SHENG_OFFSET[stem];
 const expected=LunarUtil.CHANG_SHENG[((offset+(stems.indexOf(stem)%2===0?b:-b))%12+12)%12];
 assert.equal(pillarTwelveStage(stem,branches[b]),expected==='临官'?'建禄':({'长生':'長生','冠带':'冠帯','帝旺':'帝旺','沐浴':'沐浴','衰':'衰','病':'病','死':'死','墓':'墓','绝':'絶','胎':'胎','养':'養'}[expected]||expected));
}
assert.equal(pillarTenGod('','甲'),null);assert.equal(pillarTenGod('甲','甲乙'),null);assert.equal(pillarTwelveStage('甲','invalid'),null);
const pillars={year:'甲子',month:'乙丑',day:'丙寅',hour:'丁卯'};
const details=fixedPillarDetails(pillars);
assert.equal(details.data.rows.find(row=>row.pillar==='day').stemTenGod,'日主');
assert.ok(!details.data.placements.some(item=>item.pillar==='day'&&item.position==='天干'));
assert.deepEqual(details.data.rows[1].hiddenStems.map(item=>[item.role,item.stem]),[['本気','己'],['中気','辛'],['余気','癸']]);
assert.equal(fixedPillarDetails({...pillars,hour:null}).data.rows.length,3);
assert.equal(fixedPillarDetails({...pillars,day:'甲丑'}).data,null);
const zero=fixedPillarDetails({year:'甲子',month:'甲子',day:'甲子',hour:null});assert.deepEqual(zero.data.wealthPlacements,[]);
const input={methodKey:'four-pillars',birthClock:{date:'2000-01-07',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null},referenceDate:'2026-11-13'};
const pages=buildFourPillarsPageData(input);
assert.equal(pages.pages.filter(page=>page.data!==null).length,8);
assert.ok(pages.pages.every(page=>page.publicationAllowed===false));
assert.equal(pages.pages[4].data.rows.length,3);
const missing=buildFourPillarsPageData({...input,birthClock:{...input.birthClock,date:'2026-02-04'}});
assert.ok(missing.pages.filter(page=>!['BAZ-06','BAZ-07','BAZ-08','BAZ-12','BAZ-13','BAZ-14'].includes(page.pageDefinitionId)).every(page=>page.state==='required-missing'&&page.data===null));
assert.deepEqual(pillars,{year:'甲子',month:'乙丑',day:'丙寅',hour:'丁卯'});
console.log('Four Pillars fixed tables: 100 normative pairs, 120 library-compatible stages, explicit hidden-stem roles, day-master exclusion, wealth zero, 8 page adapters and missing-clock guards PASS. No independent chart or formal publication claim.');
