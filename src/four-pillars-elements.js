// Notion decision 56: count only visible stems/branches (6 or 8 characters).
// This consumes pillar data; it never creates or confirms a natal chart.
const stems='甲乙丙丁戊己庚辛壬癸';
const branches='子丑寅卯辰巳午未申酉戌亥';
const stemElements=['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
const branchElements=['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];
export function countVisiblePillarElements(pillars){
 const includedPillars=['year','month','day'];
 if(pillars?.hour!==null&&pillars?.hour!==undefined)includedPillars.push('hour');
 const counts={wood:0,fire:0,earth:0,metal:0,water:0};
 for(const key of includedPillars){
  const value=pillars?.[key];
  if(typeof value!=='string'||value.length!==2) return{state:'required-missing',missing:key,data:null};
  const a=stems.indexOf(value[0]),b=branches.indexOf(value[1]);
  if(a<0||b<0||a%2!==b%2)return{state:'calculation-error',reason:'PILLAR_INVALID',data:null};
  counts[stemElements[a]]++;counts[branchElements[b]]++;
 }
 return{state:'available',data:{visibleElementCounts:counts,includedPillars,total:includedPillars.length*2,includeHiddenStems:false},optionalHourState:includedPillars.length===3?'optional-missing':'available',publicationAllowed:false};
}
