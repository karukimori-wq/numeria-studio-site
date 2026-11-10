export const NUMEROLOGY_A4_VERSION = "ns.num.a4-draft.2026-10-22.1";
export function NumerologyA4View({ React, ui, renderFigure, ...props }) {
  return renderNumerologyA4(React, ui, renderFigure, props);
}
export const NUMEROLOGY_PAGE_TITLES = ["8つのコアナンバー", "本質・才能・社会での役割", "内面・成長・今年の流れ", "数字のつながりと9年サイクル", "他のナンバーとの相関図", "あなたの9年サイクル", "数秘マップ", "ふたりの数秘・相性鑑定", "恋愛・結婚の傾向", "仕事・適職・才能", "金運・お金との向き合い方", "家族・親子の数秘", "人生の重要な転機", "今月のテーマ"];
const FRAME_NAMES = { lifePath: "人生の道・本質", birthdayNumber: "生まれ日の才能", attitude: "姿勢・第一印象", destiny: "社会での役割", soul: "内面の願い", personality: "人から見える姿", maturity: "成熟後のテーマ", personalYear: "今年の流れ", inner: "内面", growth: "成長", "this-year": "今年の流れ", connections: "数字のつながり", cycle: "周期上の位置", "name-digits": "氏名に含まれる数字", map: "数秘マップの読み方", comparison: "ふたりの組合せ", dialogue: "関わり方のポイント", values: "お金への価値観", "use-and-caution": "活用と注意点", "person-a": "本人の傾向", "person-b": "相手の傾向", family: "関わりのヒント", pinnacles: "ピナクルの転機", challenges: "チャレンジと課題", "month-reading": "今月の数", "month-theme": "今月のテーマ" };

export function numerologyA4Units(page, draft) {
  const figures = (page.figures || []).map(figure => ({ id: figure.figureId, kind: "figure", figure }));
  const text = page.frames.flatMap(frame => frame.segments.map((segment,index)=>({...segment,sourceIndex:index})).filter(segment=>segment.text.trim()).map((segment, index) => {
    const period = segment.periodRef;
    const bindings = segment.resultBindings.filter(binding => typeof binding.value === "number");
    const labels = bindings.map(binding => `${binding.subjectRef === draft.subjects.a.subjectRef ? "本人" : "相手"}・${FRAME_NAMES[binding.valueResultRef.slice(4)] ?? "ナンバー"}${binding.value}`);
    let annotation = [...new Set(labels)].join(" ／ ");
    if (period?.kind === "calendar-year") annotation = `${period.year}年${annotation ? " ／ " + annotation : ""}`;
    if (period?.kind === "calendar-month") annotation = `${period.yearMonth}${annotation ? " ／ " + annotation : ""}`;
    if (period?.kind === "pinnacle") annotation = `第${period.stage}期：${period.startInclusive}〜${period.endExclusive ?? "以後"}`;
    if (frame.frameId === "challenges" && segment.sourceIndex > 0) annotation = `第${segment.sourceIndex}課題${segment.sourceIndex === 3 ? "（生涯の主要課題）" : ""}`;
    return { id: `${page.pageId}:${frame.frameId}:${segment.sourceIndex}`, kind: "text", frameId: frame.frameId,
      first: index === 0, title: FRAME_NAMES[frame.frameId] ?? `${frame.labels[0]?.year ?? ""}年のテーマ`,
      annotation, text: segment.text, copyId: segment.copyId, copyVersion: segment.copyVersion };
  }));
  if(page.independentComment?.enabled && page.independentComment.text?.trim())text.push({id:`${page.pageId}:comment`,kind:"text",frameId:"comment",first:true,title:"独自コメント",annotation:"",text:page.independentComment.text});
  return { figures, text };
}

/** Heights come from the browser after fonts load, never character estimates. */
export function planNumerologyA4(units, measurements, contentHeight, layout) {
  const pages = [], errors = [];
  const columns = layout === "magazine" ? 2 : 1;
  let current, column = 0;
  const fresh = count => { current = { figures: [], columns: Array.from({ length: count }, () => []), used: Array(count).fill(0), reserved: 0 }; column = 0; pages.push(current); };
  const empty = page => page.figures.length === 0 && page.columns.every(items => items.length === 0);
  const height = (unit, mode) => {
    const h = measurements[unit.id]?.[mode];
    if (!Number.isFinite(h) || h <= 0) { errors.push({ code: "MEASUREMENT_REQUIRED", unitId: unit.id }); return null; }
    return h;
  };
  fresh(columns);
  for (const unit of units.figures) {
    const h = height(unit, "full");
    if (h === null) continue;
    if (unit.figure.state !== "ready" || h > contentHeight) { errors.push({ code: "FIGURE_CANNOT_FIT", unitId: unit.id }); continue; }
    if (current.reserved + h > contentHeight) fresh(columns);
    current.figures.push(unit); current.reserved += h;
  }
  for (const unit of units.text) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const continued = !unit.first && current.columns[column].length === 0;
      const placedUnit = continued ? { ...unit, first: true, continued: true } : unit;
      const h = height(unit, continued ? "column-heading" : "column");
      if (h === null) break;
      if (h > contentHeight) {
        const full = height(unit, continued ? "full-heading" : "full");
        if (full === null || full > contentHeight) { errors.push({ code: "TEXT_CANNOT_FIT", unitId: unit.id }); break; }
        if (empty(current)) pages.pop();
        fresh(1); current.columns[0].push(placedUnit); current.used[0] = full; fresh(columns); break;
      }
      if (current.reserved + current.used[column] + h <= contentHeight) {
        current.columns[column].push(placedUnit); current.used[column] += h; break;
      }
      if (column + 1 < current.columns.length) column++; else fresh(columns);
    }
  }
  return { version: NUMEROLOGY_A4_VERSION, layout, errors,
    pages: errors.length ? [] : pages.filter(page => !empty(page)) };
}

