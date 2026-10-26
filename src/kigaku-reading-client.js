// Dependency-free controller, also embedded into the legacy app at build time.
export function createKigakuReadingClient({ request, onChange, referenceInstant }) {
  let revision = 0, requestId = 0, saving = false;
  let state = { input: { referenceInstant, birthClock: null, selectedDirection: null }, reading: null, periodPages: null, draftId: null, clientName: '', clientProfileId: null, calculation: 'idle', save: 'idle', error: '' };
  const emit = () => onChange({ ...state, input: structuredClone(state.input) });
  const fail = error => { state.error = error.message || '処理できませんでした'; };
  return {
    current: () => structuredClone(state),
    subscribe(listener) { onChange = listener; },
    change(patch) { revision++; requestId++; state = { ...state, input: { ...state.input, ...patch }, reading: null, periodPages: null, calculation: 'idle', save: 'unsaved', error: '' }; emit(); },
    name(clientName) { revision++; requestId++; state.clientName = clientName; state.reading = null; state.periodPages = null; state.calculation = 'idle'; state.save = 'unsaved'; emit(); },
    selectProfile(profile) {
      revision++; requestId++;
      state = { ...state, clientProfileId: profile?.id || null, clientName: profile?.name || '', draftId: null, reading: null, periodPages: null, calculation: 'idle', save: 'unsaved', error: '', input: { referenceInstant: state.input.referenceInstant, selectedDirection: null, birthPlace: '', birthClock: profile ? { date: profile.birthday || '', time: null, countryCode: 'JP', zoneId: 'Asia/Tokyo', zoneConfirmed: false } : null } };
      emit();
    },
    async calculate() {
      const id = ++requestId, version = revision;
      const input = structuredClone(state.input);
      state.calculation = 'loading'; state.error = ''; emit();
      try {
        const body = await request('/api/kigaku/calculate', { input });
        if (id !== requestId || version !== revision) return;
        state.reading = body.reading; state.input = body.reading.input; state.calculation = 'ready'; state.save = 'unsaved';
      } catch (error) { if (id !== requestId || version !== revision) return; state.calculation = 'error'; fail(error); }
      emit();
    },
    async previewPeriods() {
      if(!state.reading)return;
      const id=++requestId,version=revision;
      state.periodPages=null;state.error='';emit();
      try {
        const body=await request('/api/kigaku/period-pages',{snapshot:structuredClone(state.reading)});
        if(id!==requestId||version!==revision)return;
        state.periodPages=body.pages;
      } catch(error){if(id!==requestId||version!==revision)return;fail(error);}
      emit();
    },
    async save() {
      if (!state.reading || saving) return;
      saving = true;
      const version = revision, snapshot = structuredClone(state.reading);
      const appraisalId = state.draftId || `kigaku_${crypto.randomUUID()}`;
      state.draftId = appraisalId; state.save = 'saving'; state.error = ''; emit();
      try {
        const body = await request('/api/appraisals/save-draft', { appraisalId, clientName: state.clientName, clientProfileId: state.clientProfileId, birthDate: snapshot.input.birthClock?.date || '', divination: 'nine-star-ki', question: snapshot.input.question, snapshot });
        if (version !== revision) return;
        if (body.draftId !== appraisalId || JSON.stringify(body.activeDraft?.snapshot) !== JSON.stringify(snapshot)) throw new Error('保存応答が一致しません。再度保存してください');
        state.save = 'saved';
      } catch (error) { if (version === revision) { state.save = 'error'; fail(error); } }
      finally { saving = false; emit(); }
    },
    async restore(expectedDraftId = null) {
      if (saving) return;
      const id = ++requestId, version = revision;
      state.error = ''; state.calculation = 'restoring'; emit();
      try {
        const body = await request('/api/usage');
        if (id !== requestId || version !== revision) return;
        const draft = body.usage?.activeDraft;
        if (expectedDraftId && draft?.id !== expectedDraftId) throw new Error('この履歴は現在の保存済み下書きと一致しません');
        if (draft?.snapshot?.schemaVersion !== 'numeria.kigaku.reading.v1') throw new Error('復元できる九星の下書きはありません');
        state = { ...state, input: draft.snapshot.input, reading: draft.snapshot, periodPages: null, clientName: draft.clientName || '', clientProfileId: draft.clientProfileId || null, draftId: draft.id, calculation: 'ready', save: 'saved' };
      } catch (error) { if (id !== requestId || version !== revision) return; state.calculation = 'error'; fail(error); }
      emit();
    },
    dispose() { revision++; requestId++; onChange = () => {}; },
  };
}
