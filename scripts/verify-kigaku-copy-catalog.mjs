import assert from 'node:assert/strict';
import {KIGAKU_COPY_CATALOG as rows} from '../src/kigaku-copy-catalog.js';
assert.equal(rows.length,118);assert.equal(new Set(rows.map(r=>r.copyId)).size,118);
for(const [group,count] of [['star',27],['role',2],['palace',45],['relation',20],['context',3],['direction',16]])assert.equal(rows.filter(r=>r.copyId.startsWith(`kig.${group}.`)).length,count);
for(const r of rows){assert.ok(r.body);assert.ok(r.short);assert.ok(r.body.startsWith(r.short));assert.equal(r.reviewStatus,'draft');assert.equal(r.releaseEnabled,false);assert.match(r.sourceUrl,/3fee71121fed81fe947cf4582d62edf3/);}
console.log('118 original draft records: unique IDs, group counts, source, short text and disabled release verified.');
