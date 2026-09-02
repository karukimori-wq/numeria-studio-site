import React, { useMemo, useState } from "react";
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
  LifeBuoy,
  Lock,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import "./styles.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const appVersion = import.meta.env.VITE_APP_VERSION || "0.2.0-clerk-migration";
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
          <h1>鑑定セッションとレポートを安全に管理</h1>
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
          {isLoaded && isSignedIn && (
            <UserButton />
          )}
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
    <section className="hero-grid">
      <div className="hero-panel">
        <div className="icon-pill">
          <Lock size={18} />
          Clerk Auth
        </div>
        <h2>Clerkでログインして始めます</h2>
        <p>
          Supabase AuthからClerkへ移行するための編集可能なViteアプリです。
          認証、管理者判定、Feedback Hub送信口をCloudflare前提で組み直しています。
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
      <StatusPanel />
    </section>
  );
}

function SignedInWorkspace() {
  const { user } = useUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdmin = adminEmails.includes(primaryEmail);
  const workspaceId = user?.organizationMemberships?.[0]?.organization?.id || "ws_personal";
  const userId = user?.id || "unknown";

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
          <div className="stat-grid">
            <StatCard label="Session" value="Clerk認証済み" />
            <StatCard label="Report" value="編集UI準備中" />
            <StatCard label="Identity" value="workspaceId + userId" />
          </div>
          <div className="action-row">
            <button className="button primary">セッションを始める</button>
            <button className="button secondary">レポート履歴</button>
          </div>
        </div>

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
            MVPでは `illusionddt@gmail.com` を管理者候補として扱います。実運用ではClerk private metadata
            またはWorker側の保護された設定に寄せます。
          </p>
        </div>
      </section>

      <FeedbackWidget
        workspaceId={workspaceId}
        userId={userId}
        screenName="Studio Dashboard"
      />
    </>
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
            placeholder="例: レポート履歴の探し方が分かりにくい"
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
      <h2>移行状態</h2>
      <ul>
        <li>
          <CheckCircle2 size={18} />
          Cloudflare Static Assets対応
        </li>
        <li>
          <CheckCircle2 size={18} />
          Clerk認証入口を追加
        </li>
        <li>
          <CheckCircle2 size={18} />
          Feedback Hub送信口を準備
        </li>
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

function ClerkSetupScreen() {
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <p className="eyebrow">Numeria Studio</p>
        <h1>Clerkの公開キーを設定してください</h1>
        <p>
          `VITE_CLERK_PUBLISHABLE_KEY` が未設定です。Clerk DashboardでNumeria Studio用アプリを作成し、
          Cloudflareの本番ビルド環境へ公開キーを登録するとログイン画面が有効になります。
        </p>
        <code>VITE_CLERK_PUBLISHABLE_KEY=pk_live_...</code>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
