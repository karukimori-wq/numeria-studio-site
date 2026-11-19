import assert from 'node:assert/strict';
import {planFourPillarsDraftA4 as plan} from '../src/four-pillars-a4-plan.js';
const measured=(data,copy,limit)=>part=>(part.columns===2?Math.max(part.data.reduce((s,i)=>s+data[i],0),part.copy.reduce((s,i)=>s+copy[i],0)):part.data.reduce((s,i)=>s+data[i],0)+part.copy.reduce((s,i)=>s+copy[i],0))<=limit;
const check=(result,dataCount,copyCount,fits)=>{assert(result.ok);assert.deepEqual(result.pages.flatMap(p=>p.data),Array.from({length:dataCount},(_,i)=>i));assert.deepEqual(result.pages.flatMap(p=>p.copy),Array.from({length:copyCount},(_,i)=>i));assert(result.pages.every(p=>(p.data.length||p.copy.length)&&fits(p)));};
let fits=measured([40,40,40],[30,30,30],100),result=plan({dataCount:3,copyCount:3,fits});check(result,3,3,fits);assert.equal(result.pages.length,3);
result=plan({dataCount:3,copyCount:3,paired:true,fits});check(result,3,3,fits);assert.equal(result.pages[0].columns,2);assert.deepEqual(result.pages[0].data,[0,1]);assert.deepEqual(result.pages[0].copy,[0,1,2]);assert(result.pages.slice(1).every(p=>p.columns===1));
fits=part=>part.columns===2?part.data.length===0:part.data.length*80+part.copy.length*20<=100;
result=plan({dataCount:1,copyCount:1,paired:true,fits});check(result,1,1,fits);assert.equal(result.pages.length,1);assert.equal(result.pages[0].columns,1); // A narrow first-column failure falls back without reordering the source.
assert.deepEqual(plan({dataCount:1,copyCount:1,fits:()=>false}),{ok:false,reason:'A4_ATOMIC_BLOCK_TOO_TALL',pages:[]});
assert.equal(plan({dataCount:0,copyCount:0,fits:()=>true}).ok,false);
assert.equal(plan({dataCount:NaN,copyCount:1,fits:()=>true}).ok,false);
for(let dataCount=0;dataCount<=12;dataCount++)for(let copyCount=0;copyCount<=12;copyCount++)if(dataCount+copyCount){for(const paired of [false,true]){const data=Array.from({length:dataCount},(_,i)=>18+i*3),copy=Array.from({length:copyCount},(_,i)=>15+i*4);const fits=measured(data,copy,100);check(plan({dataCount,copyCount,paired,fits}),dataCount,copyCount,fits);}}
console.log('Draft A4 planner: measured-fit callbacks, exact boundaries, preserved source order/counts, first-page pairs, full-width continuations, narrow fallback, no empty pages and oversized atomic refusal PASS.');
