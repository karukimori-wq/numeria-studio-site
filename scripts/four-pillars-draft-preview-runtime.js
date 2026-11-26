let numeriaBaziPreviewClose=null;
function openFourPillarsDraftPreview({snapshot,definitions,layoutId,adminPreview=false}={}){
 const model=buildFourPillarsDraftPreview(snapshot,definitions,layoutId);
 if(!model.available)return{ok:false,message:model.reason};
 numeriaBaziPreviewClose?.();
 const returnFocus=document.activeElement;
 const overlay=document.createElement('section');overlay.dataset.baziDraftPreview='1';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','四柱推命の計算ページ確認');
 overlay.innerHTML=`<style>${REPORT_FIGURE_CSS}\n${FOUR_PILLARS_DRAFT_PREVIEW_CSS}</style><header class="nbdp-controls"><button type="button" data-bazi-preview-close>閉じる</button><label>確認するページ<select data-bazi-preview-select>${model.pages.map(page=>`<option value="${baziPreviewEscape(page.definition.pageDefinitionId)}">${baziPreviewEscape(page.definition.pageDefinitionId)} ${baziPreviewEscape(page.definition.title)}</option>`).join('')}</select></label><button type="button" data-bazi-a4-mode aria-pressed="false">A4改ページを確認</button><p>${model.layoutId==='magazine'?'マガジン':'スタンダード'}／計算確認用・正式発行不可${adminPreview?'／管理者検証・契約変更なし':''}</p><span data-bazi-a4-status role="status">通常表示</span></header><div data-bazi-preview-content></div>`;
 const select=overlay.querySelector('[data-bazi-preview-select]'),content=overlay.querySelector('[data-bazi-preview-content]'),a4Button=overlay.querySelector('[data-bazi-a4-mode]'),a4Status=overlay.querySelector('[data-bazi-a4-status]');
 let a4Mode=false,generation=0;
 const refresh=()=>{const current=++generation;content.innerHTML=renderFourPillarsDraftPage(model,select.value);a4Button.setAttribute('aria-pressed',String(a4Mode));a4Button.textContent=a4Mode?'通常表示に戻る':'A4改ページを確認';a4Status.textContent=a4Mode?'A4を計測中…':'通常表示';if(!a4Mode)return;Promise.resolve(document.fonts?.ready).then(()=>{if(current!==generation||!overlay.isConnected)return;const source=content.querySelector('.nbdp-sheet');if(!source){a4Status.textContent='A4に表示するページがありません。';return;}try{const result=paginateFourPillarsDraftA4(source,overlay);if(result.ok){content.replaceChildren(result.viewport);a4Status.textContent=`A4検査 ${result.pageCount}ページ／出所の詳細は通常表示で確認できます`; }else a4Status.textContent='この要素はA4枠に収まりません。通常表示で確認してください。';}catch{a4Status.textContent='A4の実測に失敗しました。通常表示で確認してください。';}});};
 const close=()=>{generation++;document.removeEventListener('keydown',onKey,true);overlay.remove();numeriaBaziPreviewClose=null;if(returnFocus?.isConnected)returnFocus.focus();};
 const onKey=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}else if(event.key==='Tab'){const items=Array.from(overlay.querySelectorAll('button,select,summary,[tabindex="0"]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
 a4Button.onclick=()=>{a4Mode=!a4Mode;refresh();};select.onchange=refresh;overlay.querySelector('[data-bazi-preview-close]').onclick=close;
 document.body.append(overlay);refresh();numeriaBaziPreviewClose=close;document.addEventListener('keydown',onKey,true);overlay.querySelector('[data-bazi-preview-close]').focus();
 return{ok:true};
}
