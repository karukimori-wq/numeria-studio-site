function mountNumerologyNameForm(container, onUpdate) {
  const api = window.NumeriaNavigation, snapshot = api?.getReadingSnapshot?.();
  if (snapshot?.divination !== "numerology" || typeof api?.updateNumerologyNames !== "function") return;
  const inputs = normalizeNumerologyNameInputs(snapshot.numerologyNameInputs);
  let saving = false;
  const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  container.innerHTML = `<h4>計算に使うローマ字氏名</h4><p>出生時の氏名／現在の氏名を別々に入力できます。フルネームを確認したものだけ計算に使います。</p>${["subject", ...(snapshot.includeCompatibility === true ? ["partner"] : [])].map(role => {
    const person = inputs[role], selected = selectedNumerologyName(snapshot, role);
    return `<fieldset data-numerology-name-person="${role}"><legend>${role === "subject" ? "本人" : "相手"}</legend><label>使用する氏名<select data-numerology-name-kind><option value="birth" ${person.selected === "birth" ? "selected" : ""}>出生時の氏名</option><option value="current" ${person.selected === "current" ? "selected" : ""}>現在の氏名</option></select></label><label>ローマ字フルネーム<input data-numerology-name-value maxlength="256" autocomplete="off" value="${escape(person[person.selected].romanName)}" placeholder="TARO YAMADA"></label><button type="button" data-numerology-name-confirm>このローマ字氏名を確認</button><p data-numerology-name-status role="status">${selected.romanNameConfirmed ? `確認済み：${escape(selected.romanName)}` : "未確認：入力したフルネームを確認してください"}</p></fieldset>`;
  }).join("")}<p>変更後は鑑定の下書きを保存してください。フォーマットの保存とは別です。</p><button type="button" data-numerology-name-save>鑑定の下書きを保存</button><p data-numerology-name-save-status role="status"></p>`;
  container.querySelectorAll("[data-numerology-name-person]").forEach(fieldset => {
    const role = fieldset.dataset.numerologyNamePerson, input = fieldset.querySelector("[data-numerology-name-value]"), status = fieldset.querySelector("[data-numerology-name-status]");
    const update = change => {
      const result = api.updateNumerologyNames({ role, ...change });
      if (!result?.ok) { input.value = normalizeNumerologyNameInputs(api.getReadingSnapshot()?.numerologyNameInputs)[role][fieldset.querySelector("[data-numerology-name-kind]").value]?.romanName || ""; status.textContent = result?.message || "鑑定データを確認してください"; return false; }
      const selected = selectedNumerologyName(api.getReadingSnapshot(), role);
      status.textContent = selected.romanNameConfirmed ? `確認済み：${selected.romanName}（鑑定の下書きは未保存）` : "未確認：入力したフルネームを確認してください";
      onUpdate(); return true;
    };
    input.oninput = () => update({ operation: "edit", romanName: input.value });
    fieldset.querySelector("[data-numerology-name-confirm]").onclick = () => update({ operation: "confirm" });
    fieldset.querySelector("[data-numerology-name-kind]").onchange = event => {
      if (saving) { event.target.value = normalizeNumerologyNameInputs(api.getReadingSnapshot().numerologyNameInputs)[role].selected; return; }
      if (update({ operation: "select", kind: event.target.value })) mountNumerologyNameForm(container, onUpdate);
    };
  });
  container.querySelector("[data-numerology-name-save]").onclick = async event => {
    const button = event.currentTarget;
    if (saving || typeof api.saveReadingDraft !== "function") return;
    const feedback = container.querySelector("[data-numerology-name-save-status]");
    let received = false;
    const onStatus = event => {
      let state = event.detail?.state;
      if (state === "saved" && event.detail?.snapshot && JSON.stringify(api.getReadingSnapshot(event.detail.sessionId)) !== JSON.stringify(event.detail.snapshot)) state = "dirty";
      const messages = { saving: "鑑定の下書きを保存中…", saved: "鑑定の下書きを保存しました", dirty: "保存中に変更があります。もう一度保存してください", error: "保存できませんでした。再試行してください" };
      if (messages[state]) { received = true; feedback.textContent = messages[state]; }
    };
    saving = true; button.disabled = true;
    window.addEventListener("numeria-reading-draft-save-status", onStatus);
    try { await api.saveReadingDraft(); if (!received) feedback.textContent = "鑑定画面の氏名・生年月日など、必須入力を確認してください"; }
    catch { feedback.textContent = "保存できませんでした。再試行してください"; }
    finally { saving = false; button.disabled = false; window.removeEventListener("numeria-reading-draft-save-status", onStatus); }
  };
}
