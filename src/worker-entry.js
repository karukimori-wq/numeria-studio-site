import coreWorker from "./worker.js";
import { REPORT_PAGE_DEFINITION_IDS, reportPageDefinitionsFor } from "./report-page-definitions.js";

const WORKSPACE_STATE_CONTRACT_VERSION = "numeria-d1-workspace-state.v1";
const USER_PREFERENCES_CONTRACT_VERSION = "numeria-d1-user-preferences.v1";
const REPORT_FORMAT_CONTRACT_VERSION = "numeria-report-format.v3";
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

async function tableStatusResponse(env, tableName, contractVersion, contractField, sourceOfTruth) {
  const contractMetadata = {
    contractVersion,
    [contractField]: contractVersion,
  };
  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") {
    return json({
      status: "error",
      storageDriver: "unavailable",
      durable: false,
      tableReady: false,
      sourceOfTruth,
      ...contractMetadata,
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
      ...contractMetadata,
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
      ...contractMetadata,
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
    "workspaceStateContractVersion",
    "numeria-d1-workspace-state",
  );
}

async function handleUserPreferencesStatus(env = {}) {
  return tableStatusResponse(
    env,
    "user_preferences",
    USER_PREFERENCES_CONTRACT_VERSION,
    "userPreferencesContractVersion",
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
      planId: usageBody.planId || "free",
    },
  };
}

function validReportFormat(value, pageLimit = Infinity) {
  if (!value || typeof value !== "object" || value.schemaVersion !== 3 || !Array.isArray(value.pages) || !value.pages.length || value.pages.length > pageLimit) return false;
  const types = new Set(["page-title", "heading", "body", "ai-text", "divider", "numerology-result", "tarot-cards"]);
  return value.pages.every((page) =>
    page && typeof page.pageId === "string" && Array.isArray(page.layoutRegions) && page.layoutRegions.every((region) =>
      region && [1, 2].includes(region.columns) && Array.isArray(region.columnBlocks)
      && region.columnBlocks.length === region.columns
      && region.columnBlocks.every((column) => Array.isArray(column) && column.every((block) =>
        block && typeof block.blockId === "string" && types.has(block.type) && typeof block.content === "string"
      ))
    ) && (page.pageDefinitionId == null || (typeof page.pageDefinitionId === "string" && REPORT_PAGE_DEFINITION_IDS.has(page.pageDefinitionId)))
  );
}

