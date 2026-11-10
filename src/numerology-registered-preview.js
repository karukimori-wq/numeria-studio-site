import { renderNumerologyFigure, NUMEROLOGY_FIGURE_CSS } from "./numerology-figure-renderer.js";
import { NumerologyA4View, NUMEROLOGY_A4_CSS, NUMEROLOGY_PAGE_TITLES } from "./numerology-a4.js";

export function numerologyRegisteredPageMessage(page) {
  if (page?.state === "plan_required") return "このページはProプランで確認できます。";
  const issue = page?.issues?.[0];
  if (issue?.reason === "NUMEROLOGY_DATE_INVALID") return "生年月日と基準日の順序・日付を確認してください。";
  if (issue?.code === "missing_family_context") return "家族ページの関係を選択してください。";
  if (issue?.code === "missing_parent_direction") return "本人と相手のどちらが親かを選択してください。";
  if (["copy_missing", "copy_ambiguous", "copy_version_mismatch", "copy_not_previewable"].includes(issue?.code)) return "登録原文の不足・重複・版を確認する必要があります。";
  if (issue?.code === "unsupported") return "このページの対象期間が対応範囲外です。";
  const labels = { lifePath: "生年月日と基準日", birthdayNumber: "生年月日と基準日", destiny: "確認済みローマ字氏名", soul: "確認済み氏名の母音", personality: "確認済み氏名の子音", maturity: "生年月日と確認済み氏名", personalYear: "生年月日と基準日", personalYearSequence: "基準年の前後4年", nameDigitCounts: "確認済みローマ字氏名", missingDigits: "確認済みローマ字氏名", mostFrequentDigits: "確認済みローマ字氏名", personalMonth: "生年月日と基準月", pinnacleNumbers: "生年月日と基準日", pinnaclePeriods: "転機の対象期間", challengeNumbers: "生年月日と基準日" };
  return labels[issue?.key] ? `${issue.who === "b" ? "相手の" : ""}${labels[issue.key]}を確認してください。` : "必要な入力・対象期間・原文を確認してください。";
}