export function renderNumerologyA4(React, ui, renderFigure, { draft, pageIds, layout = "standard" }) {
  const { jsx, jsxs } = ui;
  const root = React.useRef(null);
  const [plans, setPlans] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const selected = draft.pages.filter(page => pageIds.includes(page.pageId));
  const key = JSON.stringify([draft, pageIds, layout]);
  const pageUnits = selected.map(page => ({ page, units: numerologyA4Units(page, draft) }));
  const title = page => page.title || NUMEROLOGY_PAGE_TITLES[Number(page.pageId.slice(4)) - 1];
  const textUnit = unit => jsxs("div", { className: "nn-text-unit", "data-unit-id": unit.id, "data-copy-id": unit.copyId, children: [
    unit.first && jsx("h4", { children: unit.title + (unit.continued ? "（続き）" : "") }),
    unit.annotation && jsx("p", { className: "nn-annotation", children: unit.annotation }), jsx("p", { children: unit.text }),
  ] }, unit.id);
  const figureUnit = unit => jsx("div", { className: "nn-figure-block", "data-unit-id": unit.id, children: renderFigure(ui, unit.figure) }, unit.id);
  const header = page => jsxs("header", { className: "nn-a4-header", children: [jsx("small", { children: "NUMERIA STUDIO  /  確認用草案" }), jsx("h3", { children: title(page) })] });
  React.useEffect(() => {
    let active = true, observer;
    setPlans(null);
    const measure = async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!active || !root.current) return;
      const results = [];
      for (const { page, units } of pageUnits) {
        if (page.state !== "preview_ready" || page.figures.some(figure => figure.state !== "ready")) {
          results.push({ page, pages: [], errors: [{ code: "PAGE_UNAVAILABLE" }] }); continue;
        }
        const stage = root.current.querySelector(`[data-measure-page="${page.pageId}"]`);
        const measurements = {};
        stage.querySelectorAll("[data-measure-mode] [data-unit-id]").forEach(node => {
          const mode = node.closest("[data-measure-mode]").dataset.measureMode;
          measurements[node.dataset.unitId] ??= {};
          measurements[node.dataset.unitId][mode] = node.getBoundingClientRect().height;
        });
        const plan = planNumerologyA4(units, measurements, stage.querySelector(".nn-a4-content").getBoundingClientRect().height, layout);
        results.push({ page, ...plan });
      }
      if (active) setPlans({ key, results });
    };
    measure();
    if (root.current) {
      observer = new ResizeObserver(entries => setScale(Math.min(1, Math.max(.2, entries[0].contentRect.width / (210 * 96 / 25.4)))));
      observer.observe(root.current);
    }
    return () => { active = false; observer?.disconnect(); };
  }, [key]);
  const ready = plans?.key === key ? plans.results : null;
  let physical = 0;
  const total = ready?.reduce((sum, result) => sum + result.pages.length, 0) ?? 0;
  return jsxs("div", { ref: root, className: `nn-a4-root nn-layout-${layout}`, "data-a4-state": ready ? ready.some(result => result.errors.length) ? "error" : "ready" : "measuring", children: [
    jsx("div", { className: "nn-a4-measure", "aria-hidden": "true", children: pageUnits.map(({ page, units }) => jsxs("div", { className: "nn-a4-sheet", "data-measure-page": page.pageId, children: [header(page), jsxs("div", { className: "nn-a4-content", children: [
      jsx("div", { "data-measure-mode": "full", children: units.figures.map(figureUnit) }),
      jsx("div", { className: "nn-measure-columns", "data-measure-mode": "column", children: units.text.map(textUnit) }),
      jsx("div", { "data-measure-mode": "full", children: units.text.map(textUnit) }),
      jsx("div", { className: "nn-measure-columns", "data-measure-mode": "column-heading", children: units.text.map(unit => textUnit({ ...unit, first: true, continued: true })) }),
      jsx("div", { "data-measure-mode": "full-heading", children: units.text.map(unit => textUnit({ ...unit, first: true, continued: true })) }),
    ] }), jsx("footer", { className: "nn-a4-footer", children: "確認用草案" })] }, page.pageId)) }),
    !ready && jsx("p", { role: "status", children: "A4プレビューを組み立てています…" }),
    ready?.map(result => result.errors.length ? jsx("p", { role: "alert", children: `${title(result.page)}：入力または用紙に収まる分量を確認してください。` }, result.page.pageId) : result.pages.map((physicalPage, index) => {
      physical++;
      return jsx("div", { className: "nn-a4-page-wrap", style: { width: `${210 * 96 / 25.4 * scale}px`, height: `${297 * 96 / 25.4 * scale}px` }, children: jsxs("article", { className: "nn-a4-sheet nn-a4-physical", "data-logical-page": result.page.pageId,
        style: { transform: `scale(${scale})` }, children: [header(result.page), jsxs("div", { className: "nn-a4-content", children: [
          physicalPage.figures.map(figureUnit),
          jsx("div", { className: "nn-a4-columns", style: { gridTemplateColumns: `repeat(${physicalPage.columns.length},minmax(0,1fr))` }, children: physicalPage.columns.map((column, columnIndex) => jsx("div", { className: "nn-a4-column", children: column.map(textUnit) }, columnIndex)) }),
        ] }), jsxs("footer", { className: "nn-a4-footer", children: [jsx("span", { children: draft.exampleOnly ? "架空データ・確認用草案" : "確認用草案・正式発行不可" }), jsx("span", { children: `${physical} / ${total}${index ? "・続き" : ""}` })] })] }) }, `${result.page.pageId}-${index}`);
    })),
  ] });
}

