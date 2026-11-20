function baziA4Clone(node){
 const clone=node.cloneNode(true);
 clone.querySelectorAll('details').forEach(item=>item.remove());
 clone.querySelectorAll('[tabindex]').forEach(item=>item.removeAttribute('tabindex'));
 return clone;
}
function baziA4SourceUnits(source){
 let sequence=0;const data=[],copy=[];
 const atomic=(list,node)=>list.push({key:`atom-${sequence++}`,create:()=>baziA4Clone(node),atomic:true});
 const rows=(list,wrapper,prefix,container,items)=>{
  const key=`rows-${sequence++}`;
  for(const item of items)list.push({key,create:()=>{const outer=wrapper.cloneNode(false);prefix.forEach(node=>outer.append(baziA4Clone(node)));const inner=container.cloneNode(false);if(container.tagName==='TABLE'){const head=container.querySelector('thead');if(head)inner.append(baziA4Clone(head));inner.append(document.createElement('tbody'));}outer.append(inner);return outer;},append:outer=>outer.querySelector(container.tagName==='TABLE'?'tbody':container.tagName.toLowerCase()).append(baziA4Clone(item))});
 };
 const table=(node,wrapper=document.createElement('div'),prefix=[])=>{
  const items=Array.from(node.querySelectorAll('tbody > tr'));
  if(items.length)rows(data,wrapper,prefix,node,items);else{const outer=wrapper.cloneNode(false);prefix.forEach(item=>outer.append(baziA4Clone(item)));outer.append(baziA4Clone(node));atomic(data,outer);}
 };
 for(const node of source.querySelector('.nbdp-data').children){
  if(node.tagName==='TABLE'){table(node);continue;}
  if(!node.matches('.ns-figure')){atomic(data,node);continue;}
  const children=Array.from(node.children),tableNode=children.find(item=>item.tagName==='TABLE');
  if(tableNode){table(tableNode,node,children.slice(0,children.indexOf(tableNode)));continue;}
  const flow=children.find(item=>['OL','DL'].includes(item.tagName));
  if(flow){const index=children.indexOf(flow);rows(data,node,children.slice(0,index),flow,Array.from(flow.children));for(const item of children.slice(index+1)){const suffix=node.cloneNode(false);suffix.append(baziA4Clone(item));atomic(data,suffix);}continue;}
  const graph=children.find(item=>item.querySelector('svg')||item.tagName.toLowerCase()==='svg');
  if(graph){
   const outer=node.cloneNode(false),index=children.indexOf(graph);children.slice(0,index+1).forEach(item=>outer.append(baziA4Clone(item)));atomic(data,outer);
   for(const item of children.slice(index+1)){if(['UL','OL'].includes(item.tagName))rows(data,node,[],item,Array.from(item.children));else{const part=node.cloneNode(false);part.append(baziA4Clone(item));atomic(data,part);}}
  }else atomic(data,node);
 }
 const aside=source.querySelector('.nbdp-copy'),copyPrefix=[];
 const children=Array.from(aside.children);
 for(let i=0;i<children.length;i++){
  const node=children[i];
  if(node.matches('.nbdp-watermark')){copyPrefix.push(node);continue;}
  if(node.tagName==='SECTION'){
   const segments=Array.from(node.querySelectorAll(':scope > .nbdp-copy-segment')),heading=node.querySelector(':scope > h2');
   if(segments.length){const key=`copy-${sequence++}`;for(const segment of segments)copy.push({key,create:()=>{const section=node.cloneNode(false);if(heading)section.append(baziA4Clone(heading));return section;},append:section=>section.append(baziA4Clone(segment))});}else atomic(copy,node);
  }else if(node.tagName==='H2'){
   const section=document.createElement('section');section.append(baziA4Clone(node));while(children[i+1]?.tagName==='P')section.append(baziA4Clone(children[++i]));atomic(copy,section);
  }else atomic(copy,node);
 }
 return{data,copy,copyPrefix};
}
function baziA4AppendUnits(container,indices,units){
 let lastKey=null,group=null;
 for(const index of indices){const unit=units[index];if(unit.atomic){container.append(unit.create());lastKey=null;continue;}if(lastKey!==unit.key){group=unit.create();container.append(group);lastKey=unit.key;}unit.append(group);}
}
function paginateFourPillarsDraftA4(source,overlay){
 const units=baziA4SourceUnits(source),measure=document.createElement('div');measure.className='nbdp-a4-measure';measure.setAttribute('aria-hidden','true');measure.setAttribute('inert','');overlay.append(measure);
 const makePage=(part,index,total)=>{
  const sheet=source.cloneNode(false);sheet.classList.add('nbdp-a4-page');sheet.dataset.a4PhysicalPage=String(index+1);
  sheet.append(baziA4Clone(source.querySelector(':scope > header')));
  const body=document.createElement('div');body.className='nbdp-a4-body';const columns=document.createElement('div');columns.className='nbdp-a4-columns';columns.dataset.a4Columns=String(part.columns);
  const data=document.createElement('section');data.className='nbdp-data';const copy=document.createElement('aside');copy.className='nbdp-copy';
  baziA4AppendUnits(data,part.data,units.data);if(part.copy.length){units.copyPrefix.forEach(node=>copy.append(baziA4Clone(node)));baziA4AppendUnits(copy,part.copy,units.copy);}else copy.className='nbdp-a4-empty';
  if(part.data.length||part.columns===2)columns.append(data);if(part.copy.length||part.columns===2)columns.append(copy);body.append(columns);sheet.append(body);
  const footer=baziA4Clone(source.querySelector(':scope > footer')),number=document.createElement('span');number.className='nbdp-a4-number';number.textContent=`A4検査 ${index+1} / ${total||'--'}（正式発行不可）`;footer.append(number);sheet.append(footer);return sheet;
 };
 try{
  const fits=part=>{const sheet=makePage(part,0,0);measure.replaceChildren(sheet);const body=sheet.querySelector('.nbdp-a4-body'),columns=sheet.querySelector('.nbdp-a4-columns');return body.clientHeight>0&&columns.getBoundingClientRect().height<=body.clientHeight+0.5;};
  const paired=source.classList.contains('nbdp-magazine')&&!source.classList.contains('nbdp-wide-table');
  const plan=planFourPillarsDraftA4({dataCount:units.data.length,copyCount:units.copy.length,paired,fits});
  if(!plan.ok)return plan;
  const viewport=document.createElement('div');viewport.className='nbdp-a4-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','A4検査ページ（縦と横にスクロールできます）');
  plan.pages.forEach((part,index)=>viewport.append(makePage(part,index,plan.pages.length)));
  return{ok:true,viewport,pageCount:plan.pages.length};
 }finally{measure.remove();}
}