export function numerologyRegisteredReadingInput(reading) {
  if (!reading || reading.divination !== "numerology") return null;
  return Object.fromEntries(["id", "divination", "name", "birthName", "birthday", "visitDate", "includeCompatibility", "partnerName", "partnerBirthName", "partnerBirthday", "numerologyNameInputs", "numerologyFamilyInput"].map(key => [key, reading[key] ?? null]));
}
export async function requestNumerologyRegisteredPreview({ snapshot, getCurrentSnapshot, fetcher }) {
  const input = numerologyRegisteredReadingInput(snapshot), inputKey = JSON.stringify(input);
  if (!input?.id) return { ok: false, message: "先に鑑定を下書き保存してください。" };
  const current = () => JSON.stringify(numerologyRegisteredReadingInput(getCurrentSnapshot())) === inputKey;
  try {
    const response = await fetcher("/api/numerology/page-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot: input }) });
    const data = await response.json();
    if (!current()) return { ok: false, message: "入力が変わりました。現在の入力で再確認してください。" };
    if (!response.ok || data.status !== "success") return { ok: false, message: response.status === 401 ? "ログインし直してから確認してください。" : "原文と図表を取得できませんでした。再度お試しください。" };
    const draft = data.draft;
    if (!draft || draft.sessionRef !== input.id || draft.officialAllowed !== false || draft.pages?.length !== 14 || draft.pages.some((page, index) => page.pageId !== `NUM-${String(index + 1).padStart(2, "0")}` || page.officialAllowed !== false || !["preview_ready", "unavailable", "plan_required"].includes(page.state) || page.state === "preview_ready" && (!Array.isArray(page.figures) || !Array.isArray(page.frames) || page.frames.some(frame => !Array.isArray(frame.segments) || frame.segments.some(segment => typeof segment.text !== "string"))))) return { ok: false, message: "確認用データの形式を確認できませんでした。" };
    return { ok: true, inputKey, planId: data.planId, draft };
  } catch { return { ok: false, message: "通信を確認して、もう一度お試しください。" }; }
}

export function renderNumerologyRegisteredPreview(React, ui, { api, fetcher, mountNameForm }) {
  const { jsx, jsxs } = ui;
  const [response, setResponse] = React.useState(null), [message, setMessage] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [pageId, setPageId] = React.useState("NUM-01"), [mode, setMode] = React.useState("reading"), [layout, setLayout] = React.useState("standard"), [, refresh] = React.useState(0);
  const sequence = React.useRef(0), nameHost = React.useRef(null), pending = React.useRef(false);
  const snapshot = api?.getReadingSnapshot?.(), input = numerologyRegisteredReadingInput(snapshot), inputKey = JSON.stringify(input);
  const draft = response?.inputKey === inputKey ? response.draft : null, page = draft?.pages.find(item => item.pageId === pageId);
  React.useEffect(() => {
    sequence.current++; pending.current = false; setBusy(false); setResponse(null); setMessage("");
  }, [inputKey]);
  React.useEffect(() => {
    if (nameHost.current) mountNameForm(nameHost.current, () => refresh(value => value + 1));
  }, [snapshot?.id, snapshot?.includeCompatibility, snapshot?.name, snapshot?.birthday, snapshot?.partnerName, snapshot?.partnerBirthday]);
  React.useEffect(() => {
    const changed = () => refresh(value => value + 1);
    window.addEventListener("numeria-reading-draft-save-status", changed);
    return () => { sequence.current++; window.removeEventListener("numeria-reading-draft-save-status", changed); };
  }, []);
  const load = async () => {
    if (pending.current) return;
    api.updateNumerologyRegisteredPages?.({ enabled: true });
    const id = ++sequence.current; pending.current = true; setBusy(true); setMessage("原文と図表を確認しています…");
    const result = await requestNumerologyRegisteredPreview({ snapshot: api.getReadingSnapshot(), getCurrentSnapshot: () => api.getReadingSnapshot(), fetcher });
    if (sequence.current !== id) return;
    pending.current = false; setBusy(false); setResponse(result.ok ? result : null); setMessage(result.ok ? "確認用草案です。選んだ原文IDと版は、鑑定の下書き保存で保持します。" : result.message);
  };
  const family = snapshot?.numerologyFamilyInput || {};
  const changeFamily = change => { api.updateNumerologyRegisteredPages?.({ family: { ...family, ...change } }); refresh(value => value + 1); };
  const label = page => `${page.pageId} · ${page.title || NUMEROLOGY_PAGE_TITLES[Number(page.pageId.slice(4)) - 1]}`;
  return jsxs("section", { className: "numeria-registered-preview", children: [
    jsx("style", { children: NUMEROLOGY_FIGURE_CSS + NUMEROLOGY_A4_CSS + ".numeria-registered-preview{min-width:0;padding:18px;border:1px solid #d4c6af;border-radius:12px}.numeria-registered-preview select{max-width:100%}.numeria-registered-preview .nn-a4-root{min-width:0}.numeria-registered-preview .registered-source{font-size:11px;overflow-wrap:anywhere}" }),
    jsx("h3", { children: "登録原文・図表・A4の確認" }),
    jsx("p", { children: "作成済みの登録原文を計算結果から選びます。本文は未承認の草案で、正式発行には使用できません。" }),
    jsx("div", { ref: nameHost }),
    jsxs("label", { children: ["家族ページの関係", jsx("select", { value: family.context || "", disabled: snapshot?.includeCompatibility !== true, onChange: event => changeFamily({ context: event.target.value, parentDirection: "" }), children: [["", "未指定"], ["parent-child", "親子"], ["partners", "夫婦・パートナー"], ["other-family", "その他の家族"]].map(([value, text]) => jsx("option", { value, children: text }, value)) })] }),
    family.context === "parent-child" && jsxs("label", { children: ["親子の向き", jsx("select", { value: family.parentDirection || "", onChange: event => changeFamily({ parentDirection: event.target.value }), children: [["", "未指定"], ["a-parent", "本人が親"], ["b-parent", "相手が親"]].map(([value, text]) => jsx("option", { value, children: text }, value)) })] }),
    jsx("button", { type: "button", disabled: busy, onClick: load, children: busy ? "確認中…" : "現在の入力で原文・図表を確認" }), jsx("p", { role: "status", children: message }),
    draft && jsxs("div", { children: [
      jsx("select", { "aria-label": "確認する固定ページ", value: pageId, onChange: event => setPageId(event.target.value), children: draft.pages.map(item => jsx("option", { value: item.pageId, children: label(item) }, item.pageId)) }),
      jsx("select", { "aria-label": "確認表示", value: mode, onChange: event => setMode(event.target.value), children: [jsx("option", { value: "reading", children: "原文・図表" }, "reading"), jsx("option", { value: "a4", children: "A4草案" }, "a4")] }),
      jsx("select", { "aria-label": "レイアウト", value: response.planId === "pro" ? layout : "standard", onChange: event => setLayout(event.target.value), children: [jsx("option", { value: "standard", children: "スタンダード" }, "standard"), response.planId === "pro" && jsx("option", { value: "magazine", children: "マガジン" }, "magazine")] }),
      page?.state !== "preview_ready" ? jsx("p", { role: "status", children: numerologyRegisteredPageMessage(page) })
        : mode === "a4" ? jsx(NumerologyA4View, { React, ui, renderFigure: renderNumerologyFigure, draft, pageIds: [pageId], layout: response.planId === "pro" ? layout : "standard" })
          : jsxs("article", { children: [(page.figures || []).map(figure => jsx("div", { children: renderNumerologyFigure(ui, figure) }, figure.figureId)), ...page.frames.map(frame => jsxs("section", { children: frame.segments.map((segment, index) => jsxs("div", { children: [jsx("p", { children: segment.text }), jsx("small", { className: "registered-source", children: `${segment.copyId} · ${segment.copyVersion}` })] }, `${segment.copyId}:${index}`)) }, frame.frameId))] }),
    ] }),
  ] });
}
