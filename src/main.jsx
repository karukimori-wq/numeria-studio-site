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
  Database,
  Download,
  FileText,
  LifeBuoy,
  Lock,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
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
          ログイン
        </div>
        <h2>ログイン状態を確認しています</h2>
        <p>セッションを読み込んでいます。</p>
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
          ログイン
        </div>
        <h2>ログインすると利用量とプランを確認できます</h2>
        <p>
          Freeでは月20件まで鑑定でき、鑑定完成ボタンを押した時点で1件として数えます。
          途中保存は1案件まで、鑑定対象者のプロフィール登録とPDF出力は無料で使えます。
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
  const [serverAdminMode, setServerAdminMode] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState(null);
  const [currentCase, setCurrentCase] = useState(createEmptyCase);
  const [reportOptions, setReportOptions] = useState({
    reportType: "basic",
    removeBranding: false,
  });

  function createEmptyCase() {
    return {
      id: `case_${Date.now()}`,
      clientName: "",
      question: "",
      notes: "",
      resultSummary: "",
    };
  }

  function updateCurrentCase(field, value) {
    setCurrentCase((current) => ({ ...current, [field]: value }));
  }

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

  useEffect(() => {
    let active = true;
    apiRequest("/api/admin/status", {
      scope,
      body: { adminEmail: primaryEmail },
    })
      .then((response) => {
        if (active) setServerAdminMode(Boolean(response.adminMode));
      })
      .catch(() => {
        if (active) setServerAdminMode(false);
      });
    return () => {
      active = false;
    };
  }, [primaryEmail, scope]);

  useEffect(() => {
    let active = true;
    apiRequest("/persistence/status")
      .then((response) => {
        if (active) setPersistenceStatus(response);
      })
      .catch(() => {
        if (active) {
          setPersistenceStatus({
            status: "warning",
            storageDriver: "unknown",
            durable: false,
            warning: "保存状態を確認できませんでした。",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!usage.activeDraft) return;
    setCurrentCase((current) => ({
      ...current,
      ...usage.activeDraft,
      id: usage.activeDraft.id || current.id,
    }));
  }, [usage.activeDraft]);

  async function startSession() {
    try {
      const nextCase = createEmptyCase();
      setCurrentCase(nextCase);
      const response = await apiRequest("/api/sessions/start", {
        method: "POST",
        scope,
        body: { sessionId: nextCase.id },
      });
      setUsage(response.usage);
      setNotice({
        type: "success",
        title: "鑑定セッションを開始しました",
        body: "この時点では月20件の鑑定数にも未完了案件数にも加算されません。途中保存した時点で未完了1案件として扱います。",
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
      if (error.data?.usage) setUsage(error.data.usage);
    }
  }

  async function saveDraft() {
    try {
      const response = await apiRequest("/api/appraisals/save-draft", {
        method: "POST",
        scope,
        body: currentCase,
      });
      setUsage(response.usage);
      setNotice({
        type: "success",
        title: "途中保存しました",
        body: `${response.activeDraft?.clientName || "この案件"}を未完了案件として保存しました。Freeでは別案件を保存する前に、この案件を完成させてください。`,
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
      if (error.data?.usage) setUsage(error.data.usage);
    }
  }

  async function completeAppraisal() {
    try {
      const response = await apiRequest("/api/appraisals/complete", {
        method: "POST",
        scope,
        body: currentCase,
      });
      setUsage(response.usage);
      setCurrentCase(createEmptyCase());
      setNotice({
        type: "success",
        title: "鑑定を完成として記録しました",
        body: `${response.appraisal?.clientName || "案件"}を完成しました。今月の鑑定数は ${formatLimit(response.usage.monthlyAppraisals, response.usage.entitlements.monthlyAppraisals)} です。Freeでは直近3件の鑑定内容だけ表示できます。`,
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
          ? "鑑定件数、途中保存、履歴表示が上限なしになりました。"
          : "Freeプランへ戻しました。月20件、途中保存1案件、直近3件表示の上限が即時に反映されます。",
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
    }
  }

  async function exportReport() {
    try {
      const response = await apiRequest("/api/reports/export", {
        method: "POST",
        scope,
        body: {
          format: "pdf",
          reportType: reportOptions.reportType,
          removeBranding: reportOptions.removeBranding,
          appraisalId: currentCase.id,
          clientName: currentCase.clientName,
          question: currentCase.question,
          notes: currentCase.notes,
          resultSummary: currentCase.resultSummary,
        },
      });
      if (response.downloadUrl) {
        const anchor = document.createElement("a");
        anchor.href = response.downloadUrl;
        anchor.download = response.fileName || "numeria-report.pdf";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      setNotice({
        type: "success",
        title: "PDFを生成しました",
        body: `${response.fileName} をダウンロードできます。${response.branding === "hidden" ? "ロゴは非表示です。" : "Numeriaロゴ付きで出力します。"}`,
      });
    } catch (error) {
      setNotice(limitNotice(error.data));
      if (error.data?.usage) setUsage(error.data.usage);
    }
  }

  function printJapaneseReport() {
    const detailedDecision = evaluateUsageLimit(usage, "export_detailed_report");
    const brandingDecision = evaluateUsageLimit(usage, "remove_report_branding");
    if (reportOptions.reportType === "detailed" && !detailedDecision.allowed) {
      setNotice(limitNotice(detailedDecision));
      return;
    }
    if (reportOptions.removeBranding && !brandingDecision.allowed) {
      setNotice(limitNotice(brandingDecision));
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotice({
        type: "warning",
        title: "印刷画面を開けませんでした",
        body: "ブラウザのポップアップを許可してから、もう一度お試しください。",
      });
      return;
    }

    const title = reportOptions.reportType === "detailed" ? "鑑定書（詳細）" : "鑑定書（基本）";
    const branding = reportOptions.removeBranding ? "" : "<div class=\"brand\">Numeria Studio</div>";
    const field = (label, value, fallback = "未入力") => `
      <section><h2>${escapePrintHtml(label)}</h2><p>${escapePrintHtml(value || fallback)}</p></section>`;
    printWindow.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${escapePrintHtml(title)}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        :root { color: #201a35; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }
        body { margin: 0; line-height: 1.8; }
        header { background: #201a35; color: #fff; padding: 24px 28px; border-bottom: 4px solid #b99b53; }
        h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .brand { margin: 28px 0 36px; color: #9b7f3d; letter-spacing: .18em; font-size: 12px; }
        .meta { color: #6f6878; font-size: 12px; margin: 0 0 28px; }
        main { border-top: 1px solid #d9d3df; }
        section { padding: 22px 0; border-bottom: 1px solid #d9d3df; }
        h2 { margin: 0 0 8px; color: #8d7337; font-size: 13px; letter-spacing: .08em; }
        p { margin: 0; white-space: pre-wrap; font-size: 16px; }
        footer { margin-top: 44px; color: #8a8490; font-size: 11px; }
      </style></head><body>
      <header><h1>${escapePrintHtml(title)}</h1></header>
      <main>${branding}<p class="meta">出力日時: ${escapePrintHtml(new Date().toLocaleString("ja-JP"))}</p>
        ${field("依頼者", currentCase.clientName)}
        ${field("相談内容", currentCase.question)}
        ${field("鑑定結果", currentCase.resultSummary)}
        ${reportOptions.reportType === "detailed" ? field("鑑定メモ", currentCase.notes) : ""}
      </main><footer>この鑑定書はNumeria Studioで作成されました。</footer>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
    setNotice({
      type: "success",
      title: "日本語PDFの印刷画面を開きました",
      body: "印刷画面で「PDFとして保存」を選択してください。",
    });
  }

  const completeDecision = evaluateUsageLimit(usage, "complete_appraisal");
  const draftDecision = evaluateUsageLimit(usage, "save_in_progress_appraisal");
  const canSaveDraft = draftDecision.allowed || usage.activeDraft?.id === currentCase.id;
  const showAdminFeatures = isAdmin && serverAdminMode;

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
              icon={<ClipboardList size={18} />}
              label="途中保存"
              current={usage.inProgressAppraisals}
              limit={usage.entitlements.inProgressAppraisals}
            />
            <UsageCard
              icon={<Users size={18} />}
              label="表示できる鑑定履歴"
              current={usage.visibleCompletedAppraisalIds?.length || 0}
              limit={usage.entitlements.viewableCompletedAppraisals}
            />
            <UsageCard
              icon={<Download size={18} />}
              label="PDF出力履歴"
              current={usage.reportExports?.length || 0}
              limit="unlimited"
            />
          </div>
          {notice && <Notice {...notice} />}
          <AppraisalCaseForm
            currentCase={currentCase}
            usage={usage}
            onChange={updateCurrentCase}
          />
          <div className="action-row">
            <button className="button secondary" onClick={startSession}>
              新しい案件を始める
            </button>
            <button className="button secondary" onClick={saveDraft} disabled={!canSaveDraft}>
              途中保存
            </button>
            <button className="button primary" onClick={completeAppraisal} disabled={!completeDecision.allowed}>
              鑑定完成
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

        <PersistencePanel status={persistenceStatus} />

        {showAdminFeatures && <AdminPreviewPanel />}

        <ReportExportPanel
          options={reportOptions}
          usage={usage}
          onChange={setReportOptions}
          onExport={exportReport}
          onPrint={printJapaneseReport}
        />

        <PlanComparison currentPlanId={usage.planId} onSelectPlan={changePlan} isAdmin={showAdminFeatures} />

        <AppraisalHistoryPanel usage={usage} />
      </section>

      <FeedbackWidget workspaceId={workspaceId} userId={userId} screenName="Free Pro Dashboard" />
    </>
  );
}

function PersistencePanel({ status }) {
  const isDurable = Boolean(status?.durable);
  const label = status
    ? isDurable
      ? "D1保存中"
      : "一時保存"
    : "確認中";

  return (
    <div className="work-panel persistence-panel">
      <div className="panel-heading">
        <Database size={20} />
        <div>
          <p className="eyebrow">Storage</p>
          <h2>保存状態</h2>
        </div>
      </div>
      <div className={isDurable ? "storage-badge durable" : "storage-badge"}>
        <span>{label}</span>
        <strong>{status?.storageDriver || "checking"}</strong>
      </div>
      <p className="note">
        途中保存、完成済み鑑定、PDF出力履歴を保存対象にしています。
        {status?.warning ? ` ${status.warning}` : " 再読み込みしても同じアカウントで確認できます。"}
      </p>
    </div>
  );
}

function AdminPreviewPanel() {
  const previewItems = [
    {
      title: "Business連携",
      status: "開発中",
      body: "Growth Engine連携、予約・売上・決済正本との接続を管理者だけ先行確認します。",
    },
    {
      title: "実PDF生成",
      status: "次に実装",
      body: "鑑定書テンプレート、ロゴ非表示、ダウンロード導線を一般公開前に確認します。",
    },
    {
      title: "AI利用記録",
      status: "準備中",
      body: "AI Platform CoreへUsageと生成イベントを送る動作を管理者だけ検証します。",
    },
  ];

  return (
    <div className="work-panel admin-preview-panel">
      <div className="panel-heading">
        <ShieldCheck size={20} />
        <div>
          <p className="eyebrow">Admin Preview</p>
          <h2>管理者だけの先行メニュー</h2>
        </div>
      </div>
      <p className="note">
        通常ユーザーには表示しないBusiness予定機能と開発中機能です。プラン機能の延長として、公開前の動作確認に使います。
      </p>
      <div className="admin-preview-grid">
        {previewItems.map((item) => (
          <button className="admin-preview-card" type="button" key={item.title}>
            <span>{item.status}</span>
            <strong>{item.title}</strong>
            <small>{item.body}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReportExportPanel({ options, usage, onChange, onExport, onPrint }) {
  const detailedDecision = evaluateUsageLimit(usage, "export_detailed_report");
  const brandingDecision = evaluateUsageLimit(usage, "remove_report_branding");
  const canUseDetailed = detailedDecision.allowed;
  const canRemoveBranding = brandingDecision.allowed;

  function selectReportType(reportType) {
    if (reportType === "detailed" && !canUseDetailed) return;
    onChange((current) => ({ ...current, reportType }));
  }

  function toggleBranding() {
    if (!canRemoveBranding) return;
    onChange((current) => ({ ...current, removeBranding: !current.removeBranding }));
  }

  return (
    <div className="work-panel report-panel">
      <div className="panel-heading">
        <Download size={20} />
        <div>
          <p className="eyebrow">Report</p>
          <h2>鑑定書出力</h2>
        </div>
      </div>
      <p className="note">
        FreeはPDFの基本鑑定書を出力できます。詳細レポートとロゴ非表示はProで利用できます。
      </p>
      <div className="segmented-control" aria-label="レポート種別">
        <button
          className={options.reportType === "basic" ? "active" : ""}
          onClick={() => selectReportType("basic")}
        >
          基本
        </button>
        <button
          className={options.reportType === "detailed" ? "active" : ""}
          disabled={!canUseDetailed}
          onClick={() => selectReportType("detailed")}
        >
          詳細 {!canUseDetailed && <Lock size={14} />}
        </button>
      </div>
      <button
        className="toggle-row"
        disabled={!canRemoveBranding}
        onClick={toggleBranding}
      >
        <span>
          <strong>Numeriaロゴを非表示</strong>
          <small>{canRemoveBranding ? "Proで切り替え可能" : "Proで利用できます"}</small>
        </span>
        <span className={options.removeBranding ? "switch on" : "switch"} />
      </button>
      <div className="action-row">
        <button className="button primary" onClick={onExport}>
          PDF出力
        </button>
        <button className="button secondary" onClick={onPrint}>
          日本語PDF（印刷保存）
        </button>
      </div>
    </div>
  );
}

function escapePrintHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function AppraisalCaseForm({ currentCase, usage, onChange }) {
  const hasSavedDraft = Boolean(usage.activeDraft);
  const isEditingSavedDraft = hasSavedDraft && usage.activeDraft.id === currentCase.id;

  return (
    <div className="case-editor">
      <div className="case-editor-heading">
        <div>
          <p className="eyebrow">Current Case</p>
          <h3>鑑定案件</h3>
        </div>
        {usage.activeDraft && <span className="draft-pill">保存中: {usage.activeDraft.clientName || "未設定"}</span>}
      </div>
      <div className={hasSavedDraft && !isEditingSavedDraft ? "case-rule warning" : "case-rule"}>
        <ClipboardList size={16} />
        <span>
          {hasSavedDraft
            ? isEditingSavedDraft
              ? "この保存中案件を編集しています。完成すると今月の鑑定数に1件加算されます。"
              : "Freeでは保存中の別案件があります。新しい案件を保存する前に、保存中案件を完成してください。"
            : "途中保存は未完了案件として扱います。鑑定完成ボタンを押すまでは月の鑑定数に加算されません。"}
        </span>
      </div>
      <label>
        依頼者名
        <input
          value={currentCase.clientName}
          onChange={(event) => onChange("clientName", event.target.value)}
          placeholder="例: Aさん"
        />
      </label>
      <label>
        相談内容
        <textarea
          value={currentCase.question}
          onChange={(event) => onChange("question", event.target.value)}
          placeholder="今回相談されたテーマを入力"
          rows={3}
        />
      </label>
      <label>
        鑑定メモ
        <textarea
          value={currentCase.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="鑑定中のメモ"
          rows={3}
        />
      </label>
      <label>
        鑑定結果
        <textarea
          value={currentCase.resultSummary}
          onChange={(event) => onChange("resultSummary", event.target.value)}
          placeholder="鑑定完成時に保存する要約"
          rows={3}
        />
      </label>
    </div>
  );
}

function AppraisalHistoryPanel({ usage }) {
  const clients = usage.clientHistorySummaries || [];
  const lockedCount = usage.lockedCompletedAppraisalIds?.length || 0;
  const [selectedClientName, setSelectedClientName] = useState("");
  const [openAppraisalId, setOpenAppraisalId] = useState("");
  const selectedClient = clients.find((client) => client.clientName === selectedClientName) || clients[0];

  useEffect(() => {
    if (!clients.length) {
      setSelectedClientName("");
      setOpenAppraisalId("");
      return;
    }

    if (!clients.some((client) => client.clientName === selectedClientName)) {
      setSelectedClientName(clients[0].clientName);
      setOpenAppraisalId("");
    }
  }, [clients, selectedClientName]);

  return (
    <div className="work-panel history-panel">
      <div className="panel-heading">
        <FileText size={20} />
        <div>
          <p className="eyebrow">History</p>
          <h2>鑑定履歴</h2>
        </div>
      </div>
      <p className="note">
        依頼者を選ぶと過去案件を確認できます。Freeでは完成順の直近3件だけ内容を展開でき、古い案件は件数のみ表示します。
      </p>
      {clients.length === 0 && <div className="empty-state">まだ完成した鑑定はありません。</div>}
      {clients.length > 0 && (
        <>
          <div className="client-selector" aria-label="依頼者を選択">
            {clients.map((client) => (
              <button
                className={client.clientName === selectedClient?.clientName ? "client-chip active" : "client-chip"}
                key={client.clientName}
                onClick={() => {
                  setSelectedClientName(client.clientName);
                  setOpenAppraisalId("");
                }}
              >
                <span>{client.clientName}</span>
                <strong>{client.totalAppraisals}件</strong>
              </button>
            ))}
          </div>
          {selectedClient && (
            <div className="client-history">
              <div className="client-history-heading">
                <div>
                  <strong>{selectedClient.clientName}</strong>
                  <span>過去依頼 {selectedClient.totalAppraisals}件</span>
                </div>
                {selectedClient.lockedAppraisalIds.length > 0 && (
                  <span className="lock-pill">
                    <Lock size={14} />
                    {selectedClient.lockedAppraisalIds.length}件ロック
                  </span>
                )}
              </div>
              <div className="history-list">
                {selectedClient.visibleAppraisals.map((appraisal) => {
                  const isOpen = openAppraisalId === appraisal.id;
                  return (
                    <article className="history-item" key={appraisal.id}>
                      <button
                        className="history-toggle"
                        onClick={() => setOpenAppraisalId(isOpen ? "" : appraisal.id)}
                      >
                        <span>{new Date(appraisal.completedAt).toLocaleString("ja-JP")}</span>
                        <strong>{isOpen ? "閉じる" : "内容を見る"}</strong>
                      </button>
                      {isOpen && (
                        <div className="history-detail">
                          <p><strong>相談内容</strong>{appraisal.question || "未入力"}</p>
                          <p><strong>鑑定結果</strong>{appraisal.resultSummary || "未入力"}</p>
                          {appraisal.notes && <p><strong>鑑定メモ</strong>{appraisal.notes}</p>}
                        </div>
                      )}
                    </article>
                  );
                })}
                {selectedClient.visibleAppraisals.length === 0 && (
                  <div className="empty-state">この依頼者の表示可能な鑑定内容はありません。</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {lockedCount > 0 && (
        <div className="locked-history">
          {lockedCount}件の古い鑑定内容はFreeの表示範囲外です。
        </div>
      )}
    </div>
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
          <dt>状態</dt>
          <dd>{isPro ? "有効" : "Free利用中"}</dd>
        </div>
      </dl>
      <p className="note">
        Stripe実処理・返金・売上管理はGrowth Engine側を正にします。Numeria Studioでは必要な契約状態だけ表示します。
      </p>
      <div className="action-row">
        {!isPro && <button className="button primary" onClick={onUpgrade}>Proへアップグレード</button>}
        {isPro && <button className="button secondary" onClick={onDowngrade}>Freeへ戻す</button>}
      </div>
    </div>
  );
}

function PlanComparison({ currentPlanId, onSelectPlan, isAdmin = false }) {
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
                {plan.id === currentPlanId
                  ? "現在利用中"
                  : plan.available
                    ? `${plan.name}を選ぶ`
                    : isAdmin
                      ? "管理者プレビュー（準備中）"
                      : "準備中"}
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
        <li><CheckCircle2 size={18} />ログイン入口を追加</li>
        <li><CheckCircle2 size={18} />Free / Pro利用制限を反映</li>
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
        <h1>ログイン設定を反映してください</h1>
        <p>
          ログインに必要な公開設定が未反映です。設定が本番ビルド環境へ
          登録されるとログイン画面が有効になります。
        </p>
        <dl className="setup-list">
          <div>
            <dt>アプリID</dt>
            <dd>{clerkApplicationId}</dd>
          </div>
          <div>
            <dt>本番ビルド設定</dt>
            <dd>VITE_CLERK_PUBLISHABLE_KEY</dd>
          </div>
          <div>
            <dt>管理者メール設定</dt>
            <dd>VITE_ADMIN_EMAILS=illusionddt@gmail.com</dd>
          </div>
        </dl>
        <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
        <p className="warning-note">
          秘密キーはチャット・GitHub・フロントエンドへ入れないでください。サーバー側の確認を
          追加する段階で、保護された秘密値として登録します。
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
