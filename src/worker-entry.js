import coreWorker from "./worker.js";

const WORKSPACE_STATE_CONTRACT_VERSION = "numeria-d1-workspace-state.v1";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function getD1Binding(env = {}) {
  return env.NUMERIA_DB || env.DB || env.D1 || null;
}

async function readJson(request) {
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeWorkspaceState(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    appraisal_profiles: Array.isArray(source.appraisal_profiles) ? source.appraisal_profiles : [],
    saved_presets: Array.isArray(source.saved_presets) ? source.saved_presets : [],
    feedback_items: Array.isArray(source.feedback_items) ? source.feedback_items : [],
    app_settings: source.app_settings && typeof source.app_settings === "object" && !Array.isArray(source.app_settings)
      ? source.app_settings
      : {},
    updated_at: new Date().toISOString(),
  };
}

function workspaceScopeKey(workspaceId, userId) {
  return `${workspaceId || "ws_personal"}:${userId || "anonymous"}`;
}

async function handleWorkspaceStateStatus(env = {}) {
  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") {
    return json({
      status: "error",
      storageDriver: "unavailable",
      durable: false,
      tableReady: false,
      sourceOfTruth: "numeria-d1-workspace-state",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
      userDataReturned: false,
      errorCode: "D1_WORKSPACE_STATE_UNAVAILABLE",
    }, { status: 503 });
  }

  try {
    const row = await d1.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'workspace_states' LIMIT 1"
    ).first();
    const tableReady = row?.name === "workspace_states";
    return json({
      status: tableReady ? "success" : "error",
      storageDriver: "durable-d1",
      durable: tableReady,
      tableReady,
      sourceOfTruth: "numeria-d1-workspace-state",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
      userDataReturned: false,
      ...(tableReady ? {} : { errorCode: "WORKSPACE_STATE_TABLE_MISSING" }),
    }, { status: tableReady ? 200 : 503 });
  } catch {
    return json({
      status: "error",
      storageDriver: "durable-d1",
      durable: false,
      tableReady: false,
      sourceOfTruth: "numeria-d1-workspace-state",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
      userDataReturned: false,
      errorCode: "WORKSPACE_STATE_STATUS_FAILED",
    }, { status: 503 });
  }
}

async function resolveAuthenticatedScope(request, env, ctx, requestedWorkspaceId) {
  const usageUrl = new URL(request.url);
  usageUrl.pathname = "/api/usage";
  usageUrl.search = `?workspaceId=${encodeURIComponent(requestedWorkspaceId || "ws_personal")}`;
  const usageRequest = new Request(usageUrl.toString(), {
    method: "GET",
    headers: new Headers(request.headers),
  });
  const usageResponse = await coreWorker.fetch(usageRequest, env, ctx);
  const usageBody = await usageResponse.clone().json().catch(() => ({}));
  if (!usageResponse.ok) {
    return {
      response: json(usageBody, { status: usageResponse.status }),
      scope: null,
    };
  }
  return {
    response: null,
    scope: {
      workspaceId: usageBody.workspaceId || requestedWorkspaceId || "ws_personal",
      userId: usageBody.userId || "anonymous",
    },
  };
}

async function handleWorkspaceState(request, env = {}, ctx = null) {
  const body = await readJson(request);
  const url = new URL(request.url);
  const requestedWorkspaceId = body.workspaceId
    || request.headers.get("X-Workspace-Id")
    || url.searchParams.get("workspaceId")
    || "ws_personal";
  const { response: authResponse, scope } = await resolveAuthenticatedScope(request, env, ctx, requestedWorkspaceId);
  if (authResponse) return authResponse;

  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") {
    return json({
      status: "error",
      errorCode: "D1_WORKSPACE_STATE_UNAVAILABLE",
      message: "クラウド保存先を確認できません。端末保存を維持します。",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
      sourceOfTruth: "numeria-d1-workspace-state",
    }, { status: 503 });
  }

  const key = workspaceScopeKey(scope.workspaceId, scope.userId);

  if (request.method === "GET") {
    const row = await d1.prepare(
      `SELECT workspace_state_json, updated_at FROM workspace_states WHERE scope_key = ? LIMIT 1`
    ).bind(key).first();
    return json({
      status: "success",
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      workspaceState: row?.workspace_state_json ? JSON.parse(row.workspace_state_json) : null,
      updatedAt: row?.updated_at || null,
      sourceOfTruth: "numeria-d1-workspace-state",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
      initializationRequired: !row,
    });
  }

  if (request.method === "PUT") {
    const workspaceState = normalizeWorkspaceState(body.workspaceState || body);
    const serialized = JSON.stringify(workspaceState);
    if (serialized.length > 4_000_000) {
      return json({
        status: "error",
        errorCode: "WORKSPACE_STATE_TOO_LARGE",
        message: "保存データが大きすぎます。バックアップを保存してから不要な履歴や画像を整理してください。",
      }, { status: 413 });
    }
    const now = new Date().toISOString();
    await d1.prepare(`
      INSERT INTO workspace_states (
        scope_key, workspace_id, user_id, workspace_state_json, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        workspace_state_json = excluded.workspace_state_json,
        updated_at = excluded.updated_at
    `).bind(
      key,
      scope.workspaceId,
      scope.userId,
      serialized,
      now,
    ).run();
    return json({
      status: "success",
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      workspaceState,
      updatedAt: now,
      sourceOfTruth: "numeria-d1-workspace-state",
      workspaceStateContractVersion: WORKSPACE_STATE_CONTRACT_VERSION,
    });
  }

  return json({ status: "error", errorCode: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

export default {
  async fetch(request, env = {}, ctx = null) {
    const url = new URL(request.url);
    if (url.pathname === "/workspace-state/status" && request.method === "GET") {
      return handleWorkspaceStateStatus(env);
    }
    if (url.pathname === "/api/workspace-state" && ["GET", "PUT"].includes(request.method)) {
      return handleWorkspaceState(request, env, ctx);
    }
    return coreWorker.fetch(request, env, ctx);
  },
};
