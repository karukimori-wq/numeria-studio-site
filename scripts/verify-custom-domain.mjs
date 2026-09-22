import assert from "node:assert/strict";

const baseUrl = String(process.env.NUMERIA_CUSTOM_DOMAIN_URL || "https://numeria-studio.com").replace(/\/$/, "");

async function fetchWithRetry(path, accept, predicate, attempts = 10) {
  let response;
  let bodyText = "";
  let parsed = null;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: { Accept: accept },
        redirect: "follow",
      });
      bodyText = await response.text();
      parsed = null;
      if (/application\/json/.test(response.headers.get("content-type") || "")) {
        parsed = JSON.parse(bodyText);
      }
      if (response.ok && predicate({ response, bodyText, parsed })) {
        return { response, bodyText, parsed };
      }
      lastError = new Error(`${path} returned unexpected response (${response.status})`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
  }
  throw lastError || new Error(`${path} custom-domain smoke failed`);
}

const root = await fetchWithRetry(
  "/",
  "text/html",
  ({ bodyText }) => /Numeria Studio/.test(bodyText),
);
assert.equal(root.response.url.startsWith(baseUrl), true, "Custom domain root must stay on numeria-studio.com");

const health = await fetchWithRetry(
  "/health",
  "application/json",
  ({ parsed }) => parsed?.appId === "numeria-studio" && parsed?.status === "success",
);
assert.equal(health.parsed.appId, "numeria-studio");

const domain = await fetchWithRetry(
  "/domain/status",
  "application/json",
  ({ parsed }) => parsed?.appId === "numeria-studio" && parsed?.currentRoute === "custom-domain",
);
assert.equal(domain.parsed.currentRoute, "custom-domain");
assert.equal(domain.parsed.secretValuesReturned, false);

const auth = await fetchWithRetry(
  "/auth/status",
  "application/json",
  ({ parsed }) => parsed?.appId === "numeria-studio" && parsed?.authProvider === "clerk" && parsed?.enforcementMode === "enforce",
);
assert.equal(auth.parsed.authProvider, "clerk");
assert.equal(auth.parsed.enforcementMode, "enforce");
assert.equal(auth.parsed.secretValuesReturned, false);

const authConfig = await fetchWithRetry(
  "/api/auth/config",
  "application/json",
  ({ parsed }) => typeof parsed?.publishableKey === "string" && parsed.publishableKey.startsWith("pk_"),
);
assert.match(authConfig.parsed.publishableKey, /^pk_/);
assert.equal("secretKey" in authConfig.parsed, false, "Auth config must not expose a Clerk secret key");

console.log(`Numeria custom domain smoke verified at ${baseUrl}`);
