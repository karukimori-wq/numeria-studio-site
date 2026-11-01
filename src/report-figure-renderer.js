import { REPORT_FIGURE_TYPES } from "./report-figure-types.js";

export const figureEscape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const textValue = value => typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const listOf = (value, predicate) => Array.isArray(value) && value.every(predicate);
const finite = value => typeof value === "number" && Number.isFinite(value);
const normalized = value => finite(value) && value >= 0 && value <= 1;
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const cardValid = card => card && nonempty(card.positionId) && nonempty(card.cardId) && nonempty(card.name) && ["upright", "reversed"].includes(card.orientation);
const unique = (items, key) => new Set(items.map(item => item[key])).size === items.length;
const positioned = item => item && normalized(item.x) && normalized(item.y);

const figureDataChecks = {
  "FIG-RESULT": d => listOf(d.items, i => i && nonempty(i.key) && nonempty(i.label) && textValue(i.value)) && d.items.length > 0,
  "FIG-RELATION": d => listOf(d.nodes, i => i && nonempty(i.id) && textValue(i.value)) && d.nodes.length > 0 && unique(d.nodes, "id") && listOf(d.edges, e => e && d.nodes.some(n => n.id === e.from) && d.nodes.some(n => n.id === e.to) && nonempty(e.kind)),
  "FIG-TIME": d => listOf(d.items, i => i && nonempty(i.id) && nonempty(i.label) && textValue(i.value) && nonempty(i.start) && nonempty(i.end) && Number.isFinite(Date.parse(i.start)) && Date.parse(i.end) > Date.parse(i.start)) && d.items.length > 0,
  "FIG-MAP": d => d.coordinateSystem === "normalized" && listOf(d.items, i => positioned(i) && nonempty(i.key) && textValue(i.value)) && d.items.length > 0 && unique(d.items, "key") && listOf(d.edges, e => e && d.items.some(n => n.key === e.from) && d.items.some(n => n.key === e.to)),
  "FIG-CARDS": d => listOf(d.cards, cardValid) && d.cards.length > 0 && unique(d.cards, "cardId") && unique(d.cards, "positionId"),
  "FIG-SPREAD": d => nonempty(d.spreadId) && nonempty(d.spreadVersion) && d.coordinateSystem === "normalized" && listOf(d.positions, i => cardValid(i) && positioned(i) && finite(i.rotationDegrees)) && d.positions.length > 0 && unique(d.positions, "cardId") && unique(d.positions, "positionId"),
  "FIG-TABLE": d => listOf(d.columns, c => c && nonempty(c.key) && nonempty(c.label)) && d.columns.length > 0 && unique(d.columns, "key") && listOf(d.rows, row => row && d.columns.every(c => row[c.key] == null || textValue(row[c.key]))),
  "FIG-BALANCE": d => finite(d.denominator) && d.denominator > 0 && nonempty(d.unit) && listOf(d.items, i => i && nonempty(i.label) && finite(i.value) && i.value >= 0) && d.items.length > 0 && Math.abs(d.items.reduce((sum, i) => sum + i.value, 0) - d.denominator) < 1e-6,
  "FIG-ASTRO": d => nonempty(d.coverage) && listOf(d.planets, p => p && nonempty(p.body) && finite(p.longitude) && p.longitude >= 0 && p.longitude < 360) && d.planets.length > 0 && unique(d.planets, "body"),
  "FIG-ZIW": d => nonempty(d.coverage) && listOf(d.palaces, p => p && nonempty(p.label) && nonempty(p.branch) && listOf(p.majorStars, nonempty)) && d.palaces.length === 12 && unique(d.palaces, "branch") && unique(d.palaces, "label"),
  "FIG-DIRECTION": d => listOf(d.cells, c => c && [...directions, "center"].includes(c.direction) && Number.isInteger(c.star) && c.star >= 1 && c.star <= 9) && d.cells.length === 9 && unique(d.cells, "direction") && unique(d.cells, "star") && listOf(d.badDirections, b => b && directions.includes(b.direction) && listOf(b.reasons, nonempty)),
  "FIG-GEO": d => d.mode === "manual-direction" && directions.includes(d.direction) && d.showGeographicalMap === false && d.latitude == null && d.longitude == null && d.distance == null && nonempty(d.originLabel) && nonempty(d.destinationLabel) && d.assessment && nonempty(d.assessment.year) && nonempty(d.assessment.month),
};

