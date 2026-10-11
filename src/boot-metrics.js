/* NumeriaBootMetrics.v1 — timings only; never retain payloads, tokens or raw errors. */
(() => {
  if (window.NumeriaBootMetrics) return;
  const KEY = 'numeria-boot-history-v1', ENTRY = 'numeria-boot-entry-v1';
  const start = performance.timeOrigin || Date.now() - performance.now();
  let entryMs = null;
  try {
    const previous = Number(sessionStorage.getItem(ENTRY));
    sessionStorage.removeItem(ENTRY);
    if (previous > 0 && start >= previous && start - previous < 30000) entryMs = Math.round(start - previous);
  } catch {}
  const run = { schema: 1, id: String(start), startedAt: new Date(start).toISOString(), version: '__BOOT_VERSION__', entryMs, route: 'unknown', screen: 'pending', readyMs: null, loginReadyMs: null, homeReadyMs: null, events: [], resources: [], navigation: null };
  let active = true, pendingSave = null, observer = null;
  const rounded = value => Math.round(Math.max(0, value));
  function history() {
    try { const rows = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(rows) ? rows.slice(0, 20) : []; } catch { return []; }
  }
  function save() {
    pendingSave = null;
    try { localStorage.setItem(KEY, JSON.stringify([run, ...history().filter(row => row.id !== run.id)].slice(0, 20))); } catch {}
  }
  function scheduleSave() { if (!pendingSave) pendingSave = setTimeout(save, 250); }
  function event(name, detail = {}) {
    if (!active || run.events.length >= 200) return;
    // All callers use fixed event labels and primitive timing/status values.
    const safe = {};
    for (const key of ['durationMs', 'status', 'result', 'code']) {
      if (typeof detail[key] === 'number') safe[key] = detail[key];
      else if (typeof detail[key] === 'string' && /^(ok|failed|empty|react-418|script-load|runtime|promise|timeout)$/.test(detail[key])) safe[key] = detail[key];
    }
    run.events.push({ name, ms: rounded(performance.now()), ...safe });
    scheduleSave();
  }
  async function measure(name, operation) {
    if (!active) return operation();
    const at = performance.now();
    event(name + '-start');
    try {
      const result = await operation();
      event(name + '-end', { durationMs: rounded(performance.now() - at), result: result && result.error ? 'failed' : result === '' ? 'empty' : 'ok' });
      ensureEntry();
      return result;
    } catch (error) {
      event(name + '-end', { durationMs: rounded(performance.now() - at), result: 'failed' });
      throw error;
    }
  }
  const fetchPaths = { '/api/auth/config': 'auth-config', '/api/billing/subscription': 'billing', '/api/admin/status': 'admin-status', '/api/user-preferences': 'preferences-http', '/api/workspace-state': 'workspace-http' };
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    let name;
    try { name = fetchPaths[new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href).pathname]; } catch {}
    if (!active || !name || String(init && init.method || input && input.method || 'GET').toUpperCase() !== 'GET') return originalFetch.call(this, input, init);
    const at = performance.now(); event(name + '-start');
    return originalFetch.call(this, input, init).then(response => {
      event(name + '-end', { durationMs: rounded(performance.now() - at), status: response.status, result: response.ok ? 'ok' : 'failed' });
      return response;
    }, error => { event(name + '-end', { durationMs: rounded(performance.now() - at), result: 'failed' }); throw error; });
  };
  for (const [property, phase] of Object.entries({ NumeriaWaitForClerkToken: 'token-wait', NumeriaAccessContextLoad: 'access-context', NumeriaUserPreferencesLoad: 'preferences', NumeriaD1WorkspaceLoad: 'workspace' })) {
    let value;
    Object.defineProperty(window, property, { configurable: true, get() { return value; }, set(fn) {
      value = typeof fn === 'function' ? function(...args) { return measure(phase, () => fn.apply(this, args)); } : fn;
    } });
  }
  window.addEventListener('error', error => event('error', { code: /#418/.test(String(error.message || '')) ? 'react-418' : error.target && error.target.tagName === 'SCRIPT' ? 'script-load' : 'runtime' }), true);
  window.addEventListener('unhandledrejection', () => event('error', { code: 'promise' }));
  function collect() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) run.navigation = { responseStartMs: rounded(navigation.responseStart), responseEndMs: rounded(navigation.responseEnd), domContentLoadedMs: rounded(navigation.domContentLoadedEventEnd), loadMs: rounded(navigation.loadEventEnd), type: navigation.type };
    run.resources = performance.getEntriesByType('resource').map(resource => {
      let url; try { url = new URL(resource.name); } catch { return null; }
      let kind;
      if (url.origin === location.origin && /\/assets\/.*\.(js|css|woff2)$/.test(url.pathname)) kind = /numeria-app/.test(url.pathname) ? 'app-js' : /framework/.test(url.pathname) ? 'framework-js' : /index.*\.js$/.test(url.pathname) ? 'bootstrap-js' : /\.css$/.test(url.pathname) ? 'css' : /woff2$/.test(url.pathname) ? 'font' : 'other-js';
      else if (/clerk/i.test(url.hostname) || /clerk\.browser\.js$/.test(url.pathname)) kind = 'auth-resource';
      if (!kind) return null;
      // Keep a category, never a URL (which could contain user identifiers or tokens).
      return { kind, startMs: rounded(resource.startTime), durationMs: rounded(resource.duration), endMs: rounded(resource.responseEnd), transferBytes: resource.transferSize || 0 };
    }).filter(Boolean).slice(0, 60);
    scheduleSave();
  }
  function admin() {
    try { return !!(window.NumeriaAdminPreviewState && window.NumeriaAdminPreviewState.adminMode === true) || !!(window.NumeriaNavigation && window.NumeriaNavigation.getRole() === 'admin'); } catch { return false; }
  }
  function ensureEntry() {
    if (!admin()) { document.querySelectorAll('[data-numeria-boot-entry]').forEach(node => node.remove()); return; }
    const actions = document.querySelector('.admin-page .admin-header') || document.querySelector('#numeria-admin-panel .admin-actions');
    if (actions && !actions.querySelector('[data-numeria-boot-entry]')) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.numeriaBootEntry = 'true'; button.textContent = '起動履歴'; button.addEventListener('click', open); actions.appendChild(button);
    }
  }
  function openAdmin() {
    if (!admin()) return;
    document.getElementById('numeria-admin-tools')?.remove();
    const panel = document.createElement('section'); panel.id = 'numeria-admin-tools'; panel.className = 'no-print';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '管理者メニュー');
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#fffdf8;color:#241b3a;padding:24px 16px;overflow:auto;font:16px/1.6 system-ui';
    const heading = document.createElement('h2'); heading.textContent = '管理者メニュー'; panel.appendChild(heading);
    const note = document.createElement('p'); note.textContent = '起動履歴から、この端末の起動時間を確認・書き出せます。'; panel.appendChild(note);
    for (const [title, action] of [['起動履歴', () => { panel.remove(); open(); }], ['サイト管理', () => { if (window.NumeriaNavigation?.go) { panel.remove(); window.NumeriaNavigation.go('admin'); } else { note.textContent = 'サイト管理の準備中です。起動履歴は利用できます。'; } }], ['閉じる', () => panel.remove()]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.style.cssText = 'display:block;width:100%;padding:16px;margin:12px 0;border:1px solid #ded6c6;border-radius:12px;background:#fff;color:#241b3a;font:inherit'; button.addEventListener('click', action); panel.appendChild(button);
    }
    document.body.appendChild(panel);
  }
  function open() {
    if (!admin()) return;
    collect(); save();
    const existing = document.getElementById('numeria-boot-history'); if (existing) existing.remove();
    const panel = document.createElement('section'); panel.id = 'numeria-boot-history'; panel.className = 'no-print'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '起動履歴');
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fffdf8;color:#241b3a;padding:24px 16px calc(24px + env(safe-area-inset-bottom));overflow:auto;font:14px/1.6 system-ui;';
    const heading = document.createElement('h2'); heading.textContent = '起動履歴（この端末の直近20回）'; panel.appendChild(heading);
    const note = document.createElement('p'); note.textContent = '時間はページ読込開始からの値です。処理は並行するため合計しません。ログイン画面とホームを区別します。顧客情報・認証情報は含みません。'; panel.appendChild(note);
    function button(label, callback) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'padding:10px 16px;margin:0 8px 12px 0'; b.addEventListener('click', callback); panel.appendChild(b); }
    button('閉じる', () => panel.remove());
    button('JSONを書き出す', () => {
      if (!admin()) return;
      const blob = new Blob([JSON.stringify(history(), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'numeria-boot-history.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    for (const row of history()) {
      const box = document.createElement('article'); box.style.cssText = 'border:1px solid #ded6c6;border-radius:12px;padding:14px;margin:12px 0';
      const title = document.createElement('strong'); const route = { normal: '通常起動', direct: '別の起動方法', unknown: '未判定' }[row.route] || '未判定';
      title.textContent = new Date(row.startedAt).toLocaleString('ja-JP') + ' ／ ' + route + ' ／ ' + (row.readyMs == null ? '表示未確認' : ((row.screen === 'home' ? row.homeReadyMs : row.readyMs) / 1000).toFixed(2) + '秒') + ' ／ ' + (row.screen === 'home' ? 'ホーム' : row.screen === 'login' ? 'ログイン画面' : '準備中'); box.appendChild(title);
      const version = document.createElement('p'); version.textContent = '版：' + row.version + (row.entryMs == null ? '' : ' ／ 最初の入口：約' + row.entryMs + 'ms'); box.appendChild(version);
      const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre'); summary.textContent = '処理ごとの時間を見る'; pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere';
      const labels = { 'measurement-start': '計測開始', 'normal-mount-start': '通常の画面生成開始', 'recovery-start': '再試行開始', 'recovery-end': '再試行ファイル読込完了', 'recovery-failed': '再試行失敗', 'direct-start': '別の起動方法開始', 'direct-skipped': '別の起動を中止（通常起動済み）', 'direct-render-submitted': '別の起動から画面描画を要求', 'direct-failed': '別の起動失敗', 'screen-ready': '最初の画面表示', 'login-ready': 'ログイン画面表示', 'home-ready': 'ホーム表示', 'error': 'エラー', 'measurement-end': '計測終了', 'measurement-timeout': '表示未確認で計測終了' };
      const phases = { 'auth-config': '認証設定取得', 'auth-session': '認証の初期化', 'token-wait': '認証トークン待ち', 'access-context': '契約・管理権限取得', 'billing': '契約API', 'admin-status': '管理権限API', 'preferences': '占術設定読込', 'preferences-http': '占術設定API', 'workspace': '保存データ読込', 'workspace-http': '保存データAPI' };
      function label(name) { if (labels[name]) return labels[name]; const parts = name.match(/^(.*)-(start|end)$/); return parts && phases[parts[1]] ? phases[parts[1]] + (parts[2] === 'start' ? '開始' : '完了') : name; }
      pre.textContent = (row.events || []).map(item => item.ms + 'ms  ' + label(item.name) + (item.durationMs == null ? '' : '  所要' + item.durationMs + 'ms') + (item.result ? '  ' + item.result : '') + (item.code ? '  ' + item.code : '')).join('\n') + '\n\nファイル読込（並行処理）：\n' + (row.resources || []).map(item => item.kind + '：開始' + item.startMs + 'ms／所要' + item.durationMs + 'ms').join('\n'); details.append(summary, pre); box.appendChild(details); panel.appendChild(box);
    }
    document.body.appendChild(panel);
  }
  function check() {
    ensureEntry();
    const candidates = document.querySelectorAll('.app-shell,.auth-page');
    for (const screen of candidates) {
      if (!screen.isConnected || !screen.getBoundingClientRect().width || !screen.getBoundingClientRect().height || getComputedStyle(screen).visibility === 'hidden' || getComputedStyle(screen).display === 'none') continue;
      const kind = screen.classList.contains('app-shell') ? 'home' : 'login';
      const route = screen.closest('#numeria-direct-root') ? 'direct' : 'normal';
      if (kind === 'login' && run.loginReadyMs === null) { run.loginReadyMs = rounded(performance.now()); event('login-ready'); }
      if (run.readyMs === null) { run.readyMs = rounded(performance.now()); run.route = route; run.screen = kind; event('screen-ready'); collect(); }
      if (kind === 'home' && !run.events.some(item => item.name === 'home-ready')) { run.screen = 'home'; run.homeReadyMs = rounded(performance.now()); run.route = route; event('home-ready'); collect(); }
      break;
    }
  }
  window.NumeriaBootMetrics = { event, measure, open, openAdmin, snapshot() { collect(); return JSON.parse(JSON.stringify(run)); } };
  event('measurement-start'); save();
  const timer = setInterval(check, 250);
  try { observer = new MutationObserver(check); observer.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
  window.addEventListener('load', collect);
  window.addEventListener('pagehide', () => { collect(); save(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('numeria-boot-history')?.remove(); });
  setTimeout(() => { event(run.readyMs === null ? 'measurement-timeout' : 'measurement-end'); collect(); save(); active = false; clearInterval(timer); if (observer) observer.disconnect(); }, 90000);
})();
