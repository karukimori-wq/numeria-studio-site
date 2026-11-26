import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FOUR_PILLARS_COPY_RECORDS as records,FOUR_PILLARS_COPY_VERSION as version} from '../src/four-pillars-copy-data.js';
import {verifyFourPillarsCopySource} from './lib/four-pillars-copy-review-source.mjs';

// This produces review material only. It never writes an application approval,
// changes registered text, or changes the formal PDF/printing guard.
const [sourcePath,outputPath]=process.argv.slice(2);
assert(sourcePath&&outputPath,'Usage: node scripts/build-four-pillars-copy-review.mjs source.json output.json');
const source=JSON.parse(readFileSync(sourcePath,'utf8'));
assert.equal(records.length,128);assert.equal(new Set(records.map(r=>r.copyId)).size,128);
assert.equal(source.id.replaceAll('-',''),'3ffe71121fed81559799c75b93cd6c57');
assert(source.text.includes(version));
verifyFourPillarsCopySource(records,source.text);
for(const r of records){
 assert.equal(r.copyVersion,version);assert.equal(r.reviewStatus,'draft');assert.equal(r.releaseEnabled,false);assert.equal(r.language,'ja');
 assert.equal(r.short,r.body.slice(0,r.body.indexOf('。')+1));
}
const plain=text=>text.replace(/<\/?code>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\\([{}])/g,'$1');
const pageAssignments=source.text.split('\n').filter(line=>/^\| BAZ-\d\d \|/.test(line)).map(line=>{
 const [pageId,frameCount,allocation,requirements]=line.split('|').slice(1,-1).map(v=>plain(v.trim()));
 return{pageId,frameCount,allocation,requirements};
});
assert.deepEqual(pageAssignments.map(p=>p.pageId),Array.from({length:14},(_,i)=>`BAZ-${String(i+1).padStart(2,'0')}`));
const datasetSHA256=createHash('sha256').update(JSON.stringify(records)).digest('hex');
const review={schemaVersion:'numeria.bazi.copy-review-material.v1',date:'2026-11-20',purpose:'source-content-review-only',publicationAllowed:false,copyVersion:version,datasetSHA256,source:{pageUrl:records[0].source.pageUrl,pageLastEditedAt:source.page_last_edited_at,fullSourceTextSHA256:createHash('sha256').update(source.text).digest('hex')},pageAssignments,records:records.map((r,index)=>({index:index+1,...r,review:{decision:null,reviewer:null,date:null,comment:null}}))};
writeFileSync(outputPath,JSON.stringify(review,null,2)+'\n');
console.log(`Review data verified: ${records.length} draft records, ${pageAssignments.length} page assignments, ${datasetSHA256}. No approval changed.`);
