export const PLAN_IDS = {
  FREE: "free",
  PRO: "pro",
  BUSINESS: "business",
};

export const PLAN_LIMITS = {
  UNLIMITED: "unlimited",
};

export const PLAN_CONFIG = {
  [PLAN_IDS.FREE]: {
    id: PLAN_IDS.FREE,
    name: "Free",
    headline: "まず鑑定を試す",
    description: "月20件までの鑑定、未完了1案件、直近3完了案件の詳細閲覧を無料で使えます。依頼者プロフィールは人数上限なしです。",
    priceEnvKey: "VITE_PRICE_FREE_LABEL",
    defaultPriceLabel: "無料",
    available: true,
    entitlements: {
      monthlyAppraisals: 20,
      appraisalClients: PLAN_LIMITS.UNLIMITED,
      inProgressAppraisals: 1,
      viewableCompletedAppraisals: 3,
      completionCountTrigger: "appraisal_completed_button",
      mainDivinationLocked: true,
      basicAppraisal: true,
      basicReport: true,
      appraisalHistory: true,
      basicTemplates: true,
      aiAssistWithinFreeQuota: true,
      pdfExport: true,
      brandedReport: false,
      detailedAppraisal: false,
      detailedReport: false,
      reportTextAdjustment: false,
      unlimitedHistory: false,
      appraisalSearch: false,
      clientHistory: false,
      sessionNotes: false,
      aiConsultationDeepening: false,
      aiToneAdjustment: false,
      growthEngineIntegration: false,
    },
  },
  [PLAN_IDS.PRO]: {
    id: PLAN_IDS.PRO,
    name: "Pro",
    headline: "鑑定を仕事で使う",
    description: "件数を気にせず、鑑定とレポート作成を仕事で使えます。",
    priceEnvKey: "VITE_PRICE_PRO_LABEL",
    defaultPriceLabel: "価格未設定",
    available: true,
    entitlements: {
      monthlyAppraisals: PLAN_LIMITS.UNLIMITED,
      appraisalClients: PLAN_LIMITS.UNLIMITED,
      inProgressAppraisals: PLAN_LIMITS.UNLIMITED,
      viewableCompletedAppraisals: PLAN_LIMITS.UNLIMITED,
      completionCountTrigger: "appraisal_completed_button",
      mainDivinationLocked: false,
      basicAppraisal: true,
      basicReport: true,
      appraisalHistory: true,
      basicTemplates: true,
      aiAssistWithinFreeQuota: true,
      pdfExport: true,
      brandedReport: true,
      detailedAppraisal: true,
      detailedReport: true,
      reportTextAdjustment: true,
      unlimitedHistory: true,
      appraisalSearch: true,
      clientHistory: true,
      sessionNotes: true,
      aiConsultationDeepening: true,
      aiToneAdjustment: true,
      growthEngineIntegration: false,
    },
  },
  [PLAN_IDS.BUSINESS]: {
    id: PLAN_IDS.BUSINESS,
    name: "Business",
    headline: "鑑定ビジネス全体を回す",
    description: "Proの全機能に加えて、予約・売上・支払い情報やGrowth Engine連携を使える予定です。",
    priceEnvKey: "VITE_PRICE_BUSINESS_LABEL",
    defaultPriceLabel: "準備中",
    available: false,
    entitlements: {
      monthlyAppraisals: PLAN_LIMITS.UNLIMITED,
      appraisalClients: PLAN_LIMITS.UNLIMITED,
      basicAppraisal: true,
      basicReport: true,
      appraisalHistory: true,
      basicTemplates: true,
      aiAssistWithinFreeQuota: true,
      pdfExport: true,
      brandedReport: true,
      detailedAppraisal: true,
      detailedReport: true,
      reportTextAdjustment: true,
      unlimitedHistory: true,
      appraisalSearch: true,
      clientHistory: true,
      sessionNotes: true,
      aiConsultationDeepening: true,
      aiToneAdjustment: true,
      growthEngineIntegration: true,
    },
  },
};

export const FEATURE_LABELS = {
  basicAppraisal: "基本鑑定",
  basicReport: "基本レポート",
  appraisalHistory: "鑑定履歴",
  basicTemplates: "基本テンプレート",
  detailedAppraisal: "詳細鑑定",
  detailedReport: "詳細レポート",
  pdfExport: "PDF出力",
  brandedReport: "ブランド入りレポート",
  reportTextAdjustment: "レポート文章調整",
  appraisalSearch: "過去鑑定検索",
  clientHistory: "顧客別の鑑定履歴",
  sessionNotes: "セッションメモ",
  aiConsultationDeepening: "AIによる相談内容の整理・深掘り",
  aiToneAdjustment: "AIによる伝え方の調整",
  growthEngineIntegration: "Growth Engine連携",
};

export function getBillingMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function normalizePlanId(planId) {
  if (planId === PLAN_IDS.PRO) return PLAN_IDS.PRO;
  if (planId === PLAN_IDS.BUSINESS) return PLAN_IDS.BUSINESS;
  return PLAN_IDS.FREE;
}

export function isUnlimited(value) {
  return value === PLAN_LIMITS.UNLIMITED;
}

export function getPlanPrice(plan, env = {}) {
  return env[plan.priceEnvKey] || plan.defaultPriceLabel;
}

