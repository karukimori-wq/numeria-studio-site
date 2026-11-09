function mountKigakuInputForm(container){
  const api=window.NumeriaNavigation;
  const snapshot=api?.getReadingSnapshot?.();
  if(!container||snapshot?.divination!=="nine-star-ki")return;
  const prior=snapshot.kigakuInput||{},clock=prior.birthClock||{};
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  container.innerHTML=`<h3>九星気学の計算入力</h3><p>日本での出生時計を入力してください。時刻不明なら空欄にします。節入り日に星が確定できない場合は不足として扱います。</p><label>生年月日<input data-kigaku-date type="date" value="${escape(clock.date)}"></label><label>出生時刻（不明は空欄）<input data-kigaku-time type="time" value="${escape(clock.time)}"></label><label>固定する鑑定基準日時（日本時間）<input data-kigaku-reference type="datetime-local"></label><label><input data-kigaku-confirm type="checkbox" ${clock.zoneConfirmed===true?'checked':''}>日本の出生時計であることを確認</label><button type="button" data-kigaku-save>入力を反映して下書きを保存</button><p data-kigaku-status role="status"></p>`;
  const field=name=>container.querySelector(`[data-kigaku-${name}]`);
  if(prior.referenceInstant&&Number.isFinite(Date.parse(prior.referenceInstant)))field('reference').value=new Date(Date.parse(prior.referenceInstant)+9*3600000).toISOString().slice(0,16);
  for(const name of ['date','time','reference'])field(name).oninput=()=>{field('confirm').checked=false;field('status').textContent='入力を変更しました。内容を確認して保存してください';};
  field('save').onclick=async()=>{
    const feedback=field('status');
    const current=api.getReadingSnapshot?.();if(current?.id!==snapshot.id||current?.divination!=="nine-star-ki"){feedback.textContent='鑑定が切り替わりました。入力画面を開き直してください';return;}
    if(!field('date').value||!field('reference').value||!field('confirm').checked){feedback.textContent='生年月日・基準日時・日本時計の確認が必要です';return;}
    const input={...structuredClone(current.kigakuInput||{}),methodKey:'nine-star-ki',subjectId:snapshot.id?`${snapshot.id}:subject`:null,
      referenceInstant:`${field('reference').value}:00+09:00`,birthClock:{date:field('date').value,time:field('time').value||null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null}};
    const result=api.updateKigakuInput?.(input);
    if(!result?.ok){feedback.textContent=result?.message||'九星鑑定を開き直してください';return;}
    feedback.textContent='入力を反映しました。下書きの保存結果は既存の保存状態表示で確認してください';
    try{await api.saveReadingDraft?.();}catch{feedback.textContent='下書きを保存できませんでした。入力を保持しています。再試行してください';}
  };
}
