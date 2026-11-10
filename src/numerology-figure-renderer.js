/** Shared exact-value renderer for screen, A4 preview and QA. */
export function renderNumerologyFigure(ui, figure) {
  const { jsx, jsxs } = ui;
  if (figure.state !== "ready") return jsx("p", { className: "nn-figure-error", role: "status", children: "図表の対象期間または入力を確認してください。" });
  const data = figure.data;
  const card = (item, index) => jsxs("div", { className: "nn-number-card", children: [jsx("span", { children: item.label }), jsx("strong", { children: item.value })] }, item.key ?? index);
  let body;
  let caption = figure.alt;
  switch (figure.kind) {
    case "numbers": case "work-roles":
      body = jsx("div", { className: "nn-number-grid", children: data.items.map(card) }); break;
    case "maturity":
      body = jsxs("div", { children: [jsx("div", { className: "nn-number-grid nn-three", children: data.items.map(card) }), jsx("p", { className: "nn-formula", children: `${data.items[0].value} ＋ ${data.items[1].value} → ${data.items[2].value}` })] });
      caption = "年・月・日から求めた本質と、選択した氏名から求めた役割を合計し、11・22・33を保持して還元。"; break;
    case "name-counts":
      body = jsxs("div", { children: [jsx("div", { className: "nn-nine", children: data.items.map(item => jsxs("div", { className: `nn-digit ${item.missing ? "nn-missing" : ""} ${item.most ? "nn-most" : ""}`, children: [jsx("strong", { children: item.value }), jsx("span", { children: `${item.count}文字` }), jsx("small", { children: item.missing ? "未出現" : item.most ? "最多" : "出現あり" })] }, item.value)) }), jsx("p", { children: data.uniform ? "1〜9が同じ回数で出現しています。" : `未出現：${data.missing.join("・") || "なし"} ／ 最多：${data.most.join("・")}${data.most.length > 1 ? "（同率）" : ""}` })] }); break;
    case "nine-years": case "cycle-position":
      body = jsx("ol", { className: "nn-time nn-nine", children: data.items.map(item => jsxs("li", { className: item.highlight ? "nn-current" : "", children: [jsx("span", { children: item.label }), jsx("strong", { children: item.value }), jsx("small", { children: item.highlight ? "基準年" : "　" })] }, item.year ?? item.value)) });
      caption = figure.kind === "nine-years" ? "各年の1月1日から翌年1月1日まで。基準年を含む前後4年です。" : `${data.referenceYear}年の周期位置。数字は周期を表します。`; break;
    case "role-map":
      body = jsxs("div", { children: [jsx("svg", { viewBox: "0 0 900 470", role: "img", "aria-label": figure.alt, className: "nn-role-map", children: data.items.map(item => jsxs("g", { transform: `translate(${item.x * 900},${item.y * 440})`, children: [jsx("circle", { cx: 0, cy: 0, r: 35 }), jsx("text", { y: 11, textAnchor: "middle", className: "nn-map-value", children: item.value }), jsx("text", { y: 62, textAnchor: "middle", className: "nn-map-label", children: item.label }), jsx("text", { y: 85, textAnchor: "middle", className: "nn-map-origin", children: item.origin })] }, item.key)) }),
        jsx("div", { className: "nn-role-map-list nn-number-grid", children: data.items.map((item, index) => jsxs("div", { children: [card(item, index), jsx("small", { children: item.origin })] }, item.key)) }),
      ] });
      caption = "生年月日・選択した氏名・計算上の役割で整理した8つのナンバーです。"; break;
    case "comparison":
      body = jsxs("div", { children: [
        data.relation && jsx("p", { className: "nn-relation-label", children: `${data.relation.relationType}${data.relation.parentDirection === "a-parent" ? "：本人が親・相手が子" : data.relation.parentDirection === "b-parent" ? "：相手が親・本人が子" : ""}` }),
        jsxs("table", { className: "nn-table", children: [jsx("thead", { children: jsx("tr", { children: ["役割", "本人", "相手", "比較"].map(title => jsx("th", { scope: "col", children: title }, title)) }) }), jsx("tbody", { children: data.items.map(item => jsxs("tr", { children: [jsx("th", { scope: "row", children: item.label }), jsx("td", { children: item.first }), jsx("td", { children: item.second }), jsx("td", { children: item.same ? "同じ数字" : "異なる数字" })] }, item.key)) })] }),
        data.optionalMissing.length > 0 && jsx("p", { children: "共通で確定した補足項目だけを比較しています。" }),
      ] }); break;
    case "pinnacles":
      body = jsx("ol", { className: "nn-time nn-four", children: data.items.map(item => jsxs("li", { children: [jsx("span", { children: `第${item.stage}期` }), jsx("strong", { children: item.value }), jsx("span", { children: `満${item.startAge}歳〜${item.endAgeExclusive === null ? "以後" : `満${item.endAgeExclusive}歳未満`}` }), jsx("small", { children: `${item.startInclusive}〜` }), jsx("small", { children: item.endExclusive ? `${item.endExclusive}未満` : "以後" })] }, item.stage)) });
      caption = "期間は開始日を含み、次の期間の開始日を含みません。第4期は終了日のない区間です。"; break;
    case "challenges":
      body = jsxs("table", { className: "nn-table", children: [jsx("thead", { children: jsx("tr", { children: ["課題", "ナンバー", "位置づけ"].map(title => jsx("th", { scope: "col", children: title }, title)) }) }), jsx("tbody", { children: data.rows.map(row => jsxs("tr", { className: row.lifelongMain ? "nn-main-challenge" : "", children: [jsx("th", { scope: "row", children: `第${row.stage}` }), jsx("td", { children: row.value }), jsx("td", { children: row.lifelongMain ? "生涯の主要課題" : "独立した課題" })] }, row.stage)) })] });
      caption = "課題数0を含む4つの値を表示しています。各課題に年齢区間は設定しません。"; break;
    case "month":
      body = jsxs("div", { className: "nn-month", children: [jsx("span", { children: data.yearMonth }), jsx("strong", { children: data.value }), jsx("span", { children: `${data.start}〜${data.end}未満` })] }); break;
    default: return jsx("p", { children: "対応する図表を確認してください。" });
  }
  return jsxs("figure", { className: `nn-figure nn-figure-${figure.kind}`, "data-figure-id": figure.figureId, "data-figure-type": figure.type,
    "data-subject-refs": figure.subjectRefs.join(" "), children: [body, jsx("figcaption", { children: caption })] });
}

