// The browser supplies fits() from actual DOM heights at the fixed A4 width.
// No character-count estimate, scale-to-fit, or approval decision is made here.
export function planFourPillarsDraftA4({dataCount,copyCount,paired=false,fits}={}){
 if(!Number.isInteger(dataCount)||dataCount<0||!Number.isInteger(copyCount)||copyCount<0||dataCount+copyCount===0||typeof fits!=='function')return{ok:false,reason:'A4_INPUT_REQUIRED',pages:[]};
 const pages=[];let data=0,copy=0;
 const page=columns=>({columns,data:[],copy:[]});
 const test=candidate=>fits(candidate)===true;
 if(paired){
  const first=page(2);
  while(data<dataCount&&test({...first,data:[...first.data,data]}))first.data.push(data++);
  while((dataCount===0||first.data.length>0)&&copy<copyCount&&test({...first,copy:[...first.copy,copy]}))first.copy.push(copy++);
  if(first.data.length||first.copy.length)pages.push(first);
 }
 let current=page(1);
 for(const kind of ['data','copy']){
  const count=kind==='data'?dataCount:copyCount;
  let index=kind==='data'?data:copy;
  while(index<count){
   const candidate={...current,[kind]:[...current[kind],index]};
   if(test(candidate)){current=candidate;index++;continue;}
   if(!current.data.length&&!current.copy.length)return{ok:false,reason:'A4_ATOMIC_BLOCK_TOO_TALL',pages:[]};
   pages.push(current);current=page(1);
  }
 }
 if(current.data.length||current.copy.length)pages.push(current);
 return{ok:true,pages};
}