function createClientHistorySummary(completedAppraisals, visibleCompletedAppraisalIds, lockedCompletedAppraisalIds) {
  const clientMap = new Map();
  const visibleSet = new Set(visibleCompletedAppraisalIds);
  const lockedSet = new Set(lockedCompletedAppraisalIds);

  completedAppraisals.forEach((appraisal) => {
    const clientName = appraisal.clientName || "未設定";
    const current = clientMap.get(clientName) || {
      clientName,
      totalAppraisals: 0,
      visibleAppraisals: [],
      lockedAppraisalIds: [],
      lastCompletedAt: appraisal.completedAt,
    };

    current.totalAppraisals += 1;
    current.lastCompletedAt = appraisal.completedAt || current.lastCompletedAt;

    if (visibleSet.has(appraisal.id)) {
      current.visibleAppraisals.push(appraisal);
    }

    if (lockedSet.has(appraisal.id)) {
      current.lockedAppraisalIds.push(appraisal.id);
    }

    clientMap.set(clientName, current);
  });

  return Array.from(clientMap.values()).sort((left, right) => {
    return new Date(right.lastCompletedAt || 0).getTime() - new Date(left.lastCompletedAt || 0).getTime();
  });
}

export function createUsageSnapshot({ planId = PLAN_IDS.FREE, monthlyAppraisals = 0, appraisalClients = 0, inProgressAppraisals = 0, completedAppraisalIds = [], completedAppraisals = [], activeDraft = null, billingMonth = getBillingMonth() } = {}) {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = PLAN_CONFIG[normalizedPlanId] || PLAN_CONFIG.free;
  const visibleCompletedAppraisalIds = isUnlimited(plan.entitlements.viewableCompletedAppraisals) ? completedAppraisalIds : completedAppraisalIds.slice(-plan.entitlements.viewableCompletedAppraisals);
  const lockedCompletedAppraisalIds = isUnlimited(plan.entitlements.viewableCompletedAppraisals) ? [] : completedAppraisalIds.slice(0, Math.max(0, completedAppraisalIds.length - plan.entitlements.viewableCompletedAppraisals));
  const visibleCompletedAppraisals = completedAppraisals.filter((appraisal) => visibleCompletedAppraisalIds.includes(appraisal.id));
  return {
    planId: normalizedPlanId,
    planName: plan.name,
    billingMonth,
    billingAnchor: "calendar-month",
    monthlyAppraisals,
    appraisalClients,
    inProgressAppraisals,
    activeDraft,
    completedAppraisalIds,
    completedAppraisals,
    visibleCompletedAppraisalIds,
    visibleCompletedAppraisals,
    lockedCompletedAppraisalIds,
    clientHistorySummaries: createClientHistorySummary(completedAppraisals, visibleCompletedAppraisalIds, lockedCompletedAppraisalIds),
    entitlements: plan.entitlements,
  };
}

export function evaluateUsageLimit(snapshot, action) {
  const entitlement = snapshot.entitlements;

  if (snapshot.planId === PLAN_IDS.BUSINESS && !PLAN_CONFIG.business.available) {
    return {
      allowed: false,
      reason: "BUSINESS_PREPARING",
      message: "Businessプランは準備中です。現在はFreeまたはProを選択してください。",
      upgradeBenefit: "Proなら鑑定件数と鑑定対象者数を気にせず使えます。",
    };
  }

  if (action === "complete_appraisal" && !isUnlimited(entitlement.monthlyAppraisals)) {
    if (snapshot.monthlyAppraisals >= entitlement.monthlyAppraisals) {
      return {
        allowed: false,
        reason: "FREE_MONTHLY_APPRAISAL_LIMIT",
        message: `Freeプランの今月の鑑定数は${entitlement.monthlyAppraisals}件までです。`,
        upgradeBenefit: "Proにすると鑑定件数が上限なしになります。",
      };
    }
  }

  if (action === "save_in_progress_appraisal" && !isUnlimited(entitlement.inProgressAppraisals)) {
    if (snapshot.inProgressAppraisals >= entitlement.inProgressAppraisals) {
      return {
        allowed: false,
        reason: "FREE_IN_PROGRESS_APPRAISAL_LIMIT",
        message: `Freeプランで途中保存できる未完了案件は${entitlement.inProgressAppraisals}件までです。`,
        upgradeBenefit: "Proにすると複数の依頼者・案件を切り替えながら作業できます。",
      };
    }
  }

  if (action === "export_detailed_report" && !entitlement.detailedReport) {
    return {
      allowed: false,
      reason: "PRO_DETAILED_REPORT_REQUIRED",
      message: "詳細レポートはProプランで利用できます。",
      upgradeBenefit: "Proにすると詳細鑑定、詳細レポート、文章調整を使えます。",
    };
  }

  if (action === "remove_report_branding" && !entitlement.brandedReport) {
    return {
      allowed: false,
      reason: "PRO_BRANDING_CONTROL_REQUIRED",
      message: "ロゴ非表示はProプランで利用できます。",
      upgradeBenefit: "Proにするとブランド表示の調整ができます。",
    };
  }

  if (action === "export_pdf_report" && !entitlement.pdfExport) {
    return {
      allowed: false,
      reason: "PDF_EXPORT_UNAVAILABLE",
      message: "PDF出力は現在のプランでは利用できません。",
      upgradeBenefit: "利用可能なプランを確認してください。",
    };
  }

  return { allowed: true, reason: "OK", message: "利用できます。", upgradeBenefit: "" };
}