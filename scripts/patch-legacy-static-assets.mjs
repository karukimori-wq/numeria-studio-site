import { readFileSync, writeFileSync } from "node:fs";

const legacyAssetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(legacyAssetPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

let patched = source;

const legacyPdfNavigation = "window.location.assign(o)";
const safePdfNavigation = 'window.open(o,"_blank","noopener,noreferrer")||window.location.assign(o)';
patched = replaceExactly(
  patched,
  legacyPdfNavigation,
  safePdfNavigation,
  3,
  "legacy PDF navigation calls",
);

const manticDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r})";
const manticDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})";
const numerologyDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e})";
const numerologyDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e,clientName:j,question:P,notes:lt||dt||``,resultSummary:r.message||r.summary||``})";
patched = replaceExactly(
  patched,
  manticDraftPayload,
  manticDraftPayloadWithDetails,
  1,
  "mantic draft payload",
);
patched = replaceExactly(
  patched,
  numerologyDraftPayload,
  numerologyDraftPayloadWithDetails,
  1,
  "numerology draft payload",
);

// Admin/developer preview is an entitlement, not a subscription plan change.
// Keep ar (the actual subscription plan) untouched and bypass only UI preview gates for admins.
const legacyFreeDivinationGate = "let r=ar!==`free`;";
const adminPreviewDivinationGate = "let r=ar!==`free`||tr===`admin`;";
patched = replaceExactly(
  patched,
  legacyFreeDivinationGate,
  adminPreviewDivinationGate,
  1,
  "Free divination switch gate",
);

const legacyFreeReloadGate = "p=d!==s||r?.plan===`free`?[d]:f.includes(d)?f:[d,...f]";
const adminPreviewReloadGate = "p=d!==s||r?.plan===`free`&&tr!==`admin`?[d]:f.includes(d)?f:[d,...f]";
patched = replaceExactly(
  patched,
  legacyFreeReloadGate,
  adminPreviewReloadGate,
  1,
  "Free divination reload gate",
);

const legacyPlanHeader = "children:[`NUMERIA ACCOUNT · `,ar===`business`?`BUSINESS`:ar===`pro`?`PRO`:`FREE`]";
const adminPreviewPlanHeader = "children:[`NUMERIA ACCOUNT · `,ar===`business`?`BUSINESS`:ar===`pro`?`PRO`:`FREE`,tr===`admin`?` · ADMIN PREVIEW`:``]";
patched = replaceExactly(
  patched,
  legacyPlanHeader,
  adminPreviewPlanHeader,
  1,
  "account plan header",
);

const legacyDivinationHelp = "children:`無料版では初回に選んだメイン占術を固定します。変更はProで利用できます。`";
const adminPreviewDivinationHelp = "children:tr===`admin`?`管理者プレビュー：実契約プランは変更せず、開発中を含む全占術を確認できます。`:`無料版では初回に選んだメイン占術を固定します。変更はProで利用できます。`";
patched = replaceExactly(
  patched,
  legacyDivinationHelp,
  adminPreviewDivinationHelp,
  1,
  "divination plan help text",
);

const legacyDivinationCount = "children:[s.length,` / `,ar===`free`?`1`:`制限なし`,` 占術`]";
const adminPreviewDivinationCount = "children:[s.length,` / `,ar===`free`&&tr!==`admin`?`1`:`制限なし`,` 占術`]";
patched = replaceExactly(
  patched,
  legacyDivinationCount,
  adminPreviewDivinationCount,
  1,
  "divination count label",
);

const legacyTarotFreeCopy = "タロットを選んだFreeユーザーはタロットを利用できます。";
const currentTarotReleaseCopy = "タロットは現在リリース準備中です。管理者プレビューでのみ確認できます。";
patched = replaceExactly(
  patched,
  legacyTarotFreeCopy,
  currentTarotReleaseCopy,
  1,
  "stale Free tarot copy",
);

const legacyOnboardingTarotCopy = "無料版では最初に使う占術を1つ選びます。タロットを選ぶとタロットを利用できます。";
const currentOnboardingTarotCopy = "無料版では最初に使う命術を1つ選びます。選択後は固定され、変更はProで利用できます。";
patched = replaceExactly(
  patched,
  legacyOnboardingTarotCopy,
  currentOnboardingTarotCopy,
  1,
  "stale onboarding tarot copy",
);

writeFileSync(legacyAssetPath, patched);

console.log(
  "Legacy PDF exports, draft payloads, and admin developer preview gates patched for the production workspace.",
);