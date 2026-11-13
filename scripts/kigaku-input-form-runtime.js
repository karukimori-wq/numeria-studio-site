function mountKigakuInputForm(container){
  const api=window.NumeriaNavigation;
  const snapshot=api?.getReadingSnapshot?.();
  if(!container||snapshot?.divination!=="nine-star-ki")return;
  const prior=snapshot.kigakuInput||{},clock=prior.birthClock||{};
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  container.innerHTML=`<h3>九星気学の計算入力</h3><p>日本での出生時計を入力してください。時刻不明なら空欄にします。節入り日に星が確定できない場合は不足として扱います。</p><label>生年月日<input data-kigaku-date type="date" value="${escape(clock.date)}"></label><label>出生時刻（不明は空欄）<input data-kigaku-time type="time" value="${escape(clock.time)}"></label><label>固定する鑑定基準日時（日本時間）<input data-kigaku-reference type="datetime-local"></label><label><input data-kigaku-confirm type="checkbox" ${clock.zoneConfirmed===true?'checked':''}>日本の出生時計であることを確認</label><button type="button" data-kigaku-save>入力を反映して下書きを保存</button><p data-kigaku-status role="status"></p>`;
  const field=name=>container.querySelector(`[data-kigaku-${name}]`);
  if(prior.referenceInstant&&Number.isFinite(Date.parse(prior.referenceInstant)))field('reference').value=new Date(Date.parse(prior.referenceInstant)+9*3600000).toISOString().slice(0,16);
  const extra=document.createElement('fieldset');
  extra.innerHTML=`<legend>相手・テーマ・方位（必要な場合）</legend><label><input data-kigaku-partnerEnabled type="checkbox">相手情報を入力・更新する</label><label>相手の識別名<input data-kigaku-partnerName maxlength="200"></label><label>相手の生年月日<input data-kigaku-partnerDate type="date"></label><label>相手の出生時刻（不明は空欄）<input data-kigaku-partnerTime type="time"></label><label><input data-kigaku-partnerConfirm type="checkbox">相手も日本の出生時計と確認</label>${[['loveRelationship','恋愛の関係種別'],['workRelationship','職場の関係種別'],['familyRelationship','家族の関係種別']].map(([key,label])=>`<label>${label}<input data-kigaku-${key} maxlength="200"></label>`).join('')}<label>仕事テーマ<select data-kigaku-workTheme><option value="">未指定</option><option value="job-change">転職</option><option value="independence">独立</option></select></label><label>指定方位<select data-kigaku-selectedDirection><option value="">未指定</option>${[['N','北'],['NE','北東'],['E','東'],['SE','南東'],['S','南'],['SW','南西'],['W','西'],['NW','北西']].map(([v,label])=>`<option value="${v}">${label}</option>`).join('')}</select></label><label>目的<select data-kigaku-directionPurpose><option value="">未指定</option><option value="travel">旅行</option><option value="move">転居</option></select></label><p>出発地から目的地を見た8方位を確認して指定してください。住所・距離・予定日は判定しません。</p>`;
  container.append(extra);
  for(const key of ['partnerName','loveRelationship','workRelationship','familyRelationship','workTheme','selectedDirection','directionPurpose'])field(key).value=prior[key]||'';
  field('partnerDate').value=prior.partnerBirthClock?.date||'';field('partnerTime').value=prior.partnerBirthClock?.time||'';
  field('partnerEnabled').checked=Boolean(prior.partnerBirthClock);field('partnerConfirm').checked=prior.partnerBirthClock?.zoneConfirmed===true;
  for(const key of ['partnerName','partnerDate','partnerTime'])field(key).oninput=()=>{field('partnerConfirm').checked=false;};
  const restoredReference=field('reference').value;
  if(prior.referenceInstant){field('reference').readOnly=true;field('reference').title='保存済みの鑑定基準日時です。変更する場合は新規鑑定を作成してください';}
  let saving=false;
  for(const name of ['date','time','reference'])field(name).oninput=()=>{field('confirm').checked=false;field('status').textContent='入力を変更しました。内容を確認して保存してください';};
  field('save').onclick=async()=>{
    if(saving)return;
    const feedback=field('status');
    if(typeof api.saveReadingDraft!=="function"){feedback.textContent='保存機能を読み込めません。画面を開き直してください';return;}
    const current=api.getReadingSnapshot?.();if(current?.id!==snapshot.id||current?.divination!=="nine-star-ki"){feedback.textContent='鑑定が切り替わりました。入力画面を開き直してください';return;}
    if(prior.referenceInstant&&field('reference').value!==restoredReference){feedback.textContent='保存済み基準日時は変更できません。新規鑑定を作成してください';return;}
    if(!field('date').value||!field('reference').value||!field('confirm').checked){feedback.textContent='生年月日・基準日時・日本時計の確認が必要です';return;}
    const input={...structuredClone(current.kigakuInput||{}),methodKey:'nine-star-ki',subjectId:snapshot.id?`${snapshot.id}:subject`:null,
      referenceInstant:prior.referenceInstant&&field('reference').value===restoredReference?prior.referenceInstant:`${field('reference').value}:00+09:00`,birthClock:{date:field('date').value,time:field('time').value||null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null}};
    for(const key of ['loveRelationship','workRelationship','familyRelationship','workTheme','selectedDirection','directionPurpose'])input[key]=field(key).value;
    if(field('partnerEnabled').checked){
      if(!field('partnerName').value.trim()||!field('partnerDate').value||!field('partnerConfirm').checked){feedback.textContent='相手の識別名・生年月日・日本時計の確認が必要です';return;}
      input.partnerName=field('partnerName').value.trim();input.partnerSubjectId=current.kigakuInput?.partnerSubjectId||`${snapshot.id}:partner`;
      input.partnerBirthClock={date:field('partnerDate').value,time:field('partnerTime').value||null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:true,offsetChoiceMinutes:null};
    }
    const result=api.updateKigakuInput?.(input);
    if(!result?.ok){feedback.textContent=result?.message||'九星鑑定を開き直してください';return;}
    feedback.textContent='入力を反映しました。下書きの保存結果は既存の保存状態表示で確認してください';
    saving=true;field('save').disabled=true;
    try{await api.saveReadingDraft();}catch{feedback.textContent='下書きを保存できませんでした。入力を保持しています。再試行してください';}finally{saving=false;field('save').disabled=false;}
  };
}
