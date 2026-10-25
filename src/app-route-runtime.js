(() => {
  const MARK = "NumeriaAppRouteDispatch.v2";
  const ROUTES = {
    home: "/app/home",
    clients: "/app/clients",
    readings: "/app/readings",
    newReading: "/app/readings/new",
    reports: "/app/reports",
    settings: "/app/settings/report-formats",
  };
  const SURFACE_ID = "numeria-route-surface";
  const STYLE_ID = "numeria-route-surface-style";
  const wrappedApis = new WeakSet();
  let dispatchSequence = 0;
  let dispatching = false;
  let connectedApi = null;

  function safeId(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch {
      return "";
    }
  }

  function safeReturnPath(value) {
    return typeof value === "string"
      && value.startsWith("/app")
      && !value.startsWith("//")
      && !value.includes("://")
      ? value
      : ROUTES.home;
  }

  function routeSpec(pathname = location.pathname) {
    if (pathname === "/app" || pathname === "/app/" || pathname === ROUTES.home) return { kind: "home", page: "dashboard" };
    if (pathname === ROUTES.clients) return { kind: "clients", page: "appraisalProfiles" };
    let match = pathname.match(/^\/app\/clients\/([^/]+)$/);
    if (match) return { kind: "client-detail", clientRef: safeId(match[1]) };
    if (pathname === ROUTES.readings) return { kind: "readings" };
    if (pathname === ROUTES.newReading) return { kind: "reading-new" };
    match = pathname.match(/^\/app\/readings\/([^/]+)$/);
    if (match) return { kind: "reading-detail", sessionId: safeId(match[1]) };
    if (pathname === ROUTES.reports) return { kind: "reports" };
    match = pathname.match(/^\/app\/reports\/([^/]+)$/);
    if (match) return { kind: "report-detail", reportId: safeId(match[1]) };
    if (pathname === ROUTES.settings) return { kind: "settings", page: "settings" };
    match = pathname.match(/^\/app\/settings(?:\/(characters|reading-configs|ai|plan))?$/);
    if (match) return { kind: "settings", page: "account", section: match[1] || "account" };
    return null;
  }

  function pathForPage(page) {
    if (page === "dashboard") return ROUTES.home;
    if (page === "appraisalProfiles") return ROUTES.clients;
    if (page === "reading") return ROUTES.newReading;
    if (page === "settings") return ROUTES.settings;
    if (page === "account") return "/app/settings";
    return null;
  }

  function setRouteKind(kind) {
    document.documentElement.dataset.numeriaRouteKind = kind || "";
    document.documentElement.classList.toggle("numeria-report-tab-active", kind === "reports" || kind === "report-detail");
    window.dispatchEvent(new CustomEvent("numeria-route-kind-change", { detail: { kind: kind || "" } }));
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${SURFACE_ID}{position:fixed;inset:0;z-index:228;overflow:auto;background:#f8f6f1;color:#211b2e;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:calc(110px + env(safe-area-inset-bottom))}
#${SURFACE_ID}[hidden]{display:none!important}
#${SURFACE_ID} *{box-sizing:border-box}
#${SURFACE_ID} .nr-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:14px;padding:18px clamp(18px,4vw,56px);background:rgba(248,246,241,.94);backdrop-filter:blur(18px);border-bottom:1px solid #e4ddcf}
#${SURFACE_ID} .nr-back{width:44px;height:44px;flex:0 0 44px;border:1px solid #dcd3c4;border-radius:14px;background:#fff;color:#2a2337;font-size:25px;cursor:pointer}
#${SURFACE_ID} .nr-header small{display:block;color:#9b7b3d;font-size:10px;font-weight:900;letter-spacing:.18em;margin-bottom:3px}
#${SURFACE_ID} .nr-header h1{font-family:Georgia,"Yu Mincho",serif;font-size:clamp(24px,3vw,34px);font-weight:500;line-height:1.2;margin:0}
#${SURFACE_ID} .nr-body{width:min(1080px,100%);margin:0 auto;padding:28px clamp(18px,4vw,48px)}
#${SURFACE_ID} .nr-status,#${SURFACE_ID} .nr-empty{padding:28px;border:1px solid #e1d9cb;border-radius:20px;background:#fff;text-align:center;color:#6e6675;line-height:1.7}
#${SURFACE_ID} .nr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
#${SURFACE_ID} .nr-card{display:block;width:100%;min-height:132px;border:1px solid #ded6c8;border-radius:20px;background:#fff;padding:20px;text-align:left;color:inherit;box-shadow:0 10px 30px rgba(42,31,58,.05);cursor:pointer}
#${SURFACE_ID} .nr-card:hover{border-color:#b69a61;box-shadow:0 12px 34px rgba(42,31,58,.10)}
#${SURFACE_ID} .nr-card small{display:block;color:#9b7b3d;font-size:10px;font-weight:900;letter-spacing:.12em;margin-bottom:8px}
#${SURFACE_ID} .nr-card strong{display:block;font-family:Georgia,"Yu Mincho",serif;font-size:21px;font-weight:500;margin-bottom:8px}
#${SURFACE_ID} .nr-card p{margin:4px 0;color:#6e6675;font-size:13px;line-height:1.65}
#${SURFACE_ID} .nr-detail{display:grid;gap:16px}
#${SURFACE_ID} .nr-detail section{border:1px solid #ded6c8;border-radius:20px;background:#fff;padding:22px}
#${SURFACE_ID} .nr-detail h2{font-family:Georgia,"Yu Mincho",serif;font-weight:500;margin:0 0 12px}
#${SURFACE_ID} .nr-detail dl{display:grid;grid-template-columns:minmax(120px,.35fr) 1fr;gap:10px 18px;margin:0}
#${SURFACE_ID} .nr-detail dt{color:#8a7a5b;font-size:12px;font-weight:800}
#${SURFACE_ID} .nr-detail dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
#${SURFACE_ID} .nr-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
#${SURFACE_ID} .nr-action{min-height:44px;border:1px solid #cbb888;border-radius:999px;background:#2c2440;color:#fff;padding:10px 18px;font-weight:800;cursor:pointer}
#${SURFACE_ID} .nr-action.secondary{background:#fff;color:#2c2440}
@media(max-width:760px){#${SURFACE_ID}{z-index:226}#${SURFACE_ID} .nr-header{padding:calc(14px + env(safe-area-inset-top)) 16px 14px}#${SURFACE_ID} .nr-body{padding:20px 14px}.nr-grid{grid-template-columns:1fr!important}#${SURFACE_ID} .nr-detail dl{grid-template-columns:1fr;gap:3px}#${SURFACE_ID} .nr-detail dd{margin-bottom:10px}}
@media print{#${SURFACE_ID}{position:static;padding:0}.nr-back,.nr-actions{display:none!important}}
`;
    document.head.appendChild(style);
  }

  function surface() {
    ensureStyle();
    let node = document.getElementById(SURFACE_ID);
    if (!node) {
      node = document.createElement("section");
      node.id = SURFACE_ID;
      node.hidden = true;
      node.setAttribute("aria-live", "polite");
      document.body.appendChild(node);
    }
    return node;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
    })[character]);
  }

  function closeSurface() {
    const node = document.getElementById(SURFACE_ID);
    if (node) {
      node.hidden = true;
      node.replaceChildren();
    }
  }

  function invokeRouteApi(callback) {
    dispatching = true;
    try {
      return callback();
    } finally {
      dispatching = false;
    }
  }

  function renderSurface({ kind, kicker, title, body }) {
    const node = surface();
    node.hidden = false;
    node.dataset.routeScreen = kind;
    node.innerHTML = `<header class="nr-header"><button type="button" class="nr-back" aria-label="前の画面へ戻る">‹</button><div><small>${escapeHtml(kicker)}</small><h1>${escapeHtml(title)}</h1></div></header><main class="nr-body">${body}</main>`;
    node.querySelector(".nr-back")?.addEventListener("click", () => {
      if (history.length > 1) history.back();
      else navigate(ROUTES.home, { replace: true });
    });
    for (const element of node.querySelectorAll("[data-route-href]")) {
      element.addEventListener("click", () => replaceOrPush(element.dataset.routeHref));
    }
    return node;
  }

  function renderLoading(kind, title) {
    renderSurface({
      kind,
      kicker: "NUMERIA STUDIO",
      title,
      body: '<div class="nr-status" role="status">データを読み込んでいます…</div>',
    });
  }

  function renderError(kind, title, message) {
    renderSurface({
      kind,
      kicker: "NUMERIA STUDIO",
      title,
      body: `<div class="nr-status" role="alert">${escapeHtml(message || "データを読み込めませんでした。")}</div>`,
    });
  }

  async function apiJson(path) {
    const fetcher = typeof window.NumeriaAuthenticatedFetch === "function"
      ? window.NumeriaAuthenticatedFetch
      : window.fetch.bind(window);
    const response = await fetcher(path, {
      headers: { "X-Workspace-Id": "ws_personal", Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  function reportListBody(reports) {
    if (!reports.length) return '<div class="nr-empty">まだ鑑定書はありません。鑑定を完成してPDFを生成すると、ここから確認できます。</div>';
    return `<div class="nr-grid">${reports.slice().reverse().map((report) => `
      <button type="button" class="nr-card" data-route-href="${ROUTES.reports}/${encodeURIComponent(report.exportId)}">
        <small>${escapeHtml(report.reportType === "detailed" ? "DETAILED REPORT" : "BASIC REPORT")}</small>
        <strong>${escapeHtml(report.reportSnapshot?.clientName || report.clientName || "鑑定書")}</strong>
        <p>ID: ${escapeHtml(report.exportId)}</p>
        <p>${escapeHtml(report.generatedAt ? new Date(report.generatedAt).toLocaleString("ja-JP") : "生成日時未記録")}</p>
      </button>`).join("")}</div>`;
  }

  function sessionListBody(sessions) {
    if (!sessions.length) return '<div class="nr-empty">保存済みSessionはありません。「新しい鑑定」を開始してください。</div><div class="nr-actions"><button class="nr-action" data-route-href="/app/readings/new">新しい鑑定</button></div>';
    return `<div class="nr-actions"><button class="nr-action" data-route-href="/app/readings/new">新しい鑑定</button></div><div class="nr-grid">${sessions.map((session) => `
      <button type="button" class="nr-card" data-route-href="${ROUTES.readings}/${encodeURIComponent(session.id)}">
        <small>${session.sessionState === "draft" ? "DRAFT SESSION" : "COMPLETED SESSION"}</small>
        <strong>${escapeHtml(session.clientName || session.snapshot?.name || "相談者未設定")}</strong>
        <p>${escapeHtml(session.question || session.snapshot?.theme || "相談テーマ未入力")}</p>
        <p>ID: ${escapeHtml(session.id)}</p>
      </button>`).join("")}</div>`;
  }

  async function showReports(reportId, sequence) {
    renderLoading(reportId ? "report-detail" : "reports", reportId ? "鑑定書詳細" : "鑑定書一覧");
    try {
      const data = reportId
        ? await apiJson(`/api/reports/${encodeURIComponent(reportId)}?workspaceId=ws_personal`)
        : await apiJson("/api/appraisals/status?workspaceId=ws_personal");
      if (sequence !== dispatchSequence) return;
      if (!reportId) {
        renderSurface({ kind: "reports", kicker: "REPORTS", title: "鑑定書一覧", body: reportListBody(data.reportExports || []) });
        return;
      }
      const report = data.report || {};
      const snapshot = report.reportSnapshot || data.session?.snapshot || {};
      const sessionId = report.appraisalId || data.session?.id || "";
      renderSurface({
        kind: "report-detail",
        kicker: "REPORT DETAIL",
        title: snapshot.clientName ? `${snapshot.clientName}様の鑑定書` : "鑑定書詳細",
        body: `<div class="nr-detail"><section><h2>鑑定書情報</h2><dl>
          <dt>Report ID</dt><dd>${escapeHtml(report.exportId || reportId)}</dd>
          <dt>Session ID</dt><dd>${escapeHtml(sessionId || "未接続")}</dd>
          <dt>種類</dt><dd>${escapeHtml(report.reportType || "basic")}</dd>
          <dt>生成日時</dt><dd>${escapeHtml(report.generatedAt ? new Date(report.generatedAt).toLocaleString("ja-JP") : "未記録")}</dd>
          <dt>相談テーマ</dt><dd>${escapeHtml(snapshot.question || data.session?.question || "未入力")}</dd>
          <dt>鑑定内容</dt><dd>${escapeHtml(snapshot.resultSummary || data.session?.resultSummary || "未入力")}</dd>
        </dl><div class="nr-actions">${sessionId ? `<button class="nr-action" data-route-href="${ROUTES.readings}/${encodeURIComponent(sessionId)}">元のSessionを開く</button>` : ""}<button class="nr-action secondary" data-route-href="${ROUTES.reports}">一覧へ戻る</button></div></section></div>`,
      });
    } catch (error) {
      if (sequence === dispatchSequence) renderError(reportId ? "report-detail" : "reports", reportId ? "鑑定書詳細" : "鑑定書一覧", error.message);
      throw error;
    }
  }

  async function showReadings(sequence) {
    renderLoading("readings", "鑑定Session");
    try {
      const data = await apiJson("/api/appraisals/status?workspaceId=ws_personal");
      if (sequence !== dispatchSequence) return;
      const sessions = [];
      if (data.activeDraft) sessions.push({ ...data.activeDraft, sessionState: "draft" });
      for (const item of data.visibleCompletedAppraisals || data.completedAppraisals || []) {
        sessions.push({ ...item, sessionState: "completed" });
      }
      renderSurface({ kind: "readings", kicker: "SESSIONS", title: "鑑定Session", body: sessionListBody(sessions) });
    } catch (error) {
      if (sequence === dispatchSequence) renderError("readings", "鑑定Session", error.message);
      throw error;
    }
  }

  async function showClient(clientRef, sequence, api) {
    renderLoading("client-detail", "相談者詳細");
    try {
      if (api && typeof api.openClient === "function" && invokeRouteApi(() => api.openClient(clientRef))) {
        closeSurface();
        return;
      }
      const data = await apiJson(`/api/appraisal-clients/${encodeURIComponent(clientRef)}?workspaceId=ws_personal`);
      if (sequence !== dispatchSequence) return;
      const client = data.appraisalClient || {};
      renderSurface({
        kind: "client-detail",
        kicker: "CLIENT PROFILE",
        title: client.clientName || "相談者詳細",
        body: `<div class="nr-detail"><section><h2>相談者</h2><dl><dt>Client Ref</dt><dd>${escapeHtml(clientRef)}</dd><dt>生年月日</dt><dd>${escapeHtml(client.birthDate || "未入力")}</dd><dt>Session</dt><dd>${escapeHtml((data.sessions || []).length)}件</dd><dt>Report</dt><dd>${escapeHtml((data.reports || []).length)}件</dd></dl></section></div>`,
      });
    } catch (error) {
      if (sequence === dispatchSequence) renderError("client-detail", "相談者詳細", error.message);
      throw error;
    }
  }

  async function resumeReading(sessionId, sequence, api) {
    renderLoading("reading-detail", "保存済みSessionを復元");
    try {
      const data = await apiJson(`/api/appraisals/${encodeURIComponent(sessionId)}?workspaceId=ws_personal`);
      if (sequence !== dispatchSequence) return;
      if (!data.session?.snapshot) throw new Error("このSessionには復元可能なsnapshotがありません。");
      if (!api || typeof api.resumeSession !== "function" || !invokeRouteApi(() => api.resumeSession(data.clientRef, data.session))) {
        throw new Error("鑑定画面の復元準備が完了していません。");
      }
      window.dispatchEvent(new CustomEvent("numeria-session-restored", { detail: { session: data.session } }));
      closeSurface();
    } catch (error) {
      if (sequence === dispatchSequence) renderError("reading-detail", "保存済みSessionを復元", error.message);
      throw error;
    }
  }

  function settle(specification, sequence, ok = true) {
    if (sequence !== dispatchSequence) return;
    window.dispatchEvent(new CustomEvent("numeria-route-settled", {
      detail: { ok, kind: specification?.kind || null, path: location.pathname, sequence },
    }));
  }

  async function dispatch() {
    const specification = routeSpec();
    if (!specification) return;
    const sequence = ++dispatchSequence;
    setRouteKind(specification.kind);
    const api = connect(window.NumeriaNavigation);
    try {
      if (specification.kind === "reports" || specification.kind === "report-detail") {
        if (api?.go) invokeRouteApi(() => api.go("dashboard"));
        await showReports(specification.reportId || "", sequence);
      } else if (specification.kind === "readings") {
        if (api?.go) invokeRouteApi(() => api.go("dashboard"));
        await showReadings(sequence);
      } else if (specification.kind === "reading-detail") {
        await resumeReading(specification.sessionId, sequence, api);
      } else if (specification.kind === "reading-new") {
        closeSurface();
        if (api?.newReading) invokeRouteApi(() => api.newReading());
      } else if (specification.kind === "client-detail") {
        await showClient(specification.clientRef, sequence, api);
      } else {
        closeSurface();
        if (api?.go) invokeRouteApi(() => api.go(specification.page));
      }
      settle(specification, sequence, true);
    } catch (error) {
      settle(specification, sequence, false);
      // Event handlers also call dispatch without awaiting it. Report failure
      // through the settled event without creating an unhandled rejection.
      return false;
    }
  }

  function replaceOrPush(path, replace = false) {
    const safePath = safeReturnPath(path);
    if (location.pathname === safePath) return dispatch();
    const method = replace ? "replaceState" : "pushState";
    history[method]({ numeriaRoute: safePath }, "", safePath);
    return dispatch();
  }

  function connect(api) {
    if (!api || typeof api !== "object") return null;
    connectedApi = api;
    if (wrappedApis.has(api)) return api;
    const originalGo = typeof api.go === "function" ? api.go.bind(api) : null;
    const originalNewReading = typeof api.newReading === "function" ? api.newReading.bind(api) : null;
    const originalSignOut = typeof api.signOut === "function" ? api.signOut.bind(api) : null;
    if (originalGo) {
      api.go = function routedGo(page) {
        const result = originalGo(...arguments);
        if (!dispatching) {
          closeSurface();
          const path = pathForPage(page);
          if (path) replaceOrPush(path, false);
        }
        return result;
      };
    }
    if (originalNewReading) {
      api.newReading = function routedNewReading() {
        const result = originalNewReading(...arguments);
        if (!dispatching) replaceOrPush(ROUTES.newReading, false);
        return result;
      };
    }
    if (originalSignOut) {
      api.signOut = function routedSignOut() {
        return Promise.resolve(originalSignOut(...arguments)).finally(() => location.assign("/"));
      };
    }
    wrappedApis.add(api);
    return api;
  }

  function nativeButtonPath(button, api = connectedApi) {
    if (!button || button.hasAttribute?.("data-route-href") || button.closest?.(`#${SURFACE_ID}`)) return null;
    const label = String(button.getAttribute?.("aria-label") || button.textContent || "").replace(/\s+/g, "").trim();
    if (label === "ホーム" || label === "⌂ホーム" || label === "ダッシュボードへ") return ROUTES.home;
    if (label === "カルテ" || label === "◇カルテ") return ROUTES.clients;
    if (label === "鑑定" || label === "7鑑定") return ROUTES.newReading;
    if (label === "鑑定書" || label === "▱鑑定書") return ROUTES.reports;
    if (label === "テンプレート調整" || label === "アカウント管理") return ROUTES.settings;
    if ((routeSpec()?.kind === "clients" || routeSpec()?.kind === "client-detail") && typeof api?.getClients === "function") {
      const client = api.getClients().find((item) => {
        const clientName = item?.clientName || item?.name || "";
        return item?.id && clientName && label.includes(String(clientName).replace(/\s+/g, ""));
      });
      if (client) return `${ROUTES.clients}/${encodeURIComponent(client.id)}`;
    }
    return null;
  }

  function syncNativeNavigationClick(event) {
    const button = event.target?.closest?.("button");
    const path = nativeButtonPath(button);
    if (!path) return;
    queueMicrotask(() => {
      if (location.pathname !== path) replaceOrPush(path, false);
    });
  }

  function ready() {
    connect(window.NumeriaNavigation);
    dispatch();
  }

  window.NumeriaAppRoutes = {
    version: MARK,
    routes: ROUTES,
    dispatch,
    navigate: replaceOrPush,
    safeReturnPath,
    routeSpec,
    nativeButtonPath,
    get connectedApi() { return connectedApi; },
  };

  window.addEventListener("numeria-navigation-ready", ready);
  window.addEventListener("popstate", dispatch);
  document.addEventListener("click", syncNativeNavigationClick);
  let saveRoute = null;
  window.addEventListener("numeria-reading-draft-save-status", (event) => {
    if (event.detail?.state === "saving") {
      saveRoute = { sequence: dispatchSequence, path: location.pathname };
      return;
    }
    const sessionId = event.detail?.sessionId;
    if (event.detail?.state !== "saved" || !sessionId || !saveRoute) return;
    if (saveRoute.sequence !== dispatchSequence || saveRoute.path !== location.pathname) return;
    const spec = routeSpec();
    if (spec?.kind !== "reading-new" && !(spec?.kind === "reading-detail" && spec.sessionId === sessionId)) return;
    const path = `${ROUTES.readings}/${encodeURIComponent(sessionId)}`;
    // An ACK only updates the address. Re-fetching and resuming here would
    // replace edits made while the save was in flight with the older snapshot.
    history.replaceState({ numeriaRoute: path }, "", path);
    setRouteKind("reading-detail");
  });

  let lastApi = null;
  const timer = setInterval(() => {
    const api = window.NumeriaNavigation;
    if (api && api !== lastApi) {
      lastApi = api;
      connect(api);
      dispatch();
    }
    if (api?.version === "NumeriaNavigationBridge.v3") clearInterval(timer);
  }, 80);
  if (window.NumeriaNavigation) ready();
})();