export function validateReportFigure(figure, { allowExample = false } = {}) {
  if (!figure || figure.schemaVersion !== "ns.figure.v1" || !Object.hasOwn(REPORT_FIGURE_TYPES, figure.type)) return { ok: false, code: "FIGURE_CONTRACT_INVALID" };
  if (typeof figureDataChecks[figure.type] !== "function" || typeof figureRenderers[figure.type] !== "function") return { ok: false, code: "FIGURE_RENDERER_UNCONNECTED" };
  if (figure.exampleOnly === true && !allowExample) return { ok: false, code: "FIGURE_SAMPLE_FORBIDDEN" };
  if (figure.exampleOnly !== undefined && typeof figure.exampleOnly !== "boolean") return { ok: false, code: "FIGURE_SAMPLE_FLAG_INVALID" };
  if (!listOf(figure.subjectRefs, nonempty) || !figure.subjectRefs.length || !nonempty(figure.resultRevision) || !nonempty(figure.calculationVersion) || !nonempty(figure.alt)) return { ok: false, code: "FIGURE_PROVENANCE_REQUIRED" };
  if (!["ready", "empty", "missing_input", "unsupported", "error"].includes(figure.state)) return { ok: false, code: "FIGURE_STATE_INVALID" };
  if (figure.state === "error" && (!nonempty(figure.error?.code) || !nonempty(figure.error?.message))) return { ok: false, code: "FIGURE_ERROR_INVALID" };
  if (figure.state === "ready" && (!figure.data || !figureDataChecks[figure.type](figure.data))) return { ok: false, code: "FIGURE_DATA_INVALID" };
  // The approved JSON only defines partial examples for these two modes.
  // Do not invent a full-chart schema or promote a renamed sample to production.
  if (!allowExample && figure.state === "ready" && ["FIG-ASTRO", "FIG-ZIW"].includes(figure.type)) return { ok: false, code: "FULL_CHART_CONTRACT_UNCONNECTED" };
  if (figure.state === "ready" && figure.data.legend !== undefined && !listOf(figure.data.legend, item => item && nonempty(item.kind) && nonempty(item.label))) return { ok: false, code: "FIGURE_LEGEND_INVALID" };
  if (figure.state === "ready" && figure.type === "FIG-GEO" && figure.data.assessment.yearReasons !== undefined && !listOf(figure.data.assessment.yearReasons, nonempty)) return { ok: false, code: "FIGURE_DATA_INVALID" };
  if (figure.state === "empty" && !["FIG-RELATION", "FIG-TIME", "FIG-TABLE", "FIG-DIRECTION", "FIG-GEO"].includes(figure.type)) return { ok: false, code: "FIGURE_EMPTY_FORBIDDEN" };
  return { ok: true };
}

const svgText = (x, y, text, size = 13) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${figureEscape(text)}</text>`;
const svgLine = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1.5"/>`;
const dot = (x, y, label, value) => `<circle cx="${x}" cy="${y}" r="27" fill="white" stroke="currentColor"/>${svgText(x, y + 5, value, 18)}${svgText(x, y + 48, label, 11)}`;
const svgWrap = content => `<svg viewBox="0 0 640 500" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;max-height:210mm" aria-hidden="true">${content}</svg>`;
const listMarkup = entries => `<ul>${entries.map(entry => `<li>${figureEscape(entry)}</li>`).join("")}</ul>`;
const cardMarkup = card => `<div class="nf-card"><span>${figureEscape(card.positionId)}</span><strong>${figureEscape(card.name)}</strong><span>${card.orientation === "reversed" ? "逆位置 ↓" : "正位置 ↑"}</span></div>`;

