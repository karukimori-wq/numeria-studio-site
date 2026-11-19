import { buildFourPillarsDraftFigures } from './four-pillars-figures.js';
import { renderReportFigure } from './report-figure-renderer.js';
import { selectFourPillarsPageCopy } from './four-pillars-page-copy.js';
const baziPreviewEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baziPreviewPillars={year:'年柱',month:'月柱',day:'日柱',hour:'時柱'};
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
 return{available:true,methodKey:'four-pillars',reason:null,pages,layoutId:layoutId==='magazine'?'magazine':'standard',publicationAllowed:false,verificationState:'review-required',sessionId:snapshot.id,draftRevision:`bazi-draft:${snapshot.id}:${JSON.stringify(baziPreviewCanonical(checkpoint))}`,calculationVersion:checkpoint.calculation.calculationVersion,subjectId:checkpoint.source.subjectId,partnerSubjectId:checkpoint.source.partnerSubjectId,includedPillars:projected.find(page=>page.pageDefinitionId==='BAZ-01')?.data?.includedPillars,referenceDate:checkpoint.source.referenceDate};
}
function baziPreviewTable(headers,rows){
 return `<table><thead><tr>${headers.map(value=>`<th>${baziPreviewEscape(value)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${baziPreviewEscape(value??'不明')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function baziPreviewPlacements(data){const rows=Array.isArray(data.placements)?data.placements:Array.isArray(data.wealthPlacements)?data.wealthPlacements:null;return rows?baziPreviewTable(['柱','位置','干','通変星'],rows.map(item=>[baziPreviewPillars[item.pillar],item.position,item.stem,item.tenGod])):'<p>配置の計算結果が揃っていません。再保存してください。</p>';}
function baziPreviewRelationDetails(id,data){
 switch(id){
 case 'BAZ-02':return baziPreviewTable(['柱','干支'],Object.keys(baziPreviewPillars).map(key=>[baziPreviewPillars[key],data.pillars?.[key]||'不明']))+`<p>日主：${baziPreviewEscape(data.dayStem)}</p>`;
 case 'BAZ-04':return baziPreviewTable(['柱','干','通変星','蔵干と役割'],data.rows.map(row=>[baziPreviewPillars[row.pillar],row.stem,row.stemTenGod,row.hiddenStems.map(item=>`${item.role} ${item.stem}（${item.tenGod}）`).join('／')]));
 case 'BAZ-09':case 'BAZ-10':case 'BAZ-11':return `<p>日主：${baziPreviewEscape(data.dayStem)}</p>${data.dayBranch?`<p>日支：${baziPreviewEscape(data.dayBranch)}</p>`:''}${baziPreviewPlacements(data)}${(data.wealthPlacements&&data.wealthPlacements.length===0)?'<p>採用範囲の財星は0件です。</p>':''}`;
 default:return '';
 }
}
function renderBaziDraftFigure(figure){
 const html=renderReportFigure(figure);
 return figure.type==='FIG-RELATION'?html.replace('<svg','<p class="nbdp-graph-hint">図は横にスクロールできます。対応する干と星は下の詳細表でも確認できます。</p><div class="nbdp-graph-viewport" tabindex="0" role="region" aria-label="関係図（横にスクロールできます）"><svg').replace('</svg>','</svg></div>'):html;
}
export function renderFourPillarsDraftPage(model,pageDefinitionId){
 if(!model?.available)return `<p role="status">${baziPreviewEscape(model?.reason||'計算結果を保存してください。')}</p>`;
 const page=model.pages.find(item=>item.definition.pageDefinitionId===pageDefinitionId);
 if(!page)return '<p role="status">このプランで利用可能なページを選択してください。</p>';
 const wideTable=['BAZ-02','BAZ-04','BAZ-06','BAZ-07','BAZ-09','BAZ-10','BAZ-11','BAZ-13'].includes(pageDefinitionId);
 const {definition,projection}=page,ready=['available','valid-zero'].includes(projection.state)&&projection.data;
 let content='<p>必要な計算結果が確定していません。入力不足・対応年代・境界日を確認してください。</p>';
 const figures=buildFourPillarsDraftFigures(projection,model);
 if(ready){if(figures.available){content=figures.figures.map(renderBaziDraftFigure).join('');if(figures.figures[0].type==='FIG-RELATION'){try{content+=baziPreviewRelationDetails(definition.pageDefinitionId,projection.data);}catch{content+='<p>詳細の保存値を確認できません。</p>';}}}else content='<p>図表の計算結果が揃っていません。再保存してください。</p>';}
 const copy=figures.available?selectFourPillarsPageCopy(projection,{sessionId:model.sessionId,subjectId:model.subjectId,partnerSubjectId:model.partnerSubjectId,includedPillars:model.includedPillars}):{state:'source-missing'};
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
.nbdp-copy-segment{border-bottom:1px solid #ddd2c2;padding-bottom:10px}.nbdp-copy-binding,.nbdp-copy-segment details{font-size:11px;color:#665c6d}.nbdp-data .ns-figure{margin:0 0 20px;padding:0;--figure-ink:#733d35}.nbdp-data .ns-figure svg{min-width:0}.nbdp-graph-viewport{overflow-x:auto;max-width:100%}.nbdp-graph-viewport:focus-visible{outline:2px solid #835f32;outline-offset:2px}.nbdp-graph-hint{display:none}.nbdp-data .ns-figure meter{width:100%;height:22px}.nbdp-elements{list-style:none;padding:0}.nbdp-elements li{display:grid;grid-template-columns:2em minmax(0,1fr) 2em;gap:12px;margin:12px 0}.nbdp-elements meter{width:100%;height:24px}.nbdp-transition{display:flex;gap:24px;flex-wrap:wrap;padding:20px;list-style:none;background:#f4eee3}
@media(max-width:600px){.nbdp-data .ns-figure .nbdp-graph-viewport svg{min-width:640px}.nbdp-graph-hint{display:block;font-size:12px}.nbdp-sheet{padding:20px;min-height:calc((100vw - 32px)*1.414)}.nbdp-sheet h1{font-size:21px}.nbdp-magazine .nbdp-columns{grid-template-columns:1fr}.nbdp-sheet th,.nbdp-sheet td{padding:4px;font-size:11px}}
@media print{body:has([data-bazi-draft-preview])>*:not([data-bazi-draft-preview]){display:none!important}[data-bazi-draft-preview]{position:static!important;background:#fff!important;padding:0!important}.nbdp-controls,.nbdp-sheet{display:none!important}[data-bazi-draft-preview]::before{content:'未承認の計算確認画面は正式発行できません。'}}`;
