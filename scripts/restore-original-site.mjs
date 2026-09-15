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
const adminReadinessPanel = `<script>window.NumeriaInstallReadinessAdmin=function(){if(window.__numeriaReadinessAdminInstalled)return;window.__numeriaReadinessAdminInstalled=!0;function pretty(data){try{return JSON.stringify(data,null,2)}catch(error){return String(data)}}function readValue(root,id,fallback){var input=root&&root.querySelector(id);var value=input&&input.value;return(value||fallback||"").trim()||fallback||""}async function fetchJson(url,headers){var response=await fetch(url,{headers:headers||{}});var data=await response.json();if(!response.ok){throw new Error(data&&data.message||"状態を取得できませんでした。")}return data}function addButton(actions,label,key){if(actions.querySelector('[data-readiness-check="'+key+'"]'))return;var button=document.createElement("button");button.type="button";button.setAttribute("data-readiness-check",key);button.textContent=label;actions.appendChild(button)}function enhance(){var root=document.getElementById("numeria-admin-mode");var panel=document.getElementById("numeria-admin-panel");var actions=panel&&panel.querySelector(".admin-actions");var output=document.getElementById("numeria-admin-output");if(!root||!panel||!actions||!output)return!1;addButton(actions,"リリース状態","release");addButton(actions,"永続化","persistence");addButton(actions,"連携状態","integrations");addButton(actions,"納品履歴","appraisals");if(actions.__numeriaReadinessListener)return!0;actions.__numeriaReadinessListener=!0;actions.addEventListener("click",async function(event){var button=event.target&&event.target.closest&&event.target.closest("[data-readiness-check]");if(!button)return;var kind=button.getAttribute("data-readiness-check");var workspaceId=readValue(root,"#numeria-admin-workspace","ws_personal");var userId=readValue(root,"#numeria-admin-user","browser-user");var email=function(){var user=window.Clerk&&window.Clerk.user;return user&&((user.primaryEmailAddress&&user.primaryEmailAddress.emailAddress)||(user.emailAddresses&&user.emailAddresses[0]&&user.emailAddresses[0].emailAddress))||""}();var headers={"X-Admin-Email":email,"X-Workspace-Id":workspaceId,"X-User-Id":userId};var url=kind==="release"?"/release/status":kind==="persistence"?"/persistence/status":kind==="integrations"?"/integrations/status":"/api/appraisals/status?workspaceId="+encodeURIComponent(workspaceId)+"&userId="+encodeURIComponent(userId);output.textContent="確認しています...";try{var data=await fetchJson(url,headers);output.textContent=pretty(data)}catch(error){output.textContent=error&&error.message||"状態を取得できませんでした。"}});return!0}function start(){enhance();var observer=null;if("MutationObserver"in window&&document.body){observer=new MutationObserver(function(){enhance()});observer.observe(document.body,{childList:!0,subtree:!0})}var tries=0;var timer=setInterval(function(){tries+=1;if(enhance()&&tries>8){clearInterval(timer)}else if(tries>240){clearInterval(timer);if(observer)observer.disconnect()}},250)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start()};window.NumeriaInstallReadinessAdmin();</script>`;

const productionHtml = originalHtml
  .replace(unsupportedStrategyGuard, "")
  .replace("</head>", `${adminReadinessPanel}</head>`);

writeFileSync("dist/original.html", productionHtml);
writeFileSync("dist/original", productionHtml);
cpSync("assets", "dist/assets", { recursive: true });

await import("./patch-legacy-static-assets.mjs");

console.log("Original Numeria Studio HTML and assets restored into dist with Clerk production verification compatibility.");
