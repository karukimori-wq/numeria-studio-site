import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NumeriaCoverEditor } from "./report-cover-editor-component.mjs";

const storage = new Map(), classes = new Set();
globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
globalThis.document = { documentElement: { classList: { toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) } } };
globalThis.window = new EventTarget();
let state, effects = [], cleanups = [];
globalThis.i = {
  createElement: React.createElement,
  useState: initializer => { state ??= initializer(); return [state, next => { state = typeof next === "function" ? next(state) : next; }]; },
  useEffect: callback => effects.push(callback)
};
const props = { scope: "numerology", title: "数秘術 鑑定書", practitioner: "星乃みづき", clientName: "高橋 美月", font: "classic", logo: null, canUpload: true, accent: "#b49349", background: "#fff" };
props.onTitle = value => { props.title = value; };
props.onPractitioner = value => { props.practitioner = value; };
props.onFont = value => { props.font = value; };
props.onLogo = file => { props.logo = file.data; };
props.onClearLogo = () => { props.logo = null; };
let tree;
function render() {
  cleanups.forEach(cleanup => cleanup?.());
  effects = [];
  tree = NumeriaCoverEditor(props);
  cleanups = effects.map(effect => effect());
}
function nodes(element = tree) {
  if (!element || typeof element !== "object") return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(nodes)];
}
function text(element) {
  if (typeof element === "string" || typeof element === "number") return String(element);
  return element ? React.Children.toArray(element.props.children).map(text).join("") : "";
}
function control(label, type) {
  const wrapper = nodes().find(node => node.type === "label" && text(node).startsWith(label) && nodes(node).some(child => child.type === type));
  return wrapper ? nodes(wrapper).find(node => node.type === type) : undefined;
}
function change(label, type, value) {
  const input = control(label, type);
  assert.ok(input, `${label} control exists`);
  input.props.onChange({ target: { value, checked: value } });
  render();
}
function previewText() { return text(nodes().find(node => node.props.className === "numeria-cover-preview")); }

render();
change("表紙タイトル", "input", "私の鑑定書");
change("占い師名", "input", "星乃 みづき");
assert.equal(control("お客様名", "input"), undefined, "customer name field is not rendered in format settings");
assert.match(previewText(), /私の鑑定書.*高橋 美月.*星乃 みづき/);
change("占い師の名前を表示", "input", false);
assert.ok(!previewText().includes("星乃 みづき"));
change("占い師の名前を表示", "input", true);
assert.ok(previewText().includes("星乃 みづき"));
change("お客様の名前を表示", "input", false);
assert.ok(!previewText().includes("高橋 美月"));
change("ロゴを表示", "input", false);
assert.equal(control("ロゴ", "select").props.disabled, true);
change("ロゴを表示", "input", true);
assert.equal(control("ロゴ", "select").props.disabled, false);
change("ロゴ", "select", "custom");
control("ロゴ画像", "input").props.onChange({ target: { files: [{ data: "data:image/png;base64,TEST" }] } });
render();
assert.equal(nodes().find(node => node.props.alt === "表紙ロゴ").props.src, props.logo);
change("書体", "select", "modern");
assert.match(nodes().find(node => node.props.className === "numeria-cover-preview").props.style.fontFamily, /sans-serif/);
const saved = JSON.parse(storage.get("numeria.reportFormat.cover.numerology.v1"));
state = undefined;
render();
assert.equal(state.client, false);
change("ロゴ", "select", "standard");
assert.equal(props.logo, null);
props.canUpload = false;
render();
assert.equal(nodes(control("ロゴ", "select")).find(node => node.type === "option" && node.props.value === "custom").props.disabled, true);
assert.equal(nodes().filter(node => node.type === "input" && node.props.type === "file").length, 0);
props.scope = "tarot";
state = undefined;
render();
assert.equal(state.client, true, "divination cover settings are isolated");
assert.equal(control("書体", "select").type, "select");

globalThis.i = React;
const html = renderToStaticMarkup(React.createElement(NumeriaCoverEditor, props));
assert.match(html, /type="text"/);
assert.doesNotMatch(html, /placeholder="お客様名"/);
assert.match(html, /border:1px solid #bcb5c6/);
assert.match(html, /<select/);
assert.match(html, /min-height:48px/);
console.log("Cover editor state and React markup verified: title/practitioner inputs, customer visibility without customer input, font, custom logo, Free gate, persistence, and divination isolation. Browser layout is not covered by this test.");