async function handleReportFormat(request, env = {}, ctx = null) {
  const body = await readJson(request);
  const requestedWorkspaceId = request.headers.get("X-Workspace-Id") || "ws_personal";
  const { response: authResponse, scope } = await resolveAuthenticatedScope(request, env, ctx, requestedWorkspaceId);
  if (authResponse) return authResponse;
  const d1 = getD1Binding(env);
  if (!d1 || typeof d1.prepare !== "function") return json({ status: "error", errorCode: "REPORT_FORMAT_STORE_UNAVAILABLE" }, { status: 503 });
  const key = workspaceScopeKey(scope.workspaceId, scope.userId);
  const pageLimit = scope.planId === "pro" ? 30 : 3;
  const row = await d1.prepare("SELECT workspace_state_json FROM workspace_states WHERE scope_key = ? LIMIT 1").bind(key).first();
  let state = {};
  try { state = row?.workspace_state_json ? JSON.parse(row.workspace_state_json) : {}; } catch { state = {}; }
  const settings = state.app_settings && typeof state.app_settings === "object" ? state.app_settings : {};
  const meta = settings.report_format_blocks_v3_meta || { revision: 0 };
  const backups = Array.isArray(settings.report_format_blocks_v3_backups) ? settings.report_format_blocks_v3_backups : [];
  const persist = async (format, revision, nextBackups) => {
    const updatedAt = new Date().toISOString();
    const workspaceState = normalizeWorkspaceState({ ...state, app_settings: { ...settings, report_format_blocks_v3: format, report_format_blocks_v3_meta: { revision, updatedAt, schemaVersion: 3 }, report_format_blocks_v3_backups: nextBackups } });
    await d1.prepare(`INSERT INTO workspace_states (scope_key, workspace_id, user_id, workspace_state_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(scope_key) DO UPDATE SET workspace_state_json = excluded.workspace_state_json, updated_at = excluded.updated_at`).bind(key, scope.workspaceId, scope.userId, JSON.stringify(workspaceState), workspaceState.updated_at).run();
    return updatedAt;
  };
  if (request.method === "GET") return json({ status: "success", format: settings.report_format_blocks_v3 || null, revision: Number(meta.revision || 0), pageLimit, backups: backups.map(({ backupId, revision, createdAt }) => ({ backupId, revision, createdAt })), reportFormatContractVersion: REPORT_FORMAT_CONTRACT_VERSION, sourceOfTruth: "numeria-d1-report-format" });
  if (request.method === "POST") {
    const target = backups.find((backup) => backup?.backupId === String(body.backupId || ""));
    if (!target?.format || !validReportFormat(target.format)) return json({ status: "error", errorCode: "REPORT_FORMAT_BACKUP_NOT_FOUND", message: "復元対象のバックアップが見つかりません。" }, { status: 404 });
    const expectedRevision = Number(body.expectedRevision || 0);
    if (expectedRevision !== Number(meta.revision || 0)) return json({ status: "error", errorCode: "REPORT_FORMAT_CONFLICT", message: "別の編集内容が保存されています。再読み込みしてから復元してください。", revision: Number(meta.revision || 0) }, { status: 409 });
    const current = settings.report_format_blocks_v3;
    const rollbackBackup = current ? [{ backupId: `backup_${Date.now()}_${meta.revision}`, revision: Number(meta.revision || 0), createdAt: new Date().toISOString(), format: current }, ...backups.filter((backup) => backup.backupId !== target.backupId)].slice(0, 20) : backups.filter((backup) => backup.backupId !== target.backupId);
    const revision = expectedRevision + 1;
    await persist(target.format, revision, rollbackBackup);
    return json({ status: "success", format: target.format, revision, restoredFromBackupId: target.backupId, reportFormatContractVersion: REPORT_FORMAT_CONTRACT_VERSION, sourceOfTruth: "numeria-d1-report-format" });
  }
  if (!validReportFormat(body.format, pageLimit)) return json({ status: "error", errorCode: "REPORT_FORMAT_INVALID", message: `鑑定書フォーマットの構造とページ上限（${pageLimit}件）を確認してください。` }, { status: 400 });
  const expectedRevision = Number(body.expectedRevision || 0);
  if (expectedRevision !== Number(meta.revision || 0)) return json({ status: "error", errorCode: "REPORT_FORMAT_CONFLICT", message: "別の編集内容が保存されています。再読み込みしてから保存してください。", revision: Number(meta.revision || 0), format: settings.report_format_blocks_v3 || null }, { status: 409 });
  const revision = expectedRevision + 1;
  const current = settings.report_format_blocks_v3;
  const nextBackups = current ? [{ backupId: `backup_${Date.now()}_${meta.revision}`, revision: Number(meta.revision || 0), createdAt: new Date().toISOString(), format: current }, ...backups].slice(0, 20) : backups;
  await persist(body.format, revision, nextBackups);
  return json({ status: "success", format: body.format, revision, pageLimit, reportFormatContractVersion: REPORT_FORMAT_CONTRACT_VERSION, sourceOfTruth: "numeria-d1-report-format" });
}

async function handleReportPageDefinitions(request, env = {}, ctx = null) {
  const requestedWorkspaceId = request.headers.get("X-Workspace-Id") || "ws_personal";
  const { response: authResponse, scope } = await resolveAuthenticatedScope(request, env, ctx, requestedWorkspaceId);
  if (authResponse) return authResponse;
  const methodKey = normalizeDivination(new URL(request.url).searchParams.get("methodKey"), "");
  if (!ALLOWED_DIVINATIONS.has(methodKey)) return json({ status: "error", errorCode: "REPORT_PAGE_DEFINITION_METHOD_INVALID" }, { status: 400 });
  const planId = scope.planId === "pro" ? "pro" : "free";
  return json({
    status: "success",
    methodKey,
    planId,
    definitions: reportPageDefinitionsFor(methodKey, planId),
    sourceOfTruth: "numeria-report-page-catalog",
  });
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
    if (url.pathname === "/api/report-formats/default" && ["GET", "PUT", "POST"].includes(request.method)) {
      return handleReportFormat(request, env, ctx);
    }
    if (url.pathname === "/api/report-page-definitions" && request.method === "GET") {
      return handleReportPageDefinitions(request, env, ctx);
    }
    if (url.pathname === "/api/user-preferences" && ["GET", "PUT", "PATCH"].includes(request.method)) {
      return handleUserPreferences(request, env, ctx);
    }
    return coreWorker.fetch(request, env, ctx);
  },
};
