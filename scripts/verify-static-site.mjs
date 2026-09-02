import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "src/main.jsx",
  "src/styles.css",
  "vite.config.mjs",
  "favicon.svg",
  "legacy-static/README.md",
  "assets/index-CEGe-9Xe.css",
  "assets/index-CYZnnbch.js",
  "assets/framework-CXnKph_e.js",
  "assets/numeria-app-Cckhajir.js",
  "CLERK_AUTH_PLAN.md",
  "SUPABASE_MIGRATION_PLAN.md"
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `Missing required file: ${file}`);
}

const html = readFileSync("index.html", "utf8");
const appSource = readFileSync("src/main.jsx", "utf8");
const clerkPlan = readFileSync("CLERK_AUTH_PLAN.md", "utf8");
const supabasePlan = readFileSync("SUPABASE_MIGRATION_PLAN.md", "utf8");
assert.match(html, /Numeria Studio/);
assert.match(html, /\/src\/main\.jsx/);
assert.doesNotMatch(html, /https:\/\/numeria-studio\.karukimori\.workers\.dev/);
assert.match(appSource, /@clerk\/react/);
assert.match(appSource, /VITE_CLERK_PUBLISHABLE_KEY/);
assert.match(appSource, /VITE_ADMIN_EMAILS/);
assert.match(appSource, /illusionddt@gmail\.com/);
assert.match(appSource, /\/api\/embed\/feedback/);
assert.match(appSource, /numeria\.feedback\.mock\.last/);
assert.match(clerkPlan, /Authentication provider: Clerk/);
assert.match(clerkPlan, /illusionddt@gmail\.com/);
assert.match(supabasePlan, /new authentication direction is Clerk/);

console.log("Static Numeria Studio site backup verified.");
