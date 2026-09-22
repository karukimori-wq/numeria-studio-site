import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = "dist/original.html";
const source = readFileSync(htmlPath, "utf8");

function replaceExactly(input, legacyValue, replacementValue, expectedCount, label) {
  const count = input.split(legacyValue).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${count}.`);
  }
  return input.split(legacyValue).join(replacementValue);
}

const legacyHeaders = 'var headers={"X-Admin-Email":getEmail(),"X-Workspace-Id":workspaceId,"X-User-Id":userId};if(kind==="auth"&&window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){var token=await window.Clerk.session.getToken().catch(function(){return""});if(token)headers.Authorization="Bearer "+token}';
const secureHeaders = 'var headers={"X-Workspace-Id":workspaceId,"X-User-Id":userId};if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function"){var token=await window.Clerk.session.getToken().catch(function(){return""});if(token)headers.Authorization="Bearer "+token}';

const patched = replaceExactly(
  source,
  legacyHeaders,
  secureHeaders,
  1,
  "admin readiness authentication block",
);

if (patched.includes('"X-Admin-Email":getEmail()')) {
  throw new Error("Admin readiness panel still trusts the browser-provided admin email header.");
}
if (!patched.includes('if(window.Clerk&&window.Clerk.session&&typeof window.Clerk.session.getToken==="function")')) {
  throw new Error("Admin readiness panel no longer attaches a Clerk session token.");
}

writeFileSync(htmlPath, patched);
console.log("Admin readiness panel now authenticates every protected check with Clerk and does not self-assert admin email authority.");
