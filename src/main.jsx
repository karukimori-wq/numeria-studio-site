import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/react";
import {
  CheckCircle2,
  ClipboardList,
  Crown,
  FileText,
  LifeBuoy,
  Lock,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  FEATURE_LABELS,
  PLAN_CONFIG,
  PLAN_IDS,
  createUsageSnapshot,
  evaluateUsageLimit,
  getPlanPrice,
  isUnlimited,
} from "./plan-config.js";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkApplicationId = import.meta.env.VITE_CLERK_APPLICATION_ID || "app_3ImOuQXNBc9Rpqs3XoJEtw2NogR";
const appVersion = import.meta.env.VITE_APP_VERSION || "0.3.0-free-pro-release";
const feedbackApiBase = import.meta.env.VITE_FEEDBACK_HUB_BASE_URL || "";
const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "illusionddt@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function getDeviceLabel() {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

async function apiRequest(path, { method = "GET", scope, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (scope?.workspaceId) headers["X-Workspace-Id"] = scope.workspaceId;
  if (scope?.userId) headers["X-User-Id"] = scope.userId;
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify({ ...body, ...scope }) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.data = data;
    throw error;
  }
  return data;
}

function App() {
  if (!clerkPublishableKey) {
    return <ClerkSetupScreen />;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <StudioShell />
    </ClerkProvider>
  );
}

function StudioShell() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Numeria Studio</p>
          <h1>Free / Proで鑑定とレポートを始める</h1>
        </div>
        <div className="auth-actions">
          {isLoaded && !isSignedIn && (
            <>
              <SignInButton mode="modal">
                <button className="button ghost">ログイン</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="button primary">新規登録</button>
              </SignUpButton>
            </>
          )}
          {isLoaded && isSignedIn && <UserButton />}
        </div>
      </header>

      {!isLoaded && <LoadingPanel />}
      {isLoaded && !isSignedIn && <SignedOutHome />}
      {isLoaded && isSignedIn && <SignedInWorkspace />}
    </main>
  );
}

function LoadingPanel() {
  return (
    <section className="hero-grid">
      <div className="hero-panel">
        <div className="icon-pill">
          <Lock size={18} />
          Clerk Auth
        </div>
        <h2>認証状態を確認しています</h2>
        <p>Clerkのセッションを読み込んでいます。</p>
      </div>
      <StatusPanel />
    </section>
  );
}

function SignedOutHome() {
  return (
    <section className="landing-grid">
      <div className="hero-panel">
        <div className="icon-pill">
          <Lock size={18} />
          Clerk Auth
        </div>
        <h2>ログインすると利用量とプランを確認できます</h2>
        <p>
          Freeでは月20件までの鑑定と3名までの鑑定対象者管理を無料で試せます。
          Proでは件数を気にせず、PDF出力やブランド入りレポートも使える設計です。
        </p>
        <div className="hero-actions">
          <SignInButton mode="modal">
            <button className="button primary large">ログイン</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="button secondary large">新規登録</button>
          </SignUpButton>
        </div>
      </div>
      <PlanComparison />
    </section>
  );
}

