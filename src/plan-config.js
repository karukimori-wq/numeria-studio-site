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
    description: "月20件までの鑑定と、3名までの鑑定対象者管理を無料で試せます。",
    priceEnvKey: "VITE_PRICE_FREE_LABEL",
    defaultPriceLabel: "無料",
    available: true,
    entitlements: {
      monthlyAppraisals: 20,
      appraisalClients: 3,
      basicAppraisal: true,
      basicReport: true,
      appraisalHistory: true,
      basicTemplates: true,
      aiAssistWithinFreeQuota: true,
      pdfExport: false,
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

export function createUsageSnapshot({ planId = PLAN_IDS.FREE, monthlyAppraisals = 0, appraisalClients = 0, billingMonth = getBillingMonth() } = {}) {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = PLAN_CONFIG[normalizedPlanId] || PLAN_CONFIG.free;
  return {
    planId: normalizedPlanId,
    planName: plan.name,
    billingMonth,
    billingAnchor: "calendar-month",
    monthlyAppraisals,
    appraisalClients,
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

  if (action === "start_appraisal" && !isUnlimited(entitlement.monthlyAppraisals)) {
    if (snapshot.monthlyAppraisals >= entitlement.monthlyAppraisals) {
      return {
        allowed: false,
        reason: "FREE_MONTHLY_APPRAISAL_LIMIT",
        message: `Freeプランの今月の鑑定数は${entitlement.monthlyAppraisals}件までです。`,
        upgradeBenefit: "Proにすると鑑定件数が上限なしになります。",
      };
    }
  }

  if (action === "create_appraisal_client" && !isUnlimited(entitlement.appraisalClients)) {
    if (snapshot.appraisalClients >= entitlement.appraisalClients) {
      return {
        allowed: false,
        reason: "FREE_APPRAISAL_CLIENT_LIMIT",
        message: `Freeプランの鑑定対象者管理は${entitlement.appraisalClients}名までです。`,
        upgradeBenefit: "Proにすると鑑定対象者を上限なしで管理できます。",
      };
    }
  }

  return { allowed: true, reason: "OK", message: "利用できます。", upgradeBenefit: "" };
}
