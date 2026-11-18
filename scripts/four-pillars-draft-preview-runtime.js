let numeriaBaziPreviewClose=null;
function openFourPillarsDraftPreview({snapshot,definitions,layoutId}={}){
 const model=buildFourPillarsDraftPreview(snapshot,definitions,layoutId);
 if(!model.available)return{ok:false,message:model.reason};
 numeriaBaziPreviewClose?.();
 const returnFocus=document.activeElement;
 const overlay=document.createElement('section');overlay.dataset.baziDraftPreview='1';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','四柱推命の計算ページ確認');
 overlay.innerHTML=`<style>${FOUR_PILLARS_DRAFT_PREVIEW_CSS}</style><header class="nbdp-controls"><button type="button" data-bazi-preview-close>閉じる</button><label>確認するページ<select data-bazi-preview-select>${model.pages.map(page=>`<option value="${baziPreviewEscape(page.definition.pageDefinitionId)}">${baziPreviewEscape(page.definition.pageDefinitionId)} ${baziPreviewEscape(page.definition.title)}</option>`).join('')}</select></label><p>${model.layoutId==='magazine'?'マガジン':'スタンダード'}／計算確認用・正式発行不可</p></header><div data-bazi-preview-content></div>`;
 const select=overlay.querySelector('[data-bazi-preview-select]'),content=overlay.querySelector('[data-bazi-preview-content]');
 const refresh=()=>{content.innerHTML=renderFourPillarsDraftPage(model,select.value);};
 const close=()=>{document.removeEventListener('keydown',onKey,true);overlay.remove();numeriaBaziPreviewClose=null;if(returnFocus?.isConnected)returnFocus.focus();};
 const onKey=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}else if(event.key==='Tab'){const items=Array.from(overlay.querySelectorAll('button,select,summary'));const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
 select.onchange=refresh;overlay.querySelector('[data-bazi-preview-close]').onclick=close;
 document.body.append(overlay);refresh();numeriaBaziPreviewClose=close;document.addEventListener('keydown',onKey,true);overlay.querySelector('[data-bazi-preview-close]').focus();
 return{ok:true};
}
