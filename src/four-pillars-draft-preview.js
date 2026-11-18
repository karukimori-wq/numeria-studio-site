import { selectFourPillarsPageCopy } from './four-pillars-page-copy.js';
const baziPreviewEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baziPreviewPillars={year:'年柱',month:'月柱',day:'日柱',hour:'時柱'};
const baziPreviewElements={wood:'木',fire:'火',earth:'土',metal:'金',water:'水'};
const baziPreviewClock=value=>String(value||'').replace('T',' ');
const baziPreviewCanonical=value=>Array.isArray(value)?value.map(baziPreviewCanonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,baziPreviewCanonical(value[key])])):value;
export function buildFourPillarsDraftPreview(snapshot,definitions,layoutId='standard'){
 const stop=reason=>({available:false,reason,pages:[],publicationAllowed:false});
 if(snapshot?.divination!=='four-pillars'||typeof snapshot.id!=='string'||!snapshot.id)return stop('四柱推命の保存済み鑑定を開いてください。');
 const checkpoint=snapshot.fourPillarsCalculation;
 if(checkpoint?.schemaVersion!=='numeria.bazi.calculation-checkpoint.v1'||checkpoint.methodKey!=='four-pillars'||checkpoint.status!=='draft'||checkpoint.publicationAllowed!==false||checkpoint.calculation?.publicationAllowed!==false)return stop('下書きを保存し、計算結果を読み込んでください。');
 if(checkpoint.source?.methodKey!=='four-pillars'||checkpoint.calculation?.methodKey!=='four-pillars'||!checkpoint.source.subjectId||checkpoint.calculation.subject!==checkpoint.source.subjectId)return stop('計算結果の対象者を確認できません。再保存してください。');
 if(JSON.stringify(baziPreviewCanonical(checkpoint.source))!==JSON.stringify(baziPreviewCanonical(snapshot.fourPillarsInput)))return stop('入力が保存された計算結果と一致しません。再保存してください。');
 const allowed=(Array.isArray(definitions)?definitions:[]).filter(item=>item?.methodKey==='four-pillars');
 if(!allowed.length)return stop('利用可能なページ定義を読み込んでから開いてください。');
 const projected=checkpoint.calculation.pages;
 if(!Array.isArray(projected))return stop('計算ページの保存値を確認できません。再保存してください。');
 const pages=allowed.map(definition=>({definition,projection:projected.find(page=>page.pageDefinitionId===definition.pageDefinitionId)||{state:'unconnected',data:null}}));
 return{available:true,reason:null,pages,layoutId:layoutId==='magazine'?'magazine':'standard',publicationAllowed:false,verificationState:'review-required',sessionId:snapshot.id,subjectId:checkpoint.source.subjectId,partnerSubjectId:checkpoint.source.partnerSubjectId,includedPillars:projected.find(page=>page.pageDefinitionId==='BAZ-01')?.data?.includedPillars,referenceDate:checkpoint.source.referenceDate};
}
function baziPreviewTable(headers,rows){
 return `<table><thead><tr>${headers.map(value=>`<th>${baziPreviewEscape(value)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${baziPreviewEscape(value??'不明')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function baziPreviewIntervalRows(intervals){return intervals.map(item=>[item.index,item.ganzhi,item.stemTenGod,baziPreviewClock(item.startStandard),baziPreviewClock(item.endExclusiveStandard)]);}
function baziPreviewPlacements(data){const rows=Array.isArray(data.placements)?data.placements:Array.isArray(data.wealthPlacements)?data.wealthPlacements:null;return rows?baziPreviewTable(['柱','位置','干','通変星'],rows.map(item=>[baziPreviewPillars[item.pillar],item.position,item.stem,item.tenGod])):'<p>配置の計算結果が揃っていません。再保存してください。</p>';}
function baziPreviewComparison(data){
 if(!Array.isArray(data.matches)||!Array.isArray(data.includedPillars)||!data.subjectPillars||!data.partnerPillars||!data.dayStemRelation)return '<p>比較の計算結果が揃っていません。再保存してください。</p>';
 const relation=data.dayStemRelation||{},relations={'same-element':'同じ五行','self-produces-other':'本人が相手を生じる','self-controls-other':'本人が相手を剋す','other-controls-self':'相手が本人を剋す','other-produces-self':'相手が本人を生じる'};
 const matchLabels={'stem-combination':'干合','branch-combination':'支合','branch-clash':'冲'};
 const chart=baziPreviewTable(['対応柱','本人','相手'],(data.includedPillars||[]).map(key=>[baziPreviewPillars[key],data.subjectPillars?.[key],data.partnerPillars?.[key]]));
 const matches=data.matches?.length?baziPreviewTable(['対応柱','関係','本人','相手'],data.matches.map(match=>[baziPreviewPillars[match.pillar],matchLabels[match.kind],match.subjectValue,match.partnerValue])):'<p>採用範囲の合・冲は0件です。</p>';
 const family=data.family?`<p>家族関係：${baziPreviewEscape({'parent-child':'親子',partners:'パートナー','other-family':'その他の家族'}[data.family.context])}${data.family.subjectRole?`／本人：${baziPreviewEscape(data.family.subjectRole==='parent'?'親':'子')}・相手：${baziPreviewEscape(data.family.partnerRole==='parent'?'親':'子')}`:''}</p>`:'';
 return `${chart}<p>日干：本人 ${baziPreviewEscape(relation.subjectStem)}（${baziPreviewEscape(baziPreviewElements[relation.subjectElement])}）／相手 ${baziPreviewEscape(relation.partnerStem)}（${baziPreviewEscape(baziPreviewElements[relation.partnerElement])}）</p><p>${baziPreviewEscape(relations[relation.elementRelation])}</p>${family}${matches}<p>時柱の比較：${data.includedPillars?.includes('hour')?'双方の確定時柱を含む':'含まない（双方の時刻確定が必要）'}</p>`;
}
function baziPreviewContent(id,data){
 switch(id){
 case 'BAZ-01':case 'BAZ-02':return baziPreviewTable(['柱','干支'],Object.keys(baziPreviewPillars).map(key=>[baziPreviewPillars[key],data.pillars?.[key]||'不明']))+(data.dayStem?`<p>日主：${baziPreviewEscape(data.dayStem)}</p>`:'');
 case 'BAZ-03':if(![6,8].includes(data.total)||Object.keys(baziPreviewElements).some(key=>!Number.isInteger(data.visibleElementCounts?.[key])||data.visibleElementCounts[key]<0)||Object.keys(baziPreviewElements).reduce((sum,key)=>sum+data.visibleElementCounts[key],0)!==data.total)return '<p>五行の構成数が揃っていません。再保存してください。</p>';return `<p>天干・地支 ${baziPreviewEscape(data.total)}字の構成数（蔵干を加算しない）</p><ul class="nbdp-elements">${Object.entries(baziPreviewElements).map(([key,label])=>`<li><span>${label}</span><meter min="0" max="${Number(data.total)||8}" value="${Number(data.visibleElementCounts?.[key]??data[key])||0}">${Number(data.visibleElementCounts?.[key]??data[key])||0}</meter><b>${Number(data.visibleElementCounts?.[key]??data[key])||0}</b></li>`).join('')}</ul>`;
 case 'BAZ-04':return baziPreviewTable(['柱','干','通変星','蔵干と役割'],(data.rows||[]).map(row=>[baziPreviewPillars[row.pillar],row.stem,row.stemTenGod,(row.hiddenStems||[]).map(item=>`${item.role} ${item.stem}（${item.tenGod}）`).join('／')]));
 case 'BAZ-05':return baziPreviewTable(['柱','支','十二運'],(data.rows||[]).map(row=>[baziPreviewPillars[row.pillar],row.branch,row.twelveStage]));
 case 'BAZ-06':return `<p>10区間。開始を含み終了を含まない、日本標準時の区間です。</p>${baziPreviewTable(['区間','干支','通変星','開始','終了'],baziPreviewIntervalRows(data.intervals||[]))}`;
 case 'BAZ-07':return `<h2>現在の大運</h2>${baziPreviewTable(['干支','通変星','開始','終了'],[[data.currentDayun?.ganzhi,data.currentDayun?.stemTenGod,baziPreviewClock(data.currentDayun?.startStandard),baziPreviewClock(data.currentDayun?.endExclusiveStandard)]] )}<h2>${baziPreviewEscape(data.annual?.year)}節年</h2>${baziPreviewTable(['干支','通変星','開始','終了'],[[data.annual?.ganzhi,data.annual?.stemTenGod,baziPreviewClock(data.annual?.startStandard),baziPreviewClock(data.annual?.endExclusiveStandard)]])}`;
 case 'BAZ-08':case 'BAZ-12':return baziPreviewComparison(data);
 case 'BAZ-09':case 'BAZ-10':case 'BAZ-11':return `${data.dayBranch?`<p>日支：${baziPreviewEscape(data.dayBranch)}</p>`:''}${baziPreviewPlacements(data)}${(data.wealthPlacements&&data.wealthPlacements.length===0)?'<p>採用範囲の財星は0件です。</p>':''}`;
 case 'BAZ-13':return (data.years||[]).map(year=>`<h2>${baziPreviewEscape(year.year)}節年 ${baziPreviewEscape(year.ganzhi)}</h2><p>${baziPreviewEscape(year.stemTenGod)}／${baziPreviewEscape(baziPreviewClock(year.startStandard))}〜${baziPreviewEscape(baziPreviewClock(year.endExclusiveStandard))}</p>${baziPreviewTable(['対応大運','通変星','開始','終了'],year.correspondingDayun.map(item=>[item.ganzhi,item.stemTenGod,baziPreviewClock(item.startStandard),baziPreviewClock(item.endExclusiveStandard)]))}`).join('');
 case 'BAZ-14':return `<ol class="nbdp-transition"><li>現在 ${baziPreviewEscape(data.currentDayun?.ganzhi)}（${baziPreviewEscape(data.currentDayun?.stemTenGod)}）</li><li>次 ${baziPreviewEscape(data.nextDayun?.ganzhi)}（${baziPreviewEscape(data.nextDayun?.stemTenGod)}）</li></ol><p>境界 ${baziPreviewEscape(baziPreviewClock(data.boundaryStandard))}<br>満${baziPreviewEscape(data.age?.fullYears)}歳（日本標準時の周年基準）</p>`;
 default:return '<p>このページの計算表示は未接続です。</p>';
 }
}
export function renderFourPillarsDraftPage(model,pageDefinitionId){
 if(!model?.available)return `<p role="status">${baziPreviewEscape(model?.reason||'計算結果を保存してください。')}</p>`;
 const page=model.pages.find(item=>item.definition.pageDefinitionId===pageDefinitionId);
 if(!page)return '<p role="status">このプランで利用可能なページを選択してください。</p>';
 const wideTable=['BAZ-06','BAZ-07','BAZ-13'].includes(pageDefinitionId);
 const {definition,projection}=page,ready=['available','valid-zero'].includes(projection.state)&&projection.data;
 let content='<p>必要な計算結果が確定していません。入力不足・対応年代・境界日を確認してください。</p>';
 if(ready){try{content=baziPreviewContent(definition.pageDefinitionId,projection.data);}catch{content='<p>計算ページの保存値を確認できません。再保存してください。</p>';}}
 const copy=selectFourPillarsPageCopy(projection,{sessionId:model.sessionId,subjectId:model.subjectId,partnerSubjectId:model.partnerSubjectId,includedPillars:model.includedPillars});
 const copyHtml=copy.state==='draft-preview'?`<p class="nbdp-watermark">登録原文の草案・未承認</p>${copy.frames.map(frame=>`<section><h2>${baziPreviewEscape(frame.title)}</h2>${frame.segments.map(segment=>`<div class="nbdp-copy-segment"><p>${baziPreviewEscape(segment.text)}</p>${segment.bindings.length?`<p class="nbdp-copy-binding">${segment.bindings.map(ref=>baziPreviewEscape(`${ref.subjectId===model.subjectId?'本人':'相手'}／${ref.label}`)).join('・')}</p>`:''}<details><summary>原文の出所と版</summary><p>${baziPreviewEscape(segment.copyId)}<br>${baziPreviewEscape(segment.copyVersion)}<br>${baziPreviewEscape(segment.source.pageUrl)}<br>${segment.bindings.map(ref=>baziPreviewEscape(`${ref.subjectId}：${ref.path}`)).join('<br>')}</p></details></div>`).join('')}</section>`).join('')}`:'<p>対応する登録原文を確認できません。計算結果と原文の参照元を確認してください。</p>';
 return `<article class="nbdp-sheet nbdp-${model.layoutId}${wideTable?' nbdp-wide-table':''}" data-bazi-preview-page="${baziPreviewEscape(definition.pageDefinitionId)}"><header><p class="nbdp-watermark">計算確認用・未承認</p><h1>${baziPreviewEscape(definition.pageDefinitionId)} ${baziPreviewEscape(definition.title)}</h1><p>保存基準日 ${baziPreviewEscape(model.referenceDate)}</p></header><div class="nbdp-columns"><section class="nbdp-data">${content}</section><aside class="nbdp-copy">${copyHtml}<h2>承認状態</h2><p>解説文章：未承認</p><p>正式図表・素材：未承認</p><p>正式発行：不可</p></aside></div><footer>下書きの計算確認画面です。独立正解資料との照合・正式ページ・PDFの受入は未完了です。</footer></article>`;
}
export const FOUR_PILLARS_DRAFT_PREVIEW_CSS=`
[data-bazi-draft-preview]{position:fixed;inset:0;z-index:2147483645;background:#eee9e2;color:#292330;overflow:auto;font:14px/1.6 system-ui,sans-serif;padding:0 16px 32px;box-sizing:border-box}
[data-bazi-draft-preview] *{box-sizing:border-box}
.nbdp-controls{position:sticky;top:0;z-index:1;background:#261d3b;color:white;padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 -16px 20px}
.nbdp-controls button,.nbdp-controls select{font:inherit;padding:7px;border:1px solid #b5a58b;border-radius:5px;background:#fff;color:#292330;max-width:100%}
.nbdp-controls label{display:flex;gap:8px;align-items:center;min-width:0;flex-wrap:wrap}.nbdp-controls p{margin:0}
.nbdp-sheet{width:min(794px,100%);min-height:1123px;margin:auto;background:white;box-shadow:0 4px 24px #0002;padding:48px;overflow-wrap:anywhere}
.nbdp-sheet h1{font-size:25px;line-height:1.4;margin:10px 0 18px}.nbdp-sheet h2{font-size:16px;margin:16px 0 8px}.nbdp-sheet p{margin:10px 0}.nbdp-watermark{color:#835f32;font-weight:bold;letter-spacing:.12em}.nbdp-sheet header{border-bottom:2px solid #c9b28b;margin-bottom:24px}.nbdp-sheet footer{border-top:1px solid #c9b28b;margin-top:32px;padding-top:12px;color:#665c6d;font-size:12px}
.nbdp-columns{display:grid;gap:24px;min-width:0}.nbdp-magazine .nbdp-columns{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}.nbdp-magazine.nbdp-wide-table .nbdp-columns{grid-template-columns:1fr}.nbdp-data,.nbdp-copy{min-width:0}.nbdp-copy{padding:16px;background:#f7f3ec;border:1px dashed #c9b28b}
.nbdp-sheet table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:12px}.nbdp-sheet th,.nbdp-sheet td{border:1px solid #d8d1c6;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}.nbdp-sheet th{background:#f4eee3}.nbdp-sheet tr{break-inside:avoid}
.nbdp-copy-segment{border-bottom:1px solid #ddd2c2;padding-bottom:10px}.nbdp-copy-binding,.nbdp-copy-segment details{font-size:11px;color:#665c6d}.nbdp-elements{list-style:none;padding:0}.nbdp-elements li{display:grid;grid-template-columns:2em minmax(0,1fr) 2em;gap:12px;margin:12px 0}.nbdp-elements meter{width:100%;height:24px}.nbdp-transition{display:flex;gap:24px;flex-wrap:wrap;padding:20px;list-style:none;background:#f4eee3}
@media(max-width:600px){.nbdp-sheet{padding:20px;min-height:calc((100vw - 32px)*1.414)}.nbdp-sheet h1{font-size:21px}.nbdp-magazine .nbdp-columns{grid-template-columns:1fr}.nbdp-sheet th,.nbdp-sheet td{padding:4px;font-size:11px}}
@media print{body:has([data-bazi-draft-preview])>*:not([data-bazi-draft-preview]){display:none!important}[data-bazi-draft-preview]{position:static!important;background:#fff!important;padding:0!important}.nbdp-controls,.nbdp-sheet{display:none!important}[data-bazi-draft-preview]::before{content:'未承認の計算確認画面は正式発行できません。'}}`;
