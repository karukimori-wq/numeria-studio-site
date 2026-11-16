import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
// Execute the real observer callback with a minimal open editor. Browser DOM
// textContent writes replace text nodes even when the string is unchanged.
const runtime = readFileSync('scripts/block-editor-runtime.js', 'utf8');
const start = runtime.indexOf('function decorateEditor(){');
const end = runtime.indexOf('new MutationObserver(decorateEditor)', start);
assert.ok(start >= 0 && end > start);
let mutations = 0;
const button = () => ({
  value: '', dataset: { v3PageLimitBound: '1' }, disabled: false,
  get textContent() { return this.value; },
  set textContent(value) { this.value = value; mutations++; },
});
const add = button(), remove = button(), copy = button();
const pane = { querySelector(selector) { return ({ '[data-add-page]': add, '[data-delete-page]': remove, '[data-copy-page]': copy, '[data-v3-page-order]': {} })[selector] || null; } };
const root = { classList: { contains: () => true }, querySelector: selector => selector === '.nbe-pages' ? pane : null, querySelectorAll: () => [] };
const page = { pageId: 'fixture-free', layoutRegions: [] };
const context = vm.createContext({ root, data: { pages: [page] }, document: { querySelector: () => ({}) }, isFixedPage: () => false, isFreePage: () => true, current: () => page, backups: [] });
vm.runInContext(runtime.slice(start, end) + ';decorateEditor();', context);
assert.equal(add.textContent, '自由ページを追加');
assert.equal(remove.textContent, '自由ページを削除');
assert.equal(copy.textContent, '自由ページを複製');
mutations = 0;
vm.runInContext('decorateEditor();', context);
assert.equal(mutations, 0, 'The observer must settle after decoration; repeated text-node writes starve the browser event loop.');
console.log('Block editor observer: first decoration updates labels, second callback makes zero child-list mutations.');
