// Receives the host React instance so hooks share the existing app renderer.
export function createKigakuReadingComponent(R) {
  const h = R.createElement;
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
        field('基準日時（秒・時差を含むISO形式）', { value: input.referenceInstant, onChange: e => change({ referenceInstant: e.target.value }) }),
        h('label', { className: 'kigaku-field' }, '相談方位（起点から手動で選択）', h('select', { value: input.selectedDirection || '', onChange: e => change({ selectedDirection: e.target.value || null }) }, ...[['', '未選択'], ['N','北'], ['NE','北東'], ['E','東'], ['SE','南東'], ['S','南'], ['SW','南西'], ['W','西'], ['NW','北西']].map(([value, label]) => h('option', { key: value, value }, label))))),
      step(3, '鑑定書選択', h('p', null, '期間ページの未承認草案を確認できます。正式PDFは未対応です。'),
        h('button',{type:'button',disabled:!s.reading,onClick:()=>client.current.previewPeriods()},'12節月・9年間の草案を確認'),
        ...(s.periodPages||[]).map(page=>h('article',{key:page.pageId,className:'kigaku-step'},h('h2',null,page.title),h('p',null,page.state==='draft_preview'?'未承認草案・正式出力不可':({PRO_REQUIRED:'Pro対象ページです',MAIN_STAR_REQUIRED:'本命星の確定が必要です',FULL_PERIOD_OUT_OF_RANGE:'全期間が対応範囲に収まりません'})[page.reasonCode]||'利用できません'),
          ...page.slots.map((slot,i)=>h('section',{key:i},...slot.resultRefs.map((ref,j)=>h('p',{key:j},`${ref.startInclusive} 以上 ～ ${ref.endExclusive} 未満 ／ 本命星 ${ref.mainStar} ／ 回座宮 ${ref.palace}`)),...slot.copies.map((copy,j)=>h('p',{key:j},copy.variant==='short'?copy.short:copy.body)))),page.practitionerComment&&h('p',null,page.practitionerComment)))),
      step(4, '鑑定計算結果の確認', h('button', { type: 'button', disabled: s.calculation === 'loading', onClick: () => client.current.calculate() }, s.calculation === 'loading' ? '計算中…' : '入力内容で計算する'),
        !analysis && h('p', null, '計算後に結果を表示します。入力を変更すると前の結果を無効にします。'),
        analysis && h('p', null, `本命星：${s.reading.result.sourceResult.natal.mainStar.value ?? '未確定'} ／月命星：${s.reading.result.sourceResult.natal.monthStar.value ?? '未確定'}`),
        normalization?.reasonCode && h('p', null, `出生時計の状態：${normalization.reasonCode}`),
        analysis?.state === 'ready' && h(R.Fragment, null, rows('year'), rows('month'), h('p', null, `年・月に共通する吉方位：${analysis.common.directions.join('・') || '該当なし'}`)),
        h('p', null, '算出結果は独立した暦との全期間照合前です。日盤を共通吉方位の判定には使用しません。')),
      step(5, '鑑定結果入力', text('占い師の独自コメント', 'practitionerComment', 20000), h('label', null, h('input', { type: 'checkbox', checked: input.commentEnabled ?? true, onChange: e => change({ commentEnabled: e.target.checked }) }), '独自コメントを掲載する'), h('p', null, 'システム解説は常時掲載します。')),
      h('button', { type: 'button', disabled: !s.reading || s.save === 'saving', onClick: async () => { await client.current.save(); const saved = client.current.current(); if (saved.save === 'saved' && onSaved) onSaved(saved); } }, '下書きを保存'),
      h('p', { role: 'status', 'aria-live': 'polite' }, ({ idle: '', unsaved: '未保存', saving: '保存中…', saved: 'サーバーへの保存を確認しました', error: '保存できませんでした' })[s.save]),
      s.error && h('p', { role: 'alert' }, s.error));
  };
}
