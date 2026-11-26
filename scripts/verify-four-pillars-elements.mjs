import assert from 'node:assert/strict';
import {countVisiblePillarElements as count} from '../src/four-pillars-elements.js';
// Independent manual fixture BAZ-ELEMENT-COUNT from Notion 07.
const source='https://app.notion.com/p/3fee71121fed8162802ac12c7097d692';
const input={year:'甲子',month:'乙丑',day:'丙寅',hour:'丁卯'};
const result=count(input);
assert.deepEqual(result.data.visibleElementCounts,{wood:4,fire:2,earth:1,metal:0,water:1});
assert.equal(result.data.total,8);assert.equal(result.publicationAllowed,false);
const three=count({...input,hour:null});assert.equal(three.data.total,6);assert.equal(three.optionalHourState,'optional-missing');
assert.equal(count({...input,day:null}).state,'required-missing');
assert.equal(count({...input,hour:'甲丑'}).state,'calculation-error');
assert.equal(count({...input,hour:'00'}).data,null);
assert.deepEqual(input,{year:'甲子',month:'乙丑',day:'丙寅',hour:'丁卯'});
console.log('PASS BAZ-ELEMENT-COUNT: 8 visible characters; 6-character unknown hour; zero metal preserved. Source: '+source);
