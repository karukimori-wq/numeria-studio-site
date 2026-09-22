import coreWorker from "./worker.js";

const WORKSPACE_STATE_CONTRACT_VERSION = "numeria-d1-workspace-state.v1";
const USER_PREFERENCES_CONTRACT_VERSION = "numeria-d1-user-preferences.v1";
const ALLOWED_DIVINATIONS = new Set([
  "numerology",
  "nine-star-ki",
  "four-pillars",
  "western-astrology",
  "zi-wei-dou-shu",
  "tarot",
]);

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

function normalizeDivination(value, fallback = "numerology") {
  const normalized = String(value || "").trim();
  return ALLOWED_DIVINATIONS.has(normalized) ? normalized : fallback;
}

function normalizeUserPreferences(input = {}, current = {}) {
  const primaryDivination = normalizeDivination(
    input.primary_divination ?? input.primaryDivination ?? current.primary_divination,
    "numerology",
  );
  const enabledInput = input.enabled_divinations ?? input.enabledDivinations ?? current.enabled_divinations;
  const enabledDivinations = Array.from(new Set(
    (Array.isArray(enabledInput) ? enabledInput : [primaryDivination])
      .map((value) => normalizeDivination(value, ""))
      .filter(Boolean),
  ));
  if (!enabledDivinations.includes(primaryDivination)) enabledDivinations.unshift(primaryDivination);
  return {
    primary_divination: primaryDivination,
    enabled_divinations: enabledDivinations.length ? enabledDivinations : [primaryDivination],
  };
}

function workspaceScopeKey(workspaceId, userId) {
  return `${workspaceId || "ws_personal"}:${userId || "anonymous"}`;
}

async function tableStatusResponse(env, tableName, contractVersion, sourceOfTruth) {
  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") {
    return json({
      status: "error",
      storageDriver: "unavailable",
      durable: false,
      tableReady: false,
      sourceOfTruth,
      contractVersion,
      userDataReturned: false,
      errorCode: "D1_UNAVAILABLE",
    }, { status: 503 });
  }

  try {
    const row = await d1.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    ).bind(tableName).first();
    const tableReady = row?.name === tableName;
    return json({
      status: tableReady ? "success" : "error",
      storageDriver: "durable-d1",
      durable: tableReady,
      tableReady,
      sourceOfTruth,
      contractVersion,
      userDataReturned: false,
      ...(tableReady ? {} : { errorCode: "D1_TABLE_MISSING" }),
    }, { status: tableReady ? 200 : 503 });
  } catch {
    return json({
      status: "error",
      storageDriver: "durable-d1",
      durable: false,
      tableReady: false,
      sourceOfTruth,
      contractVersion,
      userDataReturned: false,
      errorCode: "D1_STATUS_FAILED",
    }, { status: 503 });
  }
}

async function handleWorkspaceStateStatus(env = {}) {
  return tableStatusResponse(
    env,
    "workspace_states",
    WORKSPACE_STATE_CONTRACT_VERSION,
    "numeria-d1-workspace-state",
  );
}

async function handleUserPreferencesStatus(env = {}) {
  return tableStatusResponse(
    env,
    "user_preferences",
    USER_PREFERENCES_CONTRACT_VERSION,
    "numeria-d1-user-preferences",
  );
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

async function handleUserPreferences(request, env = {}, ctx = null) {
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
      errorCode: "D1_USER_PREFERENCES_UNAVAILABLE",
      message: "占術設定の保存先を確認できません。",
      userPreferencesContractVersion: USER_PREFERENCES_CONTRACT_VERSION,
      sourceOfTruth: "numeria-d1-user-preferences",
    }, { status: 503 });
  }

  const key = workspaceScopeKey(scope.workspaceId, scope.userId);
  const row = await d1.prepare(
    `SELECT primary_divination, enabled_divinations_json, updated_at
       FROM user_preferences WHERE scope_key = ? LIMIT 1`
  ).bind(key).first();

  if (request.method === "GET") {
    const preferences = row
      ? normalizeUserPreferences({
          primary_divination: row.primary_divination,
          enabled_divinations: (() => {
            try { return JSON.parse(row.enabled_divinations_json || "[]"); } catch { return []; }
          })(),
        })
      : normalizeUserPreferences({});
    return json({
      status: "success",
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      preferences,
      updatedAt: row?.updated_at || null,
      sourceOfTruth: "numeria-d1-user-preferences",
      userPreferencesContractVersion: USER_PREFERENCES_CONTRACT_VERSION,
      initializationRequired: !row,
      planStoredHere: false,
      roleStoredHere: false,
    });
  }

  if (["PUT", "PATCH"].includes(request.method)) {
    const current = row
      ? {
          primary_divination: row.primary_divination,
          enabled_divinations: (() => {
            try { return JSON.parse(row.enabled_divinations_json || "[]"); } catch { return []; }
          })(),
        }
      : {};
    const preferences = normalizeUserPreferences(body.preferences || body, current);
    const now = new Date().toISOString();
    await d1.prepare(`
      INSERT INTO user_preferences (
        scope_key, workspace_id, user_id, primary_divination, enabled_divinations_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        primary_divination = excluded.primary_divination,
        enabled_divinations_json = excluded.enabled_divinations_json,
        updated_at = excluded.updated_at
    `).bind(
      key,
      scope.workspaceId,
      scope.userId,
      preferences.primary_divination,
      JSON.stringify(preferences.enabled_divinations),
      now,
    ).run();
    return json({
      status: "success",
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      preferences,
      updatedAt: now,
      sourceOfTruth: "numeria-d1-user-preferences",
      userPreferencesContractVersion: USER_PREFERENCES_CONTRACT_VERSION,
      planStoredHere: false,
      roleStoredHere: false,
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
    if (url.pathname === "/user-preferences/status" && request.method === "GET") {
      return handleUserPreferencesStatus(env);
    }
    if (url.pathname === "/api/workspace-state" && ["GET", "PUT"].includes(request.method)) {
      return handleWorkspaceState(request, env, ctx);
    }
    if (url.pathname === "/api/user-preferences" && ["GET", "PUT", "PATCH"].includes(request.method)) {
      return handleUserPreferences(request, env, ctx);
    }
    return coreWorker.fetch(request, env, ctx);
  },
};
