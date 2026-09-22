import appWorker from "./worker-entry.js";

const ADMIN_PREVIEW_CONTRACT_VERSION = "numeria-admin-developer-preview.v2";

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

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdminEmails(env = {}) {
  const raw = env.ADMIN_EMAILS
    || env.VITE_ADMIN_EMAILS
    || env.NUMERIA_ADMIN_EMAILS
    || "illusionddt@gmail.com";
  return parseCsv(raw).map((email) => email.toLowerCase());
}

function getAdminUserIds(env = {}) {
  return parseCsv(
    env.ADMIN_USER_IDS
      || env.NUMERIA_ADMIN_USER_IDS
      || env.CLERK_ADMIN_USER_IDS
      || "",
  );
}

function getClerkSecretKey(env = {}) {
  return env.CLERK_SECRET_KEY || env.CLERK_API_KEY || "";
}

function getClerkApiBase(env = {}) {
  return String(env.CLERK_API_BASE_URL || "https://api.clerk.com").replace(/\/$/, "");
}

function requestedWorkspaceId(request) {
  const url = new URL(request.url);
  return request.headers.get("X-Workspace-Id")
    || url.searchParams.get("workspaceId")
    || "ws_personal";
}

function authForwardHeaders(request, workspaceId) {
  const headers = new Headers();
  const authorization = request.headers.get("Authorization");
  const publishableKey = request.headers.get("X-Clerk-Publishable-Key");
  if (authorization) headers.set("Authorization", authorization);
  if (publishableKey) headers.set("X-Clerk-Publishable-Key", publishableKey);
  headers.set("X-Workspace-Id", workspaceId || "ws_personal");
  return headers;
}

async function resolveVerifiedClerkIdentity(request, env = {}, ctx = null) {
  const workspaceId = requestedWorkspaceId(request);
  const headers = authForwardHeaders(request, workspaceId);

  const authUrl = new URL(request.url);
  authUrl.pathname = "/auth/status";
  authUrl.search = "";
  const authResponse = await appWorker.fetch(new Request(authUrl.toString(), {
    method: "GET",
    headers,
  }), env, ctx);
  const authBody = await authResponse.clone().json().catch(() => ({}));

  if (!authResponse.ok || authBody.incomingRequestVerified !== true) {
    return {
      verified: false,
      workspaceId,
      userId: "",
      reason: authBody.incomingRequestVerificationReason || "clerk-session-not-verified",
    };
  }

  const usageUrl = new URL(request.url);
  usageUrl.pathname = "/api/usage";
  usageUrl.search = `?workspaceId=${encodeURIComponent(workspaceId)}`;
  const usageResponse = await appWorker.fetch(new Request(usageUrl.toString(), {
    method: "GET",
    headers,
  }), env, ctx);
  const usageBody = await usageResponse.clone().json().catch(() => ({}));
  const userId = String(usageBody.userId || "").trim();

  if (!usageResponse.ok || !userId || userId === "anonymous") {
    return {
      verified: false,
      workspaceId,
      userId: "",
      reason: usageBody.message || "authenticated-user-id-unavailable",
    };
  }

  return {
    verified: true,
    workspaceId,
    userId,
    reason: "clerk-session-verified",
  };
}

async function getClerkUserEmails(env = {}, userId = "") {
  const secretKey = getClerkSecretKey(env);
  if (!secretKey || !userId) {
    return {
      ok: false,
      emails: [],
      reason: secretKey ? "user-id-missing" : "clerk-secret-not-configured",
    };
  }

  try {
    const response = await fetch(`${getClerkApiBase(env)}/v1/users/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        emails: [],
        reason: `clerk-user-read-failed:${response.status}`,
      };
    }
    const body = await response.json();
    const emails = Array.isArray(body.email_addresses)
      ? body.email_addresses
        .map((entry) => String(entry?.email_address || "").trim().toLowerCase())
        .filter(Boolean)
      : [];
    return {
      ok: true,
      emails: Array.from(new Set(emails)),
      reason: "clerk-user-read-success",
    };
  } catch (error) {
    return {
      ok: false,
      emails: [],
      reason: `clerk-user-read-error:${error?.message || "unknown"}`,
    };
  }
}

async function resolveSecureAdminAccess(request, env = {}, ctx = null) {
  const identity = await resolveVerifiedClerkIdentity(request, env, ctx);
  if (!identity.verified) {
    return {
      ...identity,
      adminMode: false,
      adminEmail: "",
      identitySource: "none",
    };
  }

  const adminEmails = getAdminEmails(env);
  const adminUserIds = getAdminUserIds(env);

  if (adminUserIds.includes(identity.userId)) {
    return {
      ...identity,
      adminMode: true,
      adminEmail: adminEmails[0] || "illusionddt@gmail.com",
      identitySource: "clerk-user-id-allowlist",
    };
  }

  const clerkUser = await getClerkUserEmails(env, identity.userId);
  const matchedEmail = clerkUser.emails.find((email) => adminEmails.includes(email)) || "";
  if (matchedEmail) {
    return {
      ...identity,
      adminMode: true,
      adminEmail: matchedEmail,
      identitySource: "clerk-backend-email-allowlist",
    };
  }

  return {
    ...identity,
    adminMode: false,
    adminEmail: "",
    identitySource: clerkUser.ok ? "clerk-backend-email-not-allowed" : clerkUser.reason,
  };
}

function developerPreviewMetadata(access) {
  return {
    enabled: Boolean(access.adminMode && access.verified),
    entitlement: "developerPreview",
    identityVerified: Boolean(access.verified),
    identitySource: access.identitySource,
    authenticatedUserId: access.userId || null,
    subscriptionPlanUnaffected: true,
    previewPlans: ["free", "pro", "business"],
    businessPurchasable: false,
    usageLimitMode: "isolated-ui-preview",
    serverUsageBypassEnabled: false,
    message: "実契約プランを変更せず、管理者だけが開発中を含む機能表示を確認できます。利用量の正本は実契約のまま保持します。",
  };
}

async function handleSecureAdminRequest(request, env = {}, ctx = null) {
  const access = await resolveSecureAdminAccess(request, env, ctx);
  if (!access.adminMode) {
    return json({
      status: "error",
      appId: "numeria-studio",
      adminContractVersion: ADMIN_PREVIEW_CONTRACT_VERSION,
      adminMode: false,
      developerPreview: developerPreviewMetadata(access),
      errorCode: access.verified ? "ADMIN_ACCESS_REQUIRED" : "AUTH_SESSION_REQUIRED",
      message: access.verified
        ? "管理者権限を確認できませんでした。"
        : "Clerkのログインセッションを確認できませんでした。",
    }, { status: access.verified ? 403 : 401 });
  }

  const headers = new Headers(request.headers);
  headers.delete("X-Admin-Email");
  headers.set("X-Admin-Email", access.adminEmail);
  const proxiedRequest = new Request(request, { headers });
  const response = await appWorker.fetch(proxiedRequest, env, ctx);
  const body = await response.clone().json().catch(() => ({}));

  return json({
    ...body,
    adminContractVersion: ADMIN_PREVIEW_CONTRACT_VERSION,
    adminMode: true,
    adminEmail: access.adminEmail,
    developerPreview: developerPreviewMetadata(access),
  }, { status: response.status });
}

export default {
  async fetch(request, env = {}, ctx = null) {
    const url = new URL(request.url);
    if (["/api/admin/status", "/api/admin/account"].includes(url.pathname)
      && ["GET", "POST"].includes(request.method)) {
      return handleSecureAdminRequest(request, env, ctx);
    }
    return appWorker.fetch(request, env, ctx);
  },
};
