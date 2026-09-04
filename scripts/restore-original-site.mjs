import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("dist")) {
  throw new Error("dist directory does not exist. Run vite build first.");
}

mkdirSync("dist/assets", { recursive: true });

const originalHtml = readFileSync("original.html", "utf8");
const unsupportedStrategyGuard = 'var strategies=supportedStrategies(signUp);if(!strategies.includes("email_code")){return{signUp:signUp,error:{message:"メール確認方式が現在のログイン設定で許可されていません。本番用のログイン設定を確認してください。"}}}';

if (!originalHtml.includes(unsupportedStrategyGuard)) {
  throw new Error("Expected Clerk email verification guard was not found in original.html.");
}

// Clerk's production instance can require email verification even when the legacy
// SignUp resource does not expose supportedStrategies at the location used by the
// compatibility bridge. The Clerk legacy API supports calling
// prepareEmailAddressVerification({ strategy: 'email_code' }) directly; Clerk then
// validates the configured strategy and returns the authoritative error if needed.
const productionHtml = originalHtml.replace(unsupportedStrategyGuard, "");

writeFileSync("dist/original.html", productionHtml);
writeFileSync("dist/original", productionHtml);
cpSync("assets", "dist/assets", { recursive: true });

console.log("Original Numeria Studio HTML and assets restored into dist with Clerk production verification compatibility.");
