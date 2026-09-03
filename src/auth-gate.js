import { FEATURE_LABELS, PLAN_CONFIG } from "./plan-config.js";

const appState = {
  clerk: null,
  usage: null,
  publishableKeyReady: false,
  authReady: false,
};

const els = {
  shell: document.querySelector(".auth-shell"),
  loading: document.getElementById("loading-panel"),
  signedOut: document.getElementById("signed-out-panel"),
  signedIn: document.getElementById("signed-in-panel"),
  email: document.getElementById("signed-in-email"),
  signIn: document.getElementById("sign-in-button"),
  signUp: document.getElementById("sign-up-button"),
  signOut: document.getElementById("sign-out-button"),
  planMenu: document.getElementById("open-plan-menu"),
  billingDialog: document.getElementById("billing-dialog"),
  usageSummary: document.getElementById("usage-summary"),
  planGrid: document.getElementById("plan-grid"),
};

function setVisible(state) {
  els.shell.dataset.authState = state;
  els.loading.hidden = state !== "loading";
  els.signedOut.hidden = state !== "signed-out";
  els.signedIn.hidden = state !== "signed-in";
}

function getScope() {
  const user = appState.clerk?.user;
  const email = user?.primaryEmailAddress?.emailAddress || "anonymous";
  return {
    workspaceId: user?.organizationMemberships?.[0]?.organization?.id || "ws_personal",
    userId: user?.id || email,
  };
}

async function api(path, options = {}) {
  const scope = getScope();
  const headers = {
    "Content-Type": "application/json",
    "X-Workspace-Id": scope.workspaceId,
    "X-User-Id": scope.userId,
    ...options.headers,
  };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.errorCode || "API request failed");
  }
  return data;
}

async function loadAuthConfig() {
  const localKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (localKey) return localKey;

  const response = await fetch("/api/auth/config");
  const config = await response.json();
  return config.publishableKey;
}

function renderSignedOut(message) {
  setVisible("signed-out");
  const note = document.querySelector(".auth-note");
  if (message) note.textContent = message;
}

function renderSignedIn() {
  const user = appState.clerk.user;
  const email = user?.primaryEmailAddress?.emailAddress || "ログイン済み";
  els.email.textContent = email;
  setVisible("signed-in");
  loadUsage().catch(() => {});
}

async function loadUsage() {
  const data = await api("/api/usage");
  appState.usage = data.usage;
  renderBilling();
}

function renderBilling() {
  const usage = appState.usage;
  if (!usage) {
    els.usageSummary.textContent = "利用状況を読み込んでいます…";
    return;
  }

  const appraisalLimit = usage.entitlements.monthlyAppraisals;
  const clientLimit = usage.entitlements.appraisalClients;
  els.usageSummary.innerHTML = `
    <strong>現在のプラン: ${usage.planName}</strong>
    <span>今月の鑑定数: ${usage.monthlyAppraisals}${appraisalLimit === null ? " / 無制限" : ` / ${appraisalLimit}`}</span>
    <span>鑑定対象者: ${usage.appraisalClients}${clientLimit === null ? " / 無制限" : ` / ${clientLimit}`}</span>
  `;

  els.planGrid.innerHTML = Object.values(PLAN_CONFIG).map((plan) => {
    const isCurrent = usage.planId === plan.id;
    const disabled = plan.id === "business";
    const highlights = Object.entries(plan.entitlements)
      .filter(([, enabled]) => enabled === true)
      .slice(0, 5)
      .map(([key]) => FEATURE_LABELS[key] || key);
    return `
      <article class="plan-card ${isCurrent ? "is-current" : ""}">
        <p class="auth-kicker">${plan.id.toUpperCase()}</p>
        <h3>${plan.name}</h3>
        <strong>${plan.headline}</strong>
        <p>${plan.description}</p>
        <ul>
          ${highlights.map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <button
          type="button"
          data-plan-id="${plan.id}"
          ${isCurrent || disabled ? "disabled" : ""}
        >
          ${disabled ? "準備中" : isCurrent ? "現在のプラン" : `${plan.name}へ切り替え`}
        </button>
      </article>
    `;
  }).join("");
}

async function changePlan(planId) {
  const data = await api("/api/billing/subscription", {
    method: "PATCH",
    body: JSON.stringify({ planId }),
  });
  appState.usage = data.usage;
  renderBilling();
}

async function init() {
  setVisible("loading");
  const publishableKey = await loadAuthConfig();
  if (!publishableKey) {
    renderSignedOut("ログイン設定の反映待ちです。設定が反映されるとログインできます。");
    return;
  }

  appState.publishableKeyReady = true;
  const { Clerk } = await import(/* @vite-ignore */ "https://esm.sh/@clerk/clerk-js@6");
  appState.clerk = new Clerk(publishableKey);
  await appState.clerk.load();
  appState.authReady = true;

  if (appState.clerk.user) {
    renderSignedIn();
  } else {
    renderSignedOut();
  }
}

els.signIn.addEventListener("click", () => {
  if (!appState.authReady) {
    renderSignedOut("ログイン準備中です。少し待ってからもう一度お試しください。");
    return;
  }
  appState.clerk.openSignIn({ afterSignInUrl: "/" });
});

els.signUp.addEventListener("click", () => {
  if (!appState.authReady) {
    renderSignedOut("新規登録の準備中です。少し待ってからもう一度お試しください。");
    return;
  }
  appState.clerk.openSignUp({ afterSignUpUrl: "/" });
});

els.signOut.addEventListener("click", async () => {
  await appState.clerk.signOut();
  renderSignedOut("ログアウトしました。");
});

els.planMenu.addEventListener("click", async () => {
  els.billingDialog.showModal();
  await loadUsage();
});

els.planGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-plan-id]");
  if (!button || button.disabled) return;
  button.textContent = "更新中…";
  button.disabled = true;
  try {
    await changePlan(button.dataset.planId);
  } catch (error) {
    els.usageSummary.textContent = error.message;
    renderBilling();
  }
});

init().catch((error) => {
  console.error(error);
  renderSignedOut("ログイン準備に失敗しました。時間をおいて再読み込みしてください。");
});
