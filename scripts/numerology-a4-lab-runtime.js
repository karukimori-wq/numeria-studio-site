import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ui from 'react/jsx-runtime';
import { NumerologyA4View, NUMEROLOGY_A4_CSS } from '../../src/numerology-a4.js';
import { renderNumerologyFigure, NUMEROLOGY_FIGURE_CSS } from '../../src/numerology-figure-renderer.js';
const { jsx, jsxs } = ui;

function overflowWithin(container, scale = 1) {
  const frame = container.getBoundingClientRect();
  const overflow = { left: 0, top: 0, right: 0, bottom: 0, scroll: 0 };
  for (const node of container.querySelectorAll('*')) {
    const rect = node.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    overflow.left = Math.max(overflow.left, (frame.left - rect.left) / scale);
    overflow.top = Math.max(overflow.top, (frame.top - rect.top) / scale);
    overflow.right = Math.max(overflow.right, (rect.right - frame.right) / scale);
    overflow.bottom = Math.max(overflow.bottom, (rect.bottom - frame.bottom) / scale);
    if (node instanceof HTMLElement && node.clientWidth > 0) overflow.scroll = Math.max(overflow.scroll, node.scrollWidth - node.clientWidth);
    const svg = node.ownerSVGElement;
    if (svg) {
      const bounds = svg.getBoundingClientRect();
      overflow.left = Math.max(overflow.left, (bounds.left - rect.left) / scale);
      overflow.top = Math.max(overflow.top, (bounds.top - rect.top) / scale);
      overflow.right = Math.max(overflow.right, (rect.right - bounds.right) / scale);
      overflow.bottom = Math.max(overflow.bottom, (rect.bottom - bounds.bottom) / scale);
    }
  }
  return overflow;
}
const fits = overflow => Object.values(overflow).every(value => value <= 1);
function verifyDetector() {
  const frame = document.createElement('div');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:100px;opacity:0;pointer-events:none';
  document.body.append(frame);
  try {
    frame.innerHTML = '<svg width="400" height="50"></svg>';
    const oversizedSvgRejected = !fits(overflowWithin(frame));
    frame.innerHTML = '<div style="position:relative;left:-20px;top:-20px;width:50px;height:50px"></div>';
    const negativeOffsetRejected = !fits(overflowWithin(frame));
    frame.innerHTML = '<svg width="200" height="100"><rect x="210" width="20" height="20" /></svg>';
    const clippedSvgChildRejected = !fits(overflowWithin(frame));
    if (!oversizedSvgRejected || !negativeOffsetRejected || !clippedSvgChildRejected) throw Error('Overflow detector failed its injected-fault tests.');
    return { oversizedSvgRejected, negativeOffsetRejected, clippedSvgChildRejected };
  } finally { frame.remove(); }
}

function App() {
  const [index, setIndex] = React.useState(0), [running, setRunning] = React.useState(false), [proof, setProof] = React.useState(null);
  const item = cases[index];
  async function run() {
    setRunning(true); setProof(null);
    const detectorChecks = verifyDetector(), results = [];
    for (let i = 0; i < cases.length; i++) {
      setIndex(i);
      let host;
      for (let tries = 0; tries < 180; tries++) {
        await new Promise(requestAnimationFrame);
        host = document.querySelector('[data-case-index="' + i + '"] .nn-a4-root');
        if (host && host.dataset.a4State !== 'measuring') break;
      }
      if (!host || host.dataset.a4State === 'measuring') throw Error('A4 measurement timed out.');
      const c = cases[i], papers = [...host.querySelectorAll('.nn-a4-physical')], blocked = c.state !== 'preview_ready';
      const text = papers.flatMap(p => [...p.querySelectorAll('.nn-text-unit')].map(u => ({ id: u.dataset.unitId, text: u.querySelector('p:last-child')?.textContent, annotation: u.querySelector('.nn-annotation')?.textContent || '' })));
      const figures = papers.flatMap(p => [...p.querySelectorAll('.nn-figure-block')].map(u => u.dataset.unitId));
      const preserved = JSON.stringify(text) === JSON.stringify(c.expected.text) && JSON.stringify(figures) === JSON.stringify(c.expected.figures);
      const geometry = papers.map(p => {
        const scale = p.getBoundingClientRect().width / p.offsetWidth, body = p.querySelector('.nn-a4-content');
        return { width: p.offsetWidth, height: p.offsetHeight, body: body.clientHeight, overflow: overflowWithin(body, scale) };
      });
      const safe = blocked ? host.dataset.a4State === 'error' && papers.length === 0 : host.dataset.a4State === 'ready' && papers.length > 0 && preserved && geometry.every(p => Math.abs(p.width - 794) <= 1 && Math.abs(p.height - 1123) <= 1 && fits(p.overflow));
      results.push({ scenario: c.scenario, id: c.id, layout: c.layout, state: c.state, draftSha256: c.draftSha256, ok: safe, preserved, physicalPages: papers.length, geometry });
    }
    setProof({ synthetic: true, accountAcceptance: false, publicationAllowed: false, provenance, detectorChecks, viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth }, results });
    setRunning(false);
  }
  return jsxs(React.Fragment, { children: [
    jsx('style', { children: NUMEROLOGY_FIGURE_CSS + NUMEROLOGY_A4_CSS + 'body{margin:0;background:#eee;font-family:sans-serif}header.lab{position:sticky;top:0;z-index:10;background:#fff;padding:12px}select,button{padding:8px;max-width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere}' }),
    jsxs('header', { className: 'lab', children: [jsx('strong', { children: 'ローカル・架空データ・正式発行不可 ' }), jsx('select', { 'aria-label': '検査対象', value: index, disabled: running, onChange: e => setIndex(Number(e.target.value)), children: cases.map((c, i) => jsx('option', { value: i, children: c.scenario + ' ' + c.layout + ' ' + c.id }, i)) }), jsx('button', { disabled: running, onClick: run, children: running ? '検査中…' : '全140ケースを検査' }), jsx('span', { role: 'status', children: proof ? proof.results.filter(r => r.ok).length + '/140 PASS' : running ? '検査中' : '準備完了' })] }),
    jsx('main', { 'data-case-index': index, children: jsx(NumerologyA4View, { React, ui, renderFigure: renderNumerologyFigure, draft: item.draft, pageIds: [item.id], layout: item.layout }, index) }),
    jsx('pre', { id: 'proof', children: proof ? JSON.stringify(proof, null, 2) : '' }),
  ] });
}
createRoot(document.querySelector('#root')).render(jsx(App, {}));