export const NUMEROLOGY_FIGURE_CSS = `
.nn-figure{margin:12px 0 18px;padding:16px;border:1px solid #d9ccb2;border-radius:12px;background:#fffdf7;color:#30273e;box-sizing:border-box;break-inside:avoid;overflow-wrap:anywhere}
.nn-figure figcaption{font-size:12px;line-height:1.6;color:#65596c;margin-top:10px}.nn-number-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.nn-three{grid-template-columns:repeat(3,minmax(0,1fr))}.nn-number-card{display:flex;flex-direction:column;text-align:center;align-items:center;gap:8px;background:#fff;border:1px solid #e1d8c7;border-radius:10px;padding:12px 5px}.nn-number-card span{font-size:12px;line-height:1.6}.nn-number-card strong,.nn-time strong{font:38px/1.2 Georgia,serif;color:#59432a}.nn-formula{text-align:center;font:28px/1.4 Georgia,serif;margin:12px 0 0}.nn-nine{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px}.nn-time{padding:0;list-style:none;margin:0}.nn-time li,.nn-digit{display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;border:1px solid #e0d6c5;border-radius:8px;padding:10px 3px;background:#fff}.nn-time span,.nn-time small,.nn-digit span,.nn-digit small{font-size:12px;line-height:1.6}.nn-current{outline:2px solid #927245;background:#f8eed9!important}.nn-four{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.nn-digit strong{font:26px/1.3 Georgia,serif}.nn-most{border:2px solid #947345}.nn-missing{border-style:dashed}.nn-role-map-list{display:none}.nn-role-map{width:100%;min-height:90mm;max-height:150mm;display:block}.nn-role-map circle{fill:#f5ead2;stroke:#aa8a52;stroke-width:2}.nn-map-value{font:34px Georgia,serif;fill:#35213d}.nn-map-label{font-size:20px;fill:#35213d}.nn-map-origin{font-size:16px;fill:#6c596e}.nn-table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.6;table-layout:fixed}.nn-table th,.nn-table td{padding:9px 6px;border-bottom:1px solid #e2d9c7;text-align:left;overflow-wrap:anywhere}.nn-table th:first-child{width:32%}.nn-table thead{background:#efe6d7}.nn-table tr{break-inside:avoid}.nn-main-challenge{background:#f4e7ec}.nn-month{display:flex;flex-direction:column;align-items:center;gap:8px}.nn-month strong{font:54px/1.2 Georgia,serif}.nn-relation-label{font-weight:600}.nn-figure-error{color:#823b3b}
@media screen and (max-width:600px){.nn-number-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nn-three{grid-template-columns:repeat(3,minmax(0,1fr))}.nn-nine{grid-template-columns:repeat(3,minmax(0,1fr))}.nn-four{grid-template-columns:repeat(2,minmax(0,1fr))}.nn-role-map{display:none;min-height:0}.nn-role-map-list{display:grid}.nn-figure{padding:10px}.nn-table th,.nn-table td{padding:7px 3px;font-size:12px}}
`;