const figureRenderers = {
  "FIG-RESULT": d => `<dl class="nf-results">${d.items.map(i => `<div><dt>${figureEscape(i.label)}</dt><dd>${figureEscape(i.value)} <small>${figureEscape(i.unit)}</small></dd></div>`).join("")}</dl>`,
  "FIG-RELATION": d => {
    const point = id => { const index = d.nodes.findIndex(n => n.id === id), angle = 2 * Math.PI * index / d.nodes.length - Math.PI / 2; return [320 + 180 * Math.cos(angle), 225 + 160 * Math.sin(angle)]; };
    return svgWrap(d.edges.map(e => svgLine(...point(e.from), ...point(e.to))).join("") + d.nodes.map(n => dot(...point(n.id), n.id, n.value)).join("")) + listMarkup(d.edges.map(e => `${e.from} → ${e.to} (${e.kind})`)) + listMarkup((d.legend || []).map(l => `${l.kind}: ${l.label}`));
  },
  "FIG-TIME": d => `<ol class="nf-timeline">${d.items.map(i => `<li${i.highlight ? ' class="nf-current"' : ""}><strong>${figureEscape(i.label)}：${figureEscape(i.value)}</strong>${i.highlight ? "（基準期間）" : ""}<small>${figureEscape(i.start)} ～ ${figureEscape(i.end)}（終了を含まない）</small></li>`).join("")}</ol><p>${figureEscape(d.unit)} / ${figureEscape(d.timeZone)}</p>`,
  "FIG-MAP": d => svgWrap(d.edges.map(e => { const a = d.items.find(i => i.key === e.from), b = d.items.find(i => i.key === e.to); return svgLine(60 + a.x * 520, 50 + a.y * 360, 60 + b.x * 520, 50 + b.y * 360); }).join("") + d.items.map(i => dot(60 + i.x * 520, 50 + i.y * 360, i.label || i.key, i.value)).join("")) + `<p>${figureEscape(d.tradition)}</p>`,
  "FIG-CARDS": d => `<div class="nf-cards">${d.cards.map(cardMarkup).join("")}</div><p>カード画像：${figureEscape(d.assetState || "素材未接続")}</p>`,
  "FIG-SPREAD": d => svgWrap(d.positions.map(p => `<g transform="translate(${60 + p.x * 520},${60 + p.y * 350}) rotate(${p.rotationDegrees})"><rect x="-45" y="-65" width="90" height="130" rx="7" fill="white" stroke="currentColor"/>${svgText(0, -35, p.positionId, 10)}${svgText(0, 0, p.name, 11)}${svgText(0, 35, p.orientation === "reversed" ? "逆位置 ↓" : "正位置 ↑", 12)}</g>`).join("")) + listMarkup(d.positions.map(p => `${p.positionId}: ${p.name}（${p.orientation === "reversed" ? "逆位置" : "正位置"}）`)),
  "FIG-TABLE": d => `<table><thead><tr>${d.columns.map(c => `<th scope="col">${figureEscape(c.label)}</th>`).join("")}</tr></thead><tbody>${d.rows.map(row => `<tr>${d.columns.map(c => `<td>${figureEscape(row[c.key] ?? "未算出")}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
  "FIG-BALANCE": d => `<p>母数 ${figureEscape(d.denominator)} ${figureEscape(d.unit)} / ${figureEscape(d.measure)}</p><dl>${d.items.map(i => `<div><dt>${figureEscape(i.label)}</dt><dd><meter min="0" max="${d.denominator}" value="${i.value}"></meter> ${i.value} ${figureEscape(d.unit)}</dd></div>`).join("")}</dl>`,
  "FIG-ASTRO": d => {
    const pos = (angle, radius = 180) => [320 + radius * Math.cos((angle - 90) * Math.PI / 180), 245 + radius * Math.sin((angle - 90) * Math.PI / 180)];
    return `<p>カバレッジ：${figureEscape(d.coverage)} / ${figureEscape(d.instant)}</p>` + svgWrap(`<circle cx="320" cy="245" r="190" fill="none" stroke="currentColor"/>` + Array.from({ length: 12 }, (_, i) => svgLine(...pos(i * 30, 155), ...pos(i * 30, 190)) + svgText(...pos(i * 30 + 15, 215), `${i * 30}°`, 11)).join("") + d.planets.map((p, i) => { const [x, y] = pos(p.longitude, 130 + (i % 2) * 25); return `<circle cx="${x}" cy="${y}" r="4" fill="currentColor"/>${svgText(x, y - 10, p.body, 10)}`; }).join("")) + listMarkup(d.planets.map(p => `${p.body}: ${p.longitude}°`)) + `<p>ハウス：${d.houses == null ? "未算出" : figureEscape(JSON.stringify(d.houses))} / 軸：${d.axes == null ? "未算出" : figureEscape(JSON.stringify(d.axes))}</p>`;
  },
  "FIG-ZIW": d => {
    const positions = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];
    return `<p>カバレッジ：${figureEscape(d.coverage)}</p>` + svgWrap(d.palaces.map((p, i) => { const [x, y] = positions[i].map(v => v * 120); return `<g transform="translate(${80 + x},${10 + y})"><rect width="120" height="120" fill="white" stroke="currentColor"/>${svgText(60, 23, `${p.label} ${p.branch}`, 12)}${p.majorStars.length ? p.majorStars.map((s, j) => svgText(60, 48 + j * 18, s, 12)).join("") : svgText(60, 65, "主星なし", 12)}</g>`; }).join(""));
  },
  "FIG-DIRECTION": d => {
    const positions = { NW: [0, 0], N: [1, 0], NE: [2, 0], W: [0, 1], center: [1, 1], E: [2, 1], SW: [0, 2], S: [1, 2], SE: [2, 2] };
    return `<p>北 N ↑ / ${figureEscape(d.periodKind)} / ${figureEscape(d.start)} ～ ${figureEscape(d.end ?? "終了未算出")}</p>` + svgWrap(d.cells.map(c => { const [x, y] = positions[c.direction].map(v => v * 140); return `<g transform="translate(${110 + x},${30 + y})"><rect width="140" height="140" fill="white" stroke="currentColor"/>${svgText(70, 30, c.direction)}${svgText(70, 85, c.star, 28)}</g>`; }).join("")) + listMarkup(d.badDirections.map(b => `${b.direction}: ${b.reasons.join("、")}`));
  },
  "FIG-GEO": d => `<p>指定方位の確認図（手動指定）</p>` + svgWrap(`<circle cx="320" cy="245" r="150" fill="none" stroke="currentColor"/>${directions.map((direction, i) => { const angle = (i * 45 - 90) * Math.PI / 180, x = 320 + 175 * Math.cos(angle), y = 245 + 175 * Math.sin(angle); return svgText(x, y, direction, 16) + (direction === d.direction ? svgLine(320, 245, 320 + 145 * Math.cos(angle), 245 + 145 * Math.sin(angle)) : ""); }).join("")}${svgText(320, 250, "出発地", 14)}`) + `<p>${figureEscape(d.originLabel)} → ${figureEscape(d.destinationLabel)}：${figureEscape(d.direction)}</p><p>年盤：${figureEscape(d.assessment.year)} / 月盤：${figureEscape(d.assessment.month)}</p>` + listMarkup(d.assessment.yearReasons || []) + `<p>座標・距離は使用しません。</p>`,
};

export const REPORT_FIGURE_CSS = `.ns-figure{color:var(--figure-ink,#44304f);background:white;padding:12px;margin:12px 0;max-width:100%;overflow-wrap:anywhere;font:14px/1.6 system-ui}.ns-figure svg{color:inherit}.ns-figure figcaption{font-weight:700}.ns-figure table{border-collapse:collapse;width:100%}.ns-figure th,.ns-figure td{border:1px solid #aaa;padding:6px}.ns-figure thead{display:table-header-group}.ns-figure tr,.nf-card,.nf-results>div,.nf-timeline>li{break-inside:avoid}.ns-figure small{display:block}.nf-results,.nf-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:12px}.nf-results>div,.nf-card{border:1px solid currentColor;border-radius:8px;padding:12px;text-align:center}.nf-card{display:grid;min-height:130px;align-content:center;gap:10px}.nf-results dd{margin:0;font-size:24px}.nf-current{font-weight:bold;border-left:4px solid currentColor}.nf-sample{border:2px dashed currentColor;padding:4px}.ns-figure[data-figure-type='FIG-MAP'],.ns-figure[data-figure-type='FIG-SPREAD'],.ns-figure[data-figure-type='FIG-ASTRO'],.ns-figure[data-figure-type='FIG-ZIW']{break-inside:avoid;grid-column:1/-1}`;

export function renderReportFigure(figure, options = {}) {
  const validation = validateReportFigure(figure, options);
  if (!validation.ok) return `<p class="ns-figure-status" role="status">図表を表示できません（${figureEscape(validation.code)}）</p>`;
  const label = REPORT_FIGURE_TYPES[figure.type];
  const statusCopy = { empty: "計算済み・該当なし", missing_input: "必要な入力が不足しています", unsupported: "未対応です", error: "図表の計算に失敗しました" };
  let content;
  try { content = figure.state === "ready" ? figureRenderers[figure.type](figure.data) : `<p role="status">${statusCopy[figure.state]}</p>`; }
  catch { return '<p class="ns-figure-status" role="status">図表データの形式を確認してください（FIGURE_DATA_INVALID）</p>'; }
  return `<figure class="ns-figure" data-figure-type="${figure.type}" data-figure-state="${figure.state}" aria-label="${figureEscape(figure.alt)}"><figcaption>${figureEscape(label)}</figcaption>${figure.exampleOnly ? '<p class="nf-sample">サンプル・正式鑑定書には使用できません</p>' : ""}<p>${figureEscape(figure.alt)}</p>${content}</figure>`;
}