export const NUMEROLOGY_A4_CSS = `
.nn-text-unit p{white-space:pre-wrap}
.nn-a4-root{width:100%;min-width:0}.nn-a4-measure{position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none}.nn-a4-sheet{width:210mm;height:297mm;padding:14mm 16mm;box-sizing:border-box;background:#fffdf9;color:#30273e;font-family:"Noto Sans JP",sans-serif;display:grid;grid-template-rows:17mm 235mm 7mm;gap:5mm;font-size:14px;line-height:1.75;overflow:visible}.nn-a4-header{border-bottom:1px solid #b39a72}.nn-a4-header small{font-size:10px;letter-spacing:.13em;color:#806b50}.nn-a4-header h3{font-size:23px;line-height:1.5;margin:4px 0 0;font-weight:500}.nn-a4-content{min-height:0;display:flex;flex-direction:column}.nn-a4-footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #d4c6af;font-size:11px;line-height:1.6;color:#726276}.nn-a4-columns{display:grid;gap:6mm;min-height:0;align-items:start}.nn-text-unit{display:flow-root;padding-bottom:8px;box-sizing:border-box;overflow-wrap:anywhere}.nn-text-unit h4{font-size:15px;line-height:1.6;margin:12px 0 6px;color:#645035;border-left:3px solid #b39358;padding-left:9px}.nn-text-unit p{font-size:14px;line-height:1.75;margin:0 0 8px}.nn-text-unit .nn-annotation{font-size:11px;line-height:1.7;color:#77627d;margin-bottom:5px}.nn-figure-block{display:flow-root;flex-shrink:0}.nn-a4-page-wrap{position:relative;margin:18px auto 24px;box-shadow:0 5px 22px #30273e20}.nn-a4-physical{transform-origin:top left}.nn-a4-sheet .nn-figure{padding:16px;margin:0 0 16px;border-radius:10px}.nn-a4-sheet .nn-number-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.nn-a4-sheet .nn-three{grid-template-columns:repeat(3,minmax(0,1fr))}.nn-a4-sheet .nn-nine{grid-template-columns:repeat(9,minmax(0,1fr))}.nn-a4-sheet .nn-four{grid-template-columns:repeat(4,minmax(0,1fr))}.nn-a4-sheet .nn-figure[data-figure-type="FIG-RELATION"]{min-height:50mm}.nn-a4-sheet .nn-figure[data-figure-type="FIG-TIME"]{min-height:40mm}.nn-a4-sheet .nn-table th,.nn-a4-sheet .nn-table td{padding:9px 6px;font-size:13px}.nn-a4-sheet .nn-role-map{display:block;min-height:90mm}.nn-a4-sheet .nn-role-map-list{display:none}.nn-layout-magazine .nn-measure-columns .nn-text-unit{width:calc((100% - 6mm)/2)}
@media print{@page{size:A4;margin:0}.nn-a4-measure{display:none!important}.nn-a4-page-wrap{width:210mm!important;height:297mm!important;margin:0;box-shadow:none;break-after:page}.nn-a4-page-wrap:last-child{break-after:auto}.nn-a4-physical{transform:none!important}.nn-a4-root{width:210mm}.nn-a4-sheet{-webkit-print-color-adjust:exact;print-color-adjust:exact}.nn-a4-controls{display:none!important}}
`;