function SignedInWorkspace() {
  const { user } = useUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdmin = adminEmails.includes(primaryEmail);
  const workspaceId = user?.organizationMemberships?.[0]?.organization?.id || "ws_personal";
  const userId = user?.id || "unknown";
  const scope = useMemo(() => ({ workspaceId, userId }), [workspaceId, userId]);
  const [usage, setUsage] = useState(createUsageSnapshot());
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUsage() {
    setLoading(true);
    try {
      const response = await apiRequest("/api/usage", { scope });
      setUsage(response.usage);
      setNotice(null);
    } catch {
      setUsage(createUsageSnapshot());
      setNotice({
        type: "warning",
        title: "利用量APIを確認できませんでした",
        body: "一時的にFreeの初期状態として表示しています。Cloudflare Worker APIが復旧すると同期されます。",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUsage();
  }, [scope]);

  async function startSession() {
    try {
      const response = await apiRequest("/api/sessions/start", { method: "POST", scope });
      setUsage(response.usage);
      setNotice({
        type: "success",
        title: "鑑定セッションを開始しました",
        body: `今月の鑑定数は ${formatLimit(response.usage.monthlyAppraisals, response.usage.entitlements.monthlyAppraisals)} です。`,
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
      if (error.data?.usage) setUsage(error.data.usage);
    }
  }

  async function addAppraisalClient() {
    try {
      const response = await apiRequest("/api/appraisal-clients", { method: "POST", scope });
      setUsage(response.usage);
      setNotice({
        type: "success",
        title: "鑑定対象者を追加しました",
        body: `鑑定対象者は ${formatLimit(response.usage.appraisalClients, response.usage.entitlements.appraisalClients)} です。`,
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
      if (error.data?.usage) setUsage(error.data.usage);
    }
  }

  async function changePlan(planId) {
    try {
      const response = await apiRequest("/api/billing/subscription", {
        method: "PATCH",
        scope,
        body: { planId },
      });
      setUsage(response.usage);
      setNotice({
        type: "success",
        title: `${PLAN_CONFIG[planId].name}へ反映しました`,
        body: planId === PLAN_IDS.PRO
          ? "鑑定件数と鑑定対象者管理が上限なしになりました。"
          : "Freeプランへ戻しました。上限は即時に反映されます。",
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
    }
  }

  const sessionDecision = evaluateUsageLimit(usage, "start_appraisal");
  const clientDecision = evaluateUsageLimit(usage, "create_appraisal_client");

  return (
    <>
      <section className="workspace-grid">
        <div className="work-panel">
          <div className="panel-heading">
            <Sparkles size={20} />
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>鑑定ワークスペース</h2>
            </div>
          </div>
          <PlanBadge usage={usage} />
          <div className="stat-grid">
            <UsageCard
              icon={<FileText size={18} />}
              label="今月の鑑定数"
              current={usage.monthlyAppraisals}
              limit={usage.entitlements.monthlyAppraisals}
            />
            <UsageCard
              icon={<Users size={18} />}
              label="鑑定対象者"
              current={usage.appraisalClients}
              limit={usage.entitlements.appraisalClients}
            />
            <StatCard label="Identity" value="workspaceId + userId" />
          </div>
          {notice && <Notice {...notice} />}
          <div className="action-row">
            <button className="button primary" onClick={startSession} disabled={!sessionDecision.allowed}>
              セッションを始める
            </button>
            <button className="button secondary" onClick={addAppraisalClient} disabled={!clientDecision.allowed}>
              鑑定対象者を追加
            </button>
            <button className="button ghost" onClick={refreshUsage} disabled={loading}>
              利用量を更新
            </button>
          </div>
        </div>

        <BillingPanel
          usage={usage}
          onUpgrade={() => changePlan(PLAN_IDS.PRO)}
          onDowngrade={() => changePlan(PLAN_IDS.FREE)}
        />

        <PlanComparison currentPlanId={usage.planId} onSelectPlan={changePlan} />

        <div className="work-panel">
          <div className="panel-heading">
            <ClipboardList size={20} />
            <div>
              <p className="eyebrow">Admin</p>
              <h2>管理者状態</h2>
            </div>
          </div>
          <dl className="identity-list">
            <div>
              <dt>Email</dt>
              <dd>{primaryEmail || "未取得"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{isAdmin ? "admin" : "member"}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{userId}</dd>
            </div>
          </dl>
          <p className="note">
            MVP表示では `illusionddt@gmail.com` を管理者候補として扱います。保護された管理機能はWorker側でClerk JWTを検証する段階で確定します。
          </p>
        </div>
      </section>

      <FeedbackWidget workspaceId={workspaceId} userId={userId} screenName="Free Pro Dashboard" />
    </>
  );
}

function PlanBadge({ usage }) {
  return (
    <div className="plan-badge">
      <Crown size={18} />
      <div>
        <span>現在のプラン</span>
        <strong>{usage.planName}</strong>
      </div>
    </div>
  );
}

function UsageCard({ icon, label, current, limit }) {
  return (
    <div className="stat-card usage-card">
      <span>{icon}{label}</span>
      <strong>{formatLimit(current, limit)}</strong>
    </div>
  );
}

function BillingPanel({ usage, onUpgrade, onDowngrade }) {
  const isPro = usage.planId === PLAN_IDS.PRO;
  return (
    <div className="work-panel billing-panel">
      <div className="panel-heading">
        <Crown size={20} />
        <div>
          <p className="eyebrow">Billing</p>
          <h2>契約・請求状態</h2>
        </div>
      </div>
      <dl className="identity-list">
        <div>
          <dt>Plan</dt>
          <dd>{usage.planName}</dd>
        </div>
        <div>
          <dt>Billing period</dt>
          <dd>{usage.billingMonth} / {usage.billingAnchor}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{isPro ? "active" : "free"}</dd>
        </div>
      </dl>
      <p className="note">
        料金は設定値で管理します。Businessは今回購入不可で、将来のGrowth Engine連携用分岐だけ残しています。
      </p>
      <div className="action-row">
        {!isPro && <button className="button primary" onClick={onUpgrade}>Proへアップグレード</button>}
        {isPro && <button className="button secondary" onClick={onDowngrade}>Freeへ戻す</button>}
      </div>
    </div>
  );
}

function PlanComparison({ currentPlanId, onSelectPlan }) {
  const plans = [PLAN_CONFIG.free, PLAN_CONFIG.pro, PLAN_CONFIG.business];
  return (
    <section className="pricing-panel">
      <div className="panel-heading">
        <Search size={20} />
        <div>
          <p className="eyebrow">Plans</p>
          <h2>料金・プラン比較</h2>
        </div>
      </div>
      <div className="plan-grid">
        {plans.map((plan) => (
          <article className={`plan-card ${plan.id === currentPlanId ? "current" : ""}`} key={plan.id}>
            <div>
              <span className="plan-kicker">{plan.headline}</span>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
              <strong className="price-label">{getPlanPrice(plan, import.meta.env)}</strong>
            </div>
            <FeatureList plan={plan} />
            {onSelectPlan && (
              <button
                className={plan.id === PLAN_IDS.PRO ? "button primary" : "button secondary"}
                disabled={!plan.available || plan.id === currentPlanId}
                onClick={() => onSelectPlan(plan.id)}
              >
                {plan.id === currentPlanId ? "現在利用中" : plan.available ? `${plan.name}を選ぶ` : "準備中"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureList({ plan }) {
  const features = Object.entries(FEATURE_LABELS).filter(([key]) => plan.entitlements[key]);
  return (
    <ul className="feature-list">
      {features.slice(0, 8).map(([key, label]) => (
        <li key={key}>
          <CheckCircle2 size={16} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function FeedbackWidget({ workspaceId, userId, screenName }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");

  const route = window.location.pathname;
  const payload = useMemo(
    () => ({
      appId: "numeria-studio",
      appName: "Numeria Studio",
      workspaceId,
      userId,
      route,
      screenName,
      appVersion,
      device: getDeviceLabel(),
      browser: navigator.userAgent,
      occurredAt: new Date().toISOString(),
      initialMessage: message,
    }),
    [message, route, screenName, userId, workspaceId],
  );

  async function submitFeedback(event) {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");

    if (!feedbackApiBase) {
      localStorage.setItem("numeria.feedback.mock.last", JSON.stringify(payload));
      setStatus("mocked");
      return;
    }

    try {
      const response = await fetch(`${feedbackApiBase}/api/embed/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(response.ok ? "sent" : "needs_followup");
    } catch {
      localStorage.setItem("numeria.feedback.mock.last", JSON.stringify(payload));
      setStatus("mocked");
    }
  }

  return (
    <div className={`feedback ${open ? "open" : ""}`}>
      <button className="feedback-button" onClick={() => setOpen((value) => !value)}>
        <LifeBuoy size={20} />
        困ったことを送る
      </button>
      {open && (
        <form className="feedback-chat" onSubmit={submitFeedback}>
          <div className="chat-header">
            <MessageSquare size={18} />
            <div>
              <strong>質問・改善</strong>
              <span>{feedbackApiBase ? "Feedback Hub接続" : "未接続: モック保存"}</span>
            </div>
          </div>
          <div className="chat-bubble">
            困ったこと、質問、改善してほしい点を書いてください。現在画面のcontextも一緒に送ります。
          </div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="例: Free上限に達した時の案内をもっと分かりやすくしたい"
            rows={4}
          />
          <button className="button primary send" type="submit">
            <Send size={16} />
            送信
          </button>
          {status !== "idle" && (
            <p className="feedback-status">
              {status === "sending" && "送信しています..."}
              {status === "sent" && "送信しました。ありがとうございます。"}
              {status === "needs_followup" && "追加で確認したいことがあります。"}
              {status === "mocked" && "Feedback Hub未接続のため、この端末にモック保存しました。"}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function StatusPanel() {
  return (
    <aside className="status-panel">
      <h2>リリース状態</h2>
      <ul>
        <li><CheckCircle2 size={18} />Cloudflare Static Assets対応</li>
        <li><CheckCircle2 size={18} />Clerk認証入口を追加</li>
        <li><CheckCircle2 size={18} />Free / Pro Entitlement追加</li>
        <li><CheckCircle2 size={18} />Feedback Hub送信口を準備</li>
      </ul>
    </aside>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Notice({ type, title, body }) {
  return (
    <div className={`notice ${type}`}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function formatLimit(current, limit) {
  if (isUnlimited(limit)) return `${current} / 上限なし`;
  return `${current} / ${limit}`;
}

function limitNotice(data = {}) {
  return {
    type: data.status === "success" ? "success" : "warning",
    title: data.message || "操作できませんでした",
    body: data.upgradeBenefit || "プラン状態を確認してください。",
  };
}

function ClerkSetupScreen() {
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <p className="eyebrow">Numeria Studio</p>
        <h1>Clerkの公開キーを設定してください</h1>
        <p>
          `VITE_CLERK_PUBLISHABLE_KEY` が未設定です。作成済みの Clerk アプリ
          「AITEC Apps」の Development 環境から公開キーを取得し、Cloudflare の本番ビルド環境へ
          登録するとログイン画面が有効になります。
        </p>
        <dl className="setup-list">
          <div>
            <dt>Clerk App ID</dt>
            <dd>{clerkApplicationId}</dd>
          </div>
          <div>
            <dt>GitHub / Cloudflare variable</dt>
            <dd>VITE_CLERK_PUBLISHABLE_KEY</dd>
          </div>
          <div>
            <dt>Admin email variable</dt>
            <dd>VITE_ADMIN_EMAILS=illusionddt@gmail.com</dd>
          </div>
        </dl>
        <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
        <p className="warning-note">
          `CLERK_SECRET_KEY` はチャット・GitHub・フロントエンドへ入れないでください。Worker側でJWT検証を
          追加する段階で、Cloudflare Workers Secretとして登録します。
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
