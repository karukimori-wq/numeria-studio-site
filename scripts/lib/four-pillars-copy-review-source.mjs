import assert from 'node:assert/strict';

// Parse the pinned Notion tables by their declared selector/column mapping.
// Finding a sentence anywhere in the document is not sufficient provenance.
export function parseFourPillarsCopySource(text){
 const mapped=new Map();let section='';
 const add=(id,body)=>{assert(id&&body&&!mapped.has(id),`Duplicate or empty source: ${id}`);mapped.set(id,body);};
 const stems=[...'甲乙丙丁戊己庚辛壬癸'];
 const stemIds=['jia','yi','bing','ding','wu','ji','geng','xin','ren','gui'];
 const directSections=['## 五行5部品','## 比較11部品','## 各柱4部品','## ページ・期間・欠損の説明22部品','## 財星の専用2部品'];
 for(const line of text.split('\n')){
  if(line.startsWith('## '))section=line;
  if(!line.startsWith('| '))continue;
  const cells=line.split('|').slice(1,-1).map(value=>value.trim().replaceAll('<code>','').replaceAll('</code>',''));
  if(section==='## 日干20部品'&&stems.includes(cells[0])){
   assert.equal(cells.length,3);const id=stemIds[stems.indexOf(cells[0])];add(`baz.day-stem.${id}.basic`,cells[1]);add(`baz.day-stem.${id}.love`,cells[2]);
  }else if(section==='## 通変星40部品'&&/^[a-z]+ /.test(cells[0])){
   assert.equal(cells.length,5);const id=cells[0].split(' ')[0];['basic','work','relationship','period'].forEach((context,index)=>add(`baz.ten-god.${id}.${context}`,cells[index+1]));
  }else if(section==='## 十二運12部品'&&/^[a-z]+ /.test(cells[0])){
   assert.equal(cells.length,2);add(`baz.stage.${cells[0].split(' ')[0]}`,cells[1]);
  }else if(section==='## 日支の関係観12部品'&&/^[a-z]+ /.test(cells[0])){
   assert.equal(cells.length,2);add(`baz.day-branch.${cells[0].split(' ')[0]}.partnership`,cells[1]);
  }else if(directSections.includes(section)&&cells[0].startsWith('baz.')){
   assert.equal(cells.length,2);add(cells[0],cells[1]);
  }
 }
 return mapped;
}
export function verifyFourPillarsCopySource(records,text){
 const mapped=parseFourPillarsCopySource(text);
 assert.equal(mapped.size,records.length,'Source record count differs');
 assert.deepEqual([...mapped.keys()].sort(),records.map(r=>r.copyId).sort(),'Source IDs differ');
 for(const record of records)assert.equal(record.body,mapped.get(record.copyId),`Source ID/body association differs: ${record.copyId}`);
 return true;
}
