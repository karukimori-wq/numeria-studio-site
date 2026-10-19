# Numeria Studio LP: Phase 5 Auth & Cutover Readiness

Status: PRE-FLIGHT ONLY / 2026-10-20. This document does **not** authorize the production root cutover.

## Confirmed from code (main at audit time)

- `index.html` currently redirects the browser to `/original.html`. The Worker serves the legacy app via `originalHtmlResponse` and SPA fallbacks. Do not replace this behavior during preview work.
- `src/auth-gate.js` uses the Clerk browser SDK's `openSignIn` / `openSignUp` UI and redirects to `/` on success. Standalone `/sign-in` and `/sign-up` pages **must not** be assumed to exist.
- `src/worker.js` uses `AUTH_ENFORCEMENT_MODE` with `observe` as a fallback default. The **actual deployed mode and secrets were not verified** in this work. The production security gate is to verify `/auth/status`, JWT checks and protected APIs before enabling a public auth cutover.
- `src/plan-config.js` is the code-level Free/Pro entitlement definition. Free: 20 completions per calendar month, 3 client profiles, 1 in-progress draft, 3 visible completed appraisals, basic report and PDF. Pro: unlimited counts, detailed reporting, text and branding controls. `VITE_PRICE_PRO_LABEL` controls the price label; fallback is `価格未設定`. Do not hardcode a proposed Pro price on the public LP until payment and live display agree.
- Business is listed as unavailable/preparing. Do not offer it as purchasable.
- Isolated preview Worker `numeria-studio-lp-preview` must remain unbound to Clerk, Stripe, D1, GE and APC. Its buttons intentionally report that sign-in/registration are not connected.
- Existing PR #43 is a Draft. No changes to production root `/` or deployed app auth in this work.

## Gated path to production public LP

1. **Evidence capture / backup:** record the production `main` commit, Cloudflare Worker version ID, current route / auth configuration, rollback target and passing app smoke tests. Preserve `/original.html` and all static asset URLs.
2. **Auth architecture approval:** choose ONE implementation for the public LP to trigger Clerk sign-in/sign-up safely: a dedicated app auth entry route that opens Clerk, or a validated standalone auth page. Avoid an untested redirect to `/sign-in` or `/sign-up`. The LP should not handle tokens itself.
3. **Route matrix (do not implement until security gate):**
   - Guest GET `/` → public LP; authenticated GET `/` → app home after auth state is resolved, without flashing LP
   - Guest LP "無料で始める" → Clerk sign-up; "ログイン" → Clerk sign-in
   - Successful auth → authenticated app home; logout → LP; failed/cancelled auth → safe guest state
   - `/original.html` → backward-compatible app entry, access control preserved
   - `/app` → authenticated app route (requires server-verified authorization for private APIs)
   - `/welcome` → preview while reviewing; avoid exposing authenticated or customer data through preview cache
4. **Protected API checks:** verify non-authenticated protected endpoints return 401 in enforce mode; test Clerk JWT verification, tenant/workspace ownership, role checks, 403 cross-user scope denial, session expiration and user logout.
5. **Plan/price checks:** compare billing provider's actual Pro price/tax and Stripe subscription configuration with displayed LP and app; compare Free/Pro feature gates against `src/plan-config.js` and current product.
6. **Real report examples:** create reports using a fictional customer via the real NS export pipeline. Review PDF cover and inside pages, remove all real personal data and secrets, obtain usage rights for all illustrations. Keep mock/demo markers until accepted.
7. **Staged deployment:** review PR, run `npm test`, `npm run build`, browser QA and API regression, deploy to a separate preview, test iPhone Safari/Android Chrome and production-equivalent auth without touching the live root.
8. **Owner approval and switch:** get explicit owner approval and G0–G7 acceptance records before changing `/` routing. Record deployment SHA and test rollback. Do not merge a preview-only PR as a substitute for cutover review.

## Current known blockers

| Blocker | Evidence | Required before production |
|---|---|---|
| Login redirect semantics | `src/auth-gate.js` uses Clerk popups and `/` as post-auth return | Design/test exact safe LP→auth→app flow |
| API auth readiness | Worker falls back to `observe`; deployed `/auth/status` not checked here | Verify enforced server-side auth, tenant isolation, non-logged-in 401 and session recovery |
| Pro public pricing | `src/plan-config.js` has `価格未設定` as fallback | Verify active billing setup, charge amount/tax, copy and cancellation terms |
| Authentic report imagery | No exported, reviewed sample PDF was obtained for LP | Generate/review actual exported dummy report |
| Mobile release | Chromium viewport tests pass; physical mobile Safari/Chrome were not tested | iPhone/Android device acceptance |
| Production rollback | No full current production SHA/version and recovery validation | Capture and rehearse rollback before root cutover |

## Notion

- LP v1.1 specification: https://app.notion.com/p/3fce71121fed81588975eec3a4ad6e51
- LP implementation plan: https://app.notion.com/p/3fce71121fed81dabee5f22d00caf637
- Phase 4 QA: https://app.notion.com/p/3fee71121fed81f5af47f69e164f73e3
