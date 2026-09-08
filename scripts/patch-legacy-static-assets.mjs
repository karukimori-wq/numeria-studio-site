import { readFileSync, writeFileSync } from "node:fs";

const legacyAssetPath = "dist/assets/numeria-app-Cckhajir.js";
const source = readFileSync(legacyAssetPath, "utf8");
const legacyPdfNavigation = "window.location.assign(o)";
const safePdfNavigation = 'window.open(o,"_blank","noopener,noreferrer")||window.location.assign(o)';
const occurrenceCount = source.split(legacyPdfNavigation).length - 1;

if (occurrenceCount !== 3) {
  throw new Error(`Expected three legacy PDF navigation calls, found ${occurrenceCount}.`);
}

const patched = source.split(legacyPdfNavigation).join(safePdfNavigation);
const manticDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r})";
const manticDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:r,clientName:G.name,question:P,notes:n,resultSummary:wr?.reading||Pe.trim()||``})";
const numerologyDraftPayload = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e})";
const numerologyDraftPayloadWithDetails = "JSON.stringify({workspaceId:`ws_personal`,userId:window.Clerk&&window.Clerk.user&&window.Clerk.user.id||`browser-user`,appraisalId:e,clientName:j,question:P,notes:lt||dt||``,resultSummary:r.message||r.summary||``})";

if (patched.split(manticDraftPayload).length - 1 !== 1) {
  throw new Error("Expected one mantic draft payload.");
}
if (patched.split(numerologyDraftPayload).length - 1 !== 1) {
  throw new Error("Expected one numerology draft payload.");
}

const patchedWithDetails = patched
  .replace(manticDraftPayload, manticDraftPayloadWithDetails)
  .replace(numerologyDraftPayload, numerologyDraftPayloadWithDetails);
writeFileSync(legacyAssetPath, patchedWithDetails);

console.log("Legacy PDF exports and draft payloads patched for the production workspace.");