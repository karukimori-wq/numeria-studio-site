// Receives the host React instance so hooks share the existing app renderer.
export function createKigakuReadingComponent(R) {
  const h = R.createElement;
  const directionPreview = page => !page.directionRows?.length ? null : h('section', null,
    h('h3', null, '年・月の共通吉方位'),
    h('table', {style:{minWidth:0,tableLayout:'fixed'},'aria-label':'年・月の共通吉方位マップ'},
      h('caption', null, '吉方位マップ（南が上・年と月の積集合）'),
      h('tbody', null, ...[['SE','S','SW'],['E','C','W'],['NE','N','NW']].map((row,i) => h('tr', {key:i}, ...row.map(direction => h('td', {key:direction}, direction === 'C' ? '年・月の共通判定' : `${page.directionRows.find(r => r.direction === direction).label}：${page.commonGood.includes(direction) ? '共通吉' : '共通吉に該当せず'}`)))))),
    h('p', null, page.commonGood.length ? page.commonGood.map(d => page.directionRows.find(row => row.direction === d).label).join('・') : '該当なし（年・月の判定は完了）'),
    h('div', {className:'kigaku-table-wrap'}, h('table', null,
      h('caption', null, '八方位の年・月比較（日盤は含めません）'),
      h('thead', null, h('tr', null, ...['方位','年盤','月盤','共通吉'].map(label => h('th', {key:label,scope:'col'}, label)))),
      h('tbody', null, ...page.directionRows.filter(row => row.period === 'year').map(year => {
        const month = page.directionRows.find(row => row.period === 'month' && row.direction === year.direction);
        return h('tr', {key:year.direction}, h('th', {scope:'row'}, year.label), h('td', null, year.judgementLabel), h('td', null, month.judgementLabel), h('td', null, page.commonGood.includes(year.direction) ? '該当' : '該当せず'));
      })))),
    ...page.directionRows.map(row => h('section', {key:`${row.period}-${row.direction}`},
      h('h4', null, `${row.period === 'year' ? '年盤' : '月盤'}・${row.label} ／ 盤内星 ${row.star} ／ ${row.judgementLabel}`),
      h('p', null, `五行関係：${row.elementRelation.label} ／ 吉候補条件：${row.goodCandidate ? '該当' : '該当せず'} ／ 候補除外：${row.candidateExclusions.map(code => ({OWN_STAR:'本命星と同じ星',FIVE_YELLOW:'五黄'})[code]).join('・') || 'なし'} ／ 凶理由：${row.dangerReasons.map(reason => reason.label).join('・') || 'なし'}`),
      ...row.copies.map(copy => h('p', {key:copy.copyId}, copy.body)))));
  return function KigakuReading({ profiles = [], onSaved = null } = {}) {
    const [state, setState] = R.useState(null);
    const client = R.useRef(null);
    if (!client.current) client.current = createKigakuReadingClient({ referenceInstant: new Date().toISOString(), onChange: setState, request: async (path, body) => {
      const token = await window.Clerk?.session?.getToken();
      if (!token) throw new Error('ログイン状態を確認してください');
      const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.errorCode || '処理できませんでした');
      return data;
    } });
    R.useEffect(() => { client.current.subscribe(setState); return () => client.current.dispose(); }, []);
    R.useEffect(() => {
      const dirty = () => ['unsaved', 'saving', 'error'].includes(client.current.current().save);
      const beforeUnload = event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } };
      const navigation = event => {
        const target = event.target.closest?.('button,a');
        if (!target || target.closest('.kigaku-reading') || !dirty()) return;
        if (!window.confirm('未保存の九星入力があります。画面を離れますか？')) { event.preventDefault(); event.stopImmediatePropagation(); }
      };
      window.addEventListener('beforeunload', beforeUnload);
      document.addEventListener('click', navigation, true);
      const pending = window.NumeriaKigakuPendingRestore;
      if (pending) { delete window.NumeriaKigakuPendingRestore; client.current.restore(pending); }
      return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', navigation, true); };
    }, []);
    const s = state || client.current.current(), input = s.input, clock = input.birthClock || { date: '', time: null, countryCode: 'JP', zoneId: 'Asia/Tokyo', zoneConfirmed: false };
    const change = patch => client.current.change(patch);
    const birth = patch => change({ birthClock: { ...clock, offsetChoiceMinutes: null, ...patch } });
    const field = (label, props) => h('label', { className: 'kigaku-field' }, label, h('input', props));
    const text = (label, key, maxLength) => h('label', { className: 'kigaku-field' }, label, h('textarea', { value: input[key] || '', maxLength, onChange: e => change({ [key]: e.target.value }) }));
    const step = (n, title, ...children) => h('details', { open: true, className: 'kigaku-step' }, h('summary', null, `${n}　${title}`), ...children);
    const analysis = s.reading?.result.analysis;
    const normalization = s.reading?.result.sourceResult.clockNormalization;
    const partnerClock=input.partnerBirthClock||{date:'',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:false};
    const partnerBirth=patch=>change({partnerBirthClock:{...partnerClock,offsetChoiceMinutes:null,...patch}});
    const partnerNormalization=s.reading?.partnerResult?.clockNormalization;
    const choose=(label,key,options)=>h('label',{className:'kigaku-field'},label,h('select',{value:input[key]||'',onChange:e=>change({[key]:e.target.value})},h('option',{value:''},'未選択'),...options.map(([value,label])=>h('option',{key:value,value},label))));
    const refText=ref=>ref.role?`${ref.label}：${ref.star} ／ ${ref.relation?`比較関係 ${ref.relation} ／ `:''}計算版 ${ref.calculationVersion}`:`${ref.date?`対象日 ${ref.date}（${ref.timeZone}） ／ ${ref.methodLabel} ／ `:''}${ref.kiYear!==undefined?`${ref.kiYear}節年 ／ `:''}${ref.startInclusive} 以上 ～ ${ref.endExclusive} 未満 ／ 本命星 ${ref.mainStar} ／ ${ref.direction?`方位 ${ref.direction}・盤内星 ${ref.star}`:`回座宮 ${ref.palace}`}`;
    const relationLabels={biwa:'比和',gasei:'我生（本人から相手を生じる）',seiga:'生我（相手から本人を生じる）',gakoku:'我剋（本人から相手を剋す）',kokuga:'剋我（相手から本人を剋す）'};
    const extras=page=>h(R.Fragment,null,
      ['KIG-07','KIG-14'].includes(page.pageId)&&page.rows.length>0&&h('div',{className:'kigaku-table-wrap'},h('table',null,h('caption',null,page.pageId==='KIG-07'?'12節月の期間表':'連続9節年の期間表'),h('tbody',null,...page.rows.map((row,i)=>h('tr',{key:i},h('th',{scope:'row'},page.pageId==='KIG-07'?`${row.kiYear}節年・第${row.solarMonthIndex+1}節月`:`${row.kiYear}節年`),h('td',null,`${row.startInclusive} 以上 ～ ${row.endExclusive} 未満`),h('td',null,`本人回座宮 ${row.honmeiPosition}`)))))),
      page.relationship&&h('section',{'aria-label':`${page.title}の関係図`},h('svg',{viewBox:'0 0 500 180',role:'img','aria-label':`${page.title}：本人と相手の五行関係`,style:{width:'100%',maxWidth:500,height:'auto'}},
        h('title',null,relationLabels[page.relationship.relation]),
        h('defs',null,h('marker',{id:`arrow-${page.pageId}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},h('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#8c6b3d'}))),
        h('line',{x1:145,y1:85,x2:355,y2:85,stroke:'#8c6b3d',strokeWidth:2,strokeDasharray:['gakoku','kokuga'].includes(page.relationship.relation)?'6 4':undefined,markerEnd:['gasei','gakoku'].includes(page.relationship.relation)?`url(#arrow-${page.pageId})`:undefined,markerStart:['seiga','kokuga'].includes(page.relationship.relation)?`url(#arrow-${page.pageId})`:undefined}),
        ...[[90,'本人',page.relationship.self],[410,'相手',page.relationship.partner]].map(([x,label,star])=>h('g',{key:label},h('circle',{cx:x,cy:85,r:52,fill:'#fffdf9',stroke:'#8c6b3d'}),h('text',{x,y:78,textAnchor:'middle',fill:'#302b25',fontSize:16},label),h('text',{x,y:103,textAnchor:'middle',fill:'#302b25',fontSize:20},`本命星 ${star}`)))),h('p',null,`本人（本命星 ${page.relationship.self}） → 相手 ${page.relationship.partnerName}（本命星 ${page.relationship.partner}）`),h('p',null,relationLabels[page.relationship.relation]),page.relationship.context&&h('p',null,`本人から見た関係：${page.relationship.context}`)),
      page.periodComparison?.length>0&&h('div',{className:'kigaku-table-wrap'},h('table',null,h('caption',null,'仕事テーマの年・月比較（未来の適日判定ではありません）'),h('tbody',null,...page.periodComparison.map(row=>h('tr',{key:row.period},h('th',{scope:'row'},row.period==='year'?'年運の背景':'月運の流れ'),h('td',null,row.workTheme==='job-change'?'転職':'独立'),h('td',null,refText(row))))))),
      page.selectedDirection&&h('section',null,h('h3',null,`指定方位 ${page.selectedDirection} ／ ${page.directionPurpose==='travel'?'旅行':'引越し'}`),h('p',null,page.commonGood.length?'指定方位は年・月の共通吉条件に該当':'指定方位は年・月の共通吉条件に該当せず'),...page.selectedRows.map(row=>h('p',{key:row.period},`${row.period==='year'?'年盤':'月盤'}：${row.label}・星${row.star} ／ ${row.judgementLabel} ／ 候補除外 ${row.candidateExclusions.join('・')||'なし'} ／ 凶理由 ${row.dangerReasons.map(r=>r.label).join('・')||'なし'}`))),
      ...((page.supplements)||[]).map((slot,i)=>h('section',{key:i},h('h3',null,slot.label),...slot.resultRefs.map((ref,j)=>h('p',{key:j},refText(ref))),...slot.copies.map((copy,j)=>h('p',{key:j},copy.body)))));

    const rows = period => h('div', { className: 'kigaku-table-wrap' }, h('table', null, h('caption', null, period === 'year' ? '年盤の方位' : '月盤の方位'), h('thead', null, h('tr', null, ...['方位', '星', '判定', '理由'].map(t => h('th', { key: t, scope: 'col' }, t)))), h('tbody', null, ...analysis[period].map(row => h('tr', { key: row.direction }, h('th', { scope: 'row' }, row.label), h('td', null, row.star), h('td', null, row.judgementLabel), h('td', null, row.dangerReasons.map(r => r.label).join('・') || row.elementRelation.label))))));
    return h('section', { className: 'page kigaku-reading', 'aria-label': '九星鑑定入力' },
      h('h1', null, '九星気学の鑑定'),
      h('p', null, '計算結果と入力内容を下書きに保存します。鑑定書の原文・PDFは準備中です。'),
      h('button', { type: 'button', disabled: s.save === 'saving', onClick: () => { if (s.save === 'unsaved' && !window.confirm('未保存の入力を下書きで置き換えますか？')) return; client.current.restore(); } }, '保存済みの九星下書きを復元'),
      step(1, '相談者を選ぶ',
        h('label', { className: 'kigaku-field' }, 'カルテから呼び出す', h('select', { value: s.clientProfileId || '', onChange: e => { if (['unsaved', 'saving', 'error'].includes(s.save) && !window.confirm('入力内容を選択した相談者の情報に置き換えますか？')) return; client.current.selectProfile(profiles.find(profile => profile.id === e.target.value) || null); } }, h('option', { value: '' }, '直接入力'), ...profiles.map(profile => h('option', { key: profile.id, value: profile.id }, profile.name)))),
        field('相談者名', { value: s.clientName, maxLength: 200, onChange: e => client.current.name(e.target.value) }),
        field('生年月日', { type: 'date', min: '1901-01-01', max: '2100-12-31', value: clock.date, onChange: e => birth({ date: e.target.value }) }),
        field('出生時刻（不明なら空欄）', { type: 'time', step: 1, value: clock.time || '', onChange: e => birth({ time: e.target.value || null }) }),
        field('出生地', { value: input.birthPlace || '', maxLength: 500, onChange: e => change({ birthPlace: e.target.value }) }),
        h('label', null, h('input', { type: 'checkbox', checked: clock.zoneConfirmed, onChange: e => birth({ zoneConfirmed: e.target.checked }) }), '出生地の時計が日本標準時（Asia/Tokyo）の適用対象であることを確認しました'),
        h('p', null, '日本国内でも歴史的な時刻帯を確認してください。未確認のまま本命星・月命星を確定しません。'),
        normalization?.reasonCode === 'BIRTH_CLOCK_TIME_AMBIGUOUS' && h('fieldset', null, h('legend', null, '夏時間終了時の重複時計：記録を確認して選択'), ...normalization.candidates.map(candidate => h('button', { key: candidate.appliedOffsetMinutes, type: 'button', onClick: () => birth({ offsetChoiceMinutes: candidate.appliedOffsetMinutes }) }, `UTC+${candidate.appliedOffsetMinutes / 60}（${candidate.utcInstant}）`)))),
      step(2, '相談内容', text('相談文', 'question', 10000), field('目的', { value: input.purpose || '', maxLength: 1000, onChange: e => change({ purpose: e.target.value }) }), field('テーマ', { value: input.theme || '', maxLength: 1000, onChange: e => change({ theme: e.target.value }) }),
        h('fieldset',null,h('legend',null,'相性の相手（任意・2名比較）'),
          h('label',{className:'kigaku-field'},'相手をカルテから呼び出す',h('select',{value:'',onChange:e=>{const p=profiles.find(p=>p.id===e.target.value);if(p)change({loveRelationship:'',workRelationship:'',familyRelationship:'',partnerName:p.name||'',partnerBirthClock:{date:p.birthday||'',time:null,countryCode:'JP',zoneId:'Asia/Tokyo',zoneConfirmed:false}});}},h('option',{value:''},'選択して入力'),...profiles.map(p=>h('option',{key:p.id,value:p.id},p.name)))),
          field('相手の名前',{value:input.partnerName||'',maxLength:200,onChange:e=>change({partnerName:e.target.value})}),
          field('相手の生年月日',{type:'date',min:'1901-01-01',max:'2100-12-31',value:partnerClock.date,onChange:e=>partnerBirth({date:e.target.value})}),
          field('相手の出生時刻（不明なら空欄）',{type:'time',step:1,value:partnerClock.time||'',onChange:e=>partnerBirth({time:e.target.value||null})}),
          h('label',null,h('input',{type:'checkbox',checked:partnerClock.zoneConfirmed,onChange:e=>partnerBirth({zoneConfirmed:e.target.checked})}),'相手の出生時計が日本標準時の適用対象であることを確認しました'),
          partnerNormalization?.reasonCode==='BIRTH_CLOCK_TIME_AMBIGUOUS'&&h('fieldset',null,h('legend',null,'相手の夏時間終了時：記録を確認して選択'),...partnerNormalization.candidates.map(c=>h('button',{key:c.appliedOffsetMinutes,type:'button',onClick:()=>partnerBirth({offsetChoiceMinutes:c.appliedOffsetMinutes})},`相手 UTC+${c.appliedOffsetMinutes/60}（${c.utcInstant}）`))),
          h('button',{type:'button',onClick:()=>change({partnerName:'',partnerBirthClock:null,loveRelationship:'',workRelationship:'',familyRelationship:''})},'相手の入力を解除')),
        ...[['loveRelationship','恋愛の関係種別（本人から見た相手）'],['workRelationship','職場の関係種別（本人から見た相手）'],['familyRelationship','家族の関係種別（本人から見た相手：例 子、親）']].map(([key,label])=>field(label,{key,value:input[key]||'',maxLength:200,onChange:e=>change({[key]:e.target.value})})),
        choose('仕事テーマ','workTheme',[['job-change','転職'],['independence','独立']]),
        choose('方位相談の目的','directionPurpose',[['travel','旅行'],['move','引越し']]),
        field('基準日時（秒・時差を含むISO形式）', { value: input.referenceInstant, onChange: e => change({ referenceInstant: e.target.value }) }),
        h('label', { className: 'kigaku-field' }, '相談方位（起点から手動で選択）', h('select', { value: input.selectedDirection || '', onChange: e => change({ selectedDirection: e.target.value || null }) }, ...[['', '未選択'], ['N','北'], ['NE','北東'], ['E','東'], ['SE','南東'], ['S','南'], ['SW','南西'], ['W','西'], ['NW','北西']].map(([value, label]) => h('option', { key: value, value }, label))))),
      step(3, '鑑定書選択', h('p', null, '全14固定ページの未承認草案を確認できます。保存後にA4草案を開き、印刷画面から確認用PDFを保存できます。正式発行はできません。'),
        h('button',{type:'button',disabled:!s.reading||s.periodPreviewState==='loading',onClick:()=>client.current.previewPeriods()},s.periodPreviewState==='loading'?'草案を読み込み中…':'全14固定ページの草案を確認'),
        h('p',{role:'status','aria-live':'polite'},s.periodPreviewState==='loading'?'草案ページを準備しています':s.periodPreviewState==='error'?'草案を取得できませんでした。再試行してください':''),
        ...(s.periodPages||[]).map(page=>h('article',{key:page.pageId,className:'kigaku-step'},h('h2',null,page.title),page.board&&h('table',{'aria-label':`${page.title}の九宮盤`,style:{minWidth:0,tableLayout:'fixed'}},h('caption',null,'南が上の九宮盤'),h('tbody',null,...[['SE','S','SW'],['E','C','W'],['NE','N','NW']].map((row,i)=>h('tr',{key:i},...row.map(palace=>h('td',{key:palace},`${({SE:'南東',S:'南',SW:'南西',E:'東',C:'中央',W:'西',NE:'北東',N:'北',NW:'北西'})[palace]}：${page.board[palace]}${page.rows[0]?.palace===palace?'（本命星）':''}`)))))),h('p',null,page.state==='draft_preview'?'未承認草案・正式出力不可':({PARTNER_MAIN_STAR_REQUIRED:'相手の本命星の確定が必要です',RELATIONSHIP_CONTEXT_REQUIRED:'本人から見た関係種別を入力してください',WORK_THEME_REQUIRED:'転職または独立を選択してください',MANUAL_DIRECTION_REQUIRED:'方位を手動選択してください',DIRECTION_PURPOSE_REQUIRED:'旅行または引越しを選択してください',NATAL_STARS_REQUIRED:'本命星・月命星の確定が必要です',PRO_REQUIRED:'Pro対象ページです',MAIN_STAR_REQUIRED:'本命星の確定が必要です',FULL_PERIOD_OUT_OF_RANGE:'全期間が対応範囲に収まりません'})[page.reasonCode]||'利用できません'),
          directionPreview(page),extras(page),...page.slots.map((slot,i)=>h('section',{key:i},...slot.resultRefs.map((ref,j)=>h('p',{key:j},refText(ref))),...slot.copies.map((copy,j)=>h('p',{key:j},`${copy.period?`${copy.period==='year'?'年盤':'月盤'}：`:''}${copy.variant==='short'?copy.short:copy.body}`)))),page.practitionerComment&&h('p',null,page.practitionerComment)))),
      ...[['standard','スタンダード'],['magazine','マガジン']].map(([format,label])=>h('button',{key:format,type:'button',disabled:!s.reportSnapshot||s.save!=='saved',onClick:()=>client.current.printReport(format)},`${label} A4草案／PDF`)),
      step(4, '鑑定計算結果の確認', h('button', { type: 'button', disabled: s.calculation === 'loading', onClick: () => client.current.calculate() }, s.calculation === 'loading' ? '計算中…' : '入力内容で計算する'),
        !analysis && h('p', null, '計算後に結果を表示します。入力を変更すると前の結果を無効にします。'),
        analysis && h('p', null, `本命星：${s.reading.result.sourceResult.natal.mainStar.value ?? '未確定'} ／月命星：${s.reading.result.sourceResult.natal.monthStar.value ?? '未確定'}`),
        s.reading?.partnerResult&&h('p',null,`相手の本命星：${s.reading.partnerResult.natal.mainStar.value??'未確定'} ／ 月命星：${s.reading.partnerResult.natal.monthStar.value??'未確定'} ／ 出生時計：${partnerNormalization?.reasonCode||'確認済み'}`),
        normalization?.reasonCode && h('p', null, `出生時計の状態：${normalization.reasonCode}`),
        analysis?.state === 'ready' && h(R.Fragment, null, rows('year'), rows('month'), h('p', null, `年・月に共通する吉方位：${analysis.common.directions.join('・') || '該当なし'}`)),
        h('p', null, '算出結果は独立した暦との全期間照合前です。日盤を共通吉方位の判定には使用しません。')),
      step(5, '鑑定結果入力', text('占い師の独自コメント', 'practitionerComment', 20000), h('label', null, h('input', { type: 'checkbox', checked: input.commentEnabled ?? true, onChange: e => change({ commentEnabled: e.target.checked }) }), '独自コメントを掲載する'), h('p', null, 'システム解説は常時掲載します。')),
      h('button', { type: 'button', disabled: !s.reading || s.save === 'saving', onClick: async () => { await client.current.save(); const saved = client.current.current(); if (saved.save === 'saved' && onSaved) onSaved(saved); } }, '下書きを保存'),
      h('p', { role: 'status', 'aria-live': 'polite' }, ({ idle: '', unsaved: '未保存', saving: '保存中…', saved: 'サーバーへの保存を確認しました', error: '保存できませんでした' })[s.save]),
      s.error && h('p', { role: 'alert' }, s.error));
  };
}
