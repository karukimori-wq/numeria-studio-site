import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const marker = 'NumeriaBootMetrics.v1';
let version = process.env.GITHUB_SHA || '';
if (!version) { try { version = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { version = 'local'; } }
version = version.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);
const runtime = readFileSync('src/boot-metrics.js', 'utf8').replace('__BOOT_VERSION__', version);
let html = readFileSync('dist/original.html', 'utf8');
if (html.includes(marker)) throw new Error('Boot metrics already applied');
function replace(source, anchor, value, label) {
  if (!source.includes(anchor)) throw new Error('Boot metrics anchor missing: ' + label);
  return source.replace(anchor, value);
}
const hook = name => 'typeof window!=="undefined"&&window.NumeriaBootMetrics&&window.NumeriaBootMetrics.event("' + name + '");';
for (const [state, name] of [['state.recovery="started";', 'recovery-start'], ['state.recovery="done";', 'recovery-end'], ['state.recovery="failed";', 'recovery-failed'], ['state.directMount="started";', 'direct-start'], ['state.directMount="skipped";', 'direct-skipped'], ['state.directMount="done";', 'direct-render-submitted'], ['state.directMount="failed";', 'direct-failed']]) html = replace(html, state, state + hook(name), name);
html = replace(html, 'await window.Clerk.load();', 'await (window.NumeriaBootMetrics?window.NumeriaBootMetrics.measure("auth-session",()=>window.Clerk.load()):window.Clerk.load());', 'Clerk session');
html = html.replace('<head>', '<head><script id="numeria-boot-metrics">' + runtime + '</script>');
writeFileSync('dist/original.html', html);
let index = readFileSync('dist/index.html', 'utf8');
index = index.replace('<head>', '<head><script>/* NumeriaBootEntry.v1 */try{sessionStorage.setItem("numeria-boot-entry-v1",String(performance.timeOrigin||Date.now()-performance.now()))}catch{}</script>');
writeFileSync('dist/index.html', index);
for (const file of readdirSync('dist/assets').filter(name => /^index-.*\.js$/.test(name) && !name.startsWith('index-runtime-'))) {
  const path = 'dist/assets/' + file, source = readFileSync(path, 'utf8');
  if (source.includes('function la(e){let t=Ji(li(e))')) writeFileSync(path, replace(source, 'function la(e){let t=Ji(li(e))', 'function la(e){' + hook('normal-mount-start') + 'let t=Ji(li(e))', 'normal root'));
}
console.log('Boot timings installed before startup; local history contains no payloads, URLs or raw errors.');
