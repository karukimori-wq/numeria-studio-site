import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const auth = scripts.find((script) => script.includes("async function initAuth()"));
assert.ok(auth, "LP authentication script exists");
new vm.Script(auth, { filename: "index.html:inline-auth" });
for (const expected of [
  "authReady=null",
  "AUTH_CONFIG",
  "AUTH_KEY",
  "AUTH_SCRIPT",
  "AUTH_INIT",
  "AUTH_DIALOG",
  "Clerk load failed",
  "Clerk dialog failed",
]) assert.ok(auth.includes(expected), `Missing auth diagnostic: ${expected}`);
console.log("LP Clerk auth syntax and diagnostic guards passed");
