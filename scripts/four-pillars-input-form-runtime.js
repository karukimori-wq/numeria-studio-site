let numeriaBaziActiveForm=null,numeriaBaziPendingSave=null;
function mountFourPillarsInputForm(container,previewOptions={}){
  const api=window.NumeriaNavigation,snapshot=api?.getReadingSnapshot?.();
  if(!container)return;
  if(snapshot?.divination!=='four-pillars'||typeof snapshot.id!=='string'||!snapshot.id){container.textContent='四柱推命の鑑定画面で下書きを保存してから、この入力画面を開き直してください。';return;}
  const prior=snapshot.fourPillarsInput||{},escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const offsetOptions='<option value="">自動判定（重複時刻は選択）</option><option value="540">標準時 UTC+09:00</option><option value="600">夏時間 UTC+10:00</option>';
  const clockFields=(prefix,label)=>`<fieldset><legend>${label}</legend><label>生年月日<input data-bazi-${prefix}date type="date" min="1901-01-01" max="2100-12-31"></label><label>出生時刻（不明は空欄）<input data-bazi-${prefix}time type="time" step="1"></label><label>重複時刻の時差<select data-bazi-${prefix}offset>${offsetOptions}</select></label><label><input data-bazi-${prefix}confirm type="checkbox">日本の出生時計であることを確認</label></fieldset>`;
  container.innerHTML=`<h3>四柱推命の計算入力</h3><p>日本での出生時計を入力します。時刻不明では時柱を作りません。文章・素材は未承認のため、この計算だけでは発行できません。</p>${clockFields('','本人')}<label>固定する鑑定基準日<input data-bazi-reference type="date"></label><label>起運・大運の計算用性別<select data-bazi-sex><option value="">未指定</option><option value="male">男性区分</option><option value="female">女性区分</option></select></label><p>プロフィールとは別の計算用区分です。未指定でも本人の命式や比較は保存できます。</p><label><input data-bazi-partnerEnabled type="checkbox">比較相手を入力する</label>${clockFields('partner','比較相手')}<label>家族の関係<select data-bazi-family><option value="">未指定</option><option value="parent-child">親子</option><option value="partners">パートナー</option><option value="other-family">その他の家族</option></select></label><label>親子の方向<select data-bazi-direction><option value="">未指定</option><option value="a-parent">本人が親</option><option value="b-parent">相手が親</option></select></label><button type="button" data-bazi-save>入力を反映して下書きを保存</button><button type="button" data-bazi-preview-open>計算データのページ見本を開く</button><p data-bazi-status role="status"></p><div data-bazi-result></div>`;
  const field=key=>container.querySelector(`[data-bazi-${key}]`);
  for(const [prefix,clock] of [['',prior.birthClock||{}],['partner',prior.partnerBirthClock||{}]]){
    field(prefix+'date').value=clock.date||'';field(prefix+'time').value=clock.time||'';
    field(prefix+'offset').value=clock.offsetChoiceMinutes==null?'':String(clock.offsetChoiceMinutes);field(prefix+'confirm').checked=clock.zoneConfirmed===true;
    for(const key of ['date','time','offset'])field(prefix+key).oninput=()=>{field(prefix+'confirm').checked=false;if(key!=='offset')field(prefix+'offset').value='';field('result').textContent='入力を変更しました。再保存すると計算結果を更新します。';};
  }
  field('sex').value=prior.calculationSex||'';field('reference').value=prior.referenceDate||'';field('reference').readOnly=Boolean(prior.referenceDate);
  for(const key of ['partnerEnabled','family','direction','reference','sex'])field(key).oninput=()=>{field('result').textContent='入力を変更しました。再保存すると計算結果を更新します。';};
  field('partnerEnabled').checked=Boolean(prior.partnerBirthClock);field('family').value=prior.familyContext||'';field('direction').value=prior.parentDirection||'';
  const render=checkpoint=>{
    const pages=checkpoint?.calculation?.pages;
    if(!Array.isArray(pages)){field('result').textContent='保存すると計算結果を表示します。';return;}
    const yun=checkpoint.calculation.yun;
    const reasons={CALCULATION_SEX_REQUIRED:'計算用性別を指定してください。',KNOWN_BIRTH_TIME_REQUIRED_FOR_YUN:'起運には確定した出生時刻が必要です。',EXACT_JIE_BIRTH_CONVENTION_REQUIRED:'出生と節入りが同一瞬間の場合の扱いは確認が必要です。'};
    const termTime=yun?.selectedTerm?.instant?new Date(Date.parse(yun.selectedTerm.instant)+9*3600000).toISOString().slice(0,19).replace('T',' '):'';
    const yunPreview=yun?.state==='available'?`<h4>起運の時間差換算（下書き）</h4><p>${escape(yun.direction==='forward'?'順行':'逆行')}・対象節 ${escape(yun.selectedTerm.name)} ${escape(termTime)}（日本標準時）</p><p>差 ${escape(yun.offset.differenceSeconds)}秒 → ${escape(yun.offset.totalMinutes)}分（分未満切捨て）</p><p>換算差 ${escape(yun.offset.offset.years)}年 ${escape(yun.offset.offset.months)}か月 ${escape(yun.offset.offset.days)}日 ${escape(yun.offset.offset.hours)}時間</p>${yun.start?.state==='available'?`<p>起運開始日時 ${escape(yun.start.standardDateTime.replace('T',' '))}（日本標準時）</p><p>年→月→日→時間の順に加算し、年・月ごとに月末へ切り詰めます。</p>`:`<p>起運開始日時は計算できません。対応範囲と出生時計を確認してください。</p>`}<p>計算結果は下書きです。開始日時の独立照合と正式発行の承認は未完了です。</p>`:`<h4>起運の時間差換算</h4><p>${escape(reasons[yun?.reason]||'確定した出生時刻と計算用性別が必要です。出生時計の入力と計算状態を確認してください。')}</p>`;
    const dateTime=value=>escape(String(value||'').replace('T',' '));
    const periodReasons={CALCULATION_SEX_REQUIRED:'計算用性別を指定してください。',KNOWN_BIRTH_TIME_REQUIRED_FOR_YUN:'確定した出生時刻が必要です。',DAYUN_INTERVAL_OUT_OF_RANGE:'必要な大運区間が対応年代を超えています。掲載範囲は短縮しません。',REFERENCE_BEFORE_YUN_START:'基準日は起運前で、現在の大運を確定できません。',REFERENCE_DAYUN_BOUNDARY_TIME_REQUIRED:'基準日の途中で大運が切り替わります。基準時刻がないため現在の大運を確定できません。',REFERENCE_SOLAR_YEAR_BOUNDARY_TIME_REQUIRED:'基準日の途中で節年が切り替わります。基準時刻がないため対象節年を確定できません。',SOLAR_YEAR_OUT_OF_RANGE:'必要な節年全体が対応年代の範囲外です。'};
    const periodPage=id=>pages.find(page=>page.pageDefinitionId===id);
    const periodMissing=id=>`<p>${escape(periodReasons[periodPage(id)?.reason]||'必要な起運・大運・年運が確定していません。出生時計と計算用性別を確認してください。')}</p>`;
    const intervalText=item=>`${escape(item.ganzhi)}（${escape(item.stemTenGod)}）<br>${dateTime(item.startStandard)} 〜 ${dateTime(item.endExclusiveStandard)}`;
    const table=periodPage('BAZ-06')?.data,current=periodPage('BAZ-07')?.data,years=periodPage('BAZ-13')?.data?.years,transition=periodPage('BAZ-14')?.data;
    const periodPreview=`<h4>大運・節年の計算結果（下書き）</h4><details><summary>大運表（10区間）</summary><p>各区間は開始を含み、終了を含みません。日時は日本標準時です。</p>${table?`<ol>${table.intervals.map(item=>`<li>${intervalText(item)}</li>`).join('')}</ol>`:periodMissing('BAZ-06')}</details><h4>現在の大運と節年</h4>${current?`<p>大運 ${escape(current.currentDayun.ganzhi)}（${escape(current.currentDayun.stemTenGod)}）／${escape(current.annual.year)}節年 ${escape(current.annual.ganzhi)}（${escape(current.annual.stemTenGod)}）<br>大運：${dateTime(current.currentDayun.startStandard)} 〜 ${dateTime(current.currentDayun.endExclusiveStandard)}<br>節年：${dateTime(current.annual.startStandard)} 〜 ${dateTime(current.annual.endExclusiveStandard)}</p>`:periodMissing('BAZ-07')}<h4>今年・来年の節年</h4>${years?years.map(year=>`<p>${escape(year.year)}節年 ${escape(year.ganzhi)}（${escape(year.stemTenGod)}）<br>${dateTime(year.startStandard)} 〜 ${dateTime(year.endExclusiveStandard)}<br>対応大運：${year.correspondingDayun.map(item=>escape(item.ganzhi)).join('・')}</p>`).join(''):periodMissing('BAZ-13')}<h4>次の大運の境界</h4>${transition?`<p>${escape(transition.currentDayun.ganzhi)} → ${escape(transition.nextDayun.ganzhi)}<br>${dateTime(transition.boundaryStandard)}<br>満${escape(transition.age.fullYears)}歳（日本標準時の誕生日基準）</p>`:periodMissing('BAZ-14')}`;
    const labels={available:'計算済み', 'valid-zero':'計算済み（該当0件）','required-missing':'入力不足','calculation-error':'計算できません','unconnected':'未接続'};
    field('result').innerHTML=`${yunPreview}${periodPreview}<h4>保存された計算結果（下書き）</h4><ul>${pages.map(page=>`<li>${escape(page.pageDefinitionId)}：${escape(labels[page.state]||'未確認')}</li>`).join('')}</ul><p>本人の柱：${escape(Object.values(pages.find(page=>page.pageDefinitionId==='BAZ-01')?.data?.pillars||{}).filter(Boolean).join('・')||'未計算')}</p><p>対応柱の合・冲：${escape(pages.find(page=>page.pageDefinitionId==='BAZ-08')?.data?.matches ? pages.find(page=>page.pageDefinitionId==='BAZ-08').data.matches.length+'件' : '未計算')}</p><p>計算済みでも文章・素材・発行の承認は未完了です。</p>`;
  };
  render(snapshot.fourPillarsCalculation);
  const readClock=prefix=>({date:field(prefix+'date').value,time:field(prefix+'time').value||null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:field(prefix+'confirm').checked,offsetChoiceMinutes:field(prefix+'offset').value===''?null:Number(field(prefix+'offset').value)});
  let saving=false,disabledControls=null;
  const setStatus=message=>{field('status').textContent=message;const active=numeriaBaziActiveForm;if(active?.sessionId===snapshot.id&&active.container!==container&&active.container.isConnected!==false)active.setStatus(message);};
  const setSaving=value=>{
    saving=value;
    if(value&&!disabledControls){const controls=Array.from(container.querySelectorAll('input,select'));disabledControls=controls.map(control=>[control,control.disabled]);controls.forEach(control=>control.disabled=true);}
    if(!value&&disabledControls){disabledControls.forEach(([control,disabled])=>control.disabled=disabled);disabledControls=null;}
    field('save').disabled=value;
  };
  const mounted={sessionId:snapshot.id,container,setSaving,setStatus:message=>{field('status').textContent=message;},accept:saved=>{render(saved.fourPillarsCalculation);prior.referenceDate=saved.fourPillarsInput.referenceDate;field('reference').readOnly=true;field('status').textContent='下書きを保存しました。計算結果は未承認です。';}};
  numeriaBaziActiveForm=mounted;
  if(numeriaBaziPendingSave){setSaving(true);field('status').textContent=numeriaBaziPendingSave.sessionId===snapshot.id?'下書きを保存しています。':'別の鑑定の保存完了を待っています。';}
  field('preview-open').onclick=()=>{
    if(numeriaBaziPendingSave){setStatus('保存完了後に計算ページを開いてください。');return;}
    const current=api.getReadingSnapshot?.();
    if(current?.id!==snapshot.id||current?.divination!=='four-pillars'){setStatus('鑑定が切り替わりました。入力画面を開き直してください。');return;}
    const result=openFourPillarsDraftPreview({snapshot:current,definitions:previewOptions.getDefinitions?.()||[],layoutId:previewOptions.getLayout?.()||'standard'});
    if(!result.ok)setStatus(result.message);
  };
  field('save').onclick=async()=>{
    if(saving||numeriaBaziPendingSave)return;
    const current=api.getReadingSnapshot?.();
    if(current?.divination!=='four-pillars'||current.id!==snapshot.id){setStatus('鑑定が切り替わりました。入力画面を開き直してください。');return;}
    if(!field('date').value||!field('reference').value||!field('confirm').checked){setStatus('本人の生年月日・基準日・出生時計の確認が必要です。');return;}
    if(prior.referenceDate&&field('reference').value!==prior.referenceDate){setStatus('保存済み基準日は変更できません。新規鑑定を作成してください。');return;}
    if(field('partnerEnabled').checked&&(!field('partnerdate').value||!field('partnerconfirm').checked)){setStatus('比較相手の生年月日と出生時計を確認してください。');return;}
    const subjectId=prior.subjectId||`bazi:${snapshot.id}:subject`,partnerSubjectId=prior.partnerSubjectId||`bazi:${snapshot.id}:partner`;
    const input={...prior,methodKey:'four-pillars',subjectId,partnerSubjectId:field('partnerEnabled').checked?partnerSubjectId:null,birthClock:readClock(''),partnerBirthClock:field('partnerEnabled').checked?readClock('partner'):null,referenceDate:field('reference').value,calculationSex:field('sex').value||null,familyContext:field('family').value||null,parentDirection:field('family').value==='parent-child'?field('direction').value||null:null};
    const updated=api.updateFourPillarsInput?.(input);
    if(!updated?.ok){setStatus(updated?.message||'四柱推命の鑑定を開き直してください。');return;}
    numeriaBaziPendingSave={sessionId:snapshot.id};setSaving(true);setStatus('下書きを保存しています。');
    let acknowledged=false;
    const onStatus=event=>{
      if(event.detail?.sessionId!==snapshot.id)return;
      if(event.detail.state==='saved'&&event.detail.acknowledgedDraftId===snapshot.id&&event.detail.serverSnapshot?.id===snapshot.id&&event.detail.serverSnapshot?.divination==='four-pillars'&&JSON.stringify(event.detail.serverSnapshot?.fourPillarsInput)===JSON.stringify(input)&&event.detail.serverSnapshot?.fourPillarsCalculation?.schemaVersion==='numeria.bazi.calculation-checkpoint.v1'&&event.detail.serverSnapshot?.fourPillarsCalculation?.publicationAllowed===false){
        if(!api.adoptFourPillarsSavedSnapshot?.(event.detail.serverSnapshot)?.ok)return;
        acknowledged=true;const active=numeriaBaziActiveForm;if(active?.sessionId===snapshot.id&&active.container.isConnected!==false)active.accept(event.detail.serverSnapshot);
      }
    };
    window.addEventListener('numeria-reading-draft-save-status',onStatus);
    try{await api.saveReadingDraft();if(!acknowledged)setStatus('保存を確認できませんでした。入力を保持しています。保存状態を確認して再試行してください。');}
    catch{setStatus('下書きを保存できませんでした。入力を保持しています。再試行してください。');}
    finally{window.removeEventListener('numeria-reading-draft-save-status',onStatus);numeriaBaziPendingSave=null;setSaving(false);const active=numeriaBaziActiveForm;if(active!==mounted){active?.setSaving(false);if(active?.sessionId!==snapshot.id)active?.setStatus('');}}
  };
}
