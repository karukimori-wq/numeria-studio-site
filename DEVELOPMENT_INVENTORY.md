# Numeria Studio Site Development Inventory

Updated: 2026-09-15

Current app version: `0.3.9-billing-read-only`

## Current Position

Numeria Studio Site is in the Free / Pro release preparation phase.
Business remains a future branch and is not purchasable in this release.

The current production target is:

- https://numeria-studio-site.karukimori.workers.dev

## Recently Completed

- Clerk login shell and server-side auth readiness contract.
- Server-side Clerk JWT verification in observe/enforce modes.
- Clerk enforce-mode rollout readiness diagnostics.
- Free / Pro / Business plan recognition.
- Business unavailable state with `BUSINESS_PREPARING`.
- Free monthly appraisal limit.
- Free one in-progress appraisal limit.
- Free three appraisal client profiles.
- Pro unlimited appraisal, profiles, drafts, and history contract.
- D1 persistence for usage, drafts, appraisal client profiles, completed appraisals, and report exports.
- Appraisal history grouped by client.
- Appraisal history search.
- Follow-up start from visible appraisal history.
- Structured one-page PDF export and Japanese print-to-PDF flow.
- Feedback Hub Free/Pro intake contract with non-blocking Worker receipt.
- External integration readiness inventory for Growth Engine, Feedback Hub, AI Platform Core, Clerk, billing, and domain checks.
- Billing source readiness contract for Growth Engine or Stripe.
- External billing read-only guard that disables Numeria MVP plan switching once Growth Engine or Stripe is configured as the subscription source.
- Custom domain readiness diagnostics for Cloudflare Worker routing.
- Automated production smoke check for page, release, auth, domain, billing, persistence, AI usage, and APC endpoints.
- Strict auth release check for Clerk enforce readiness and enforce-mode confirmation.
- Growth Engine reservation handoff receiver with external reference-only storage.
- AI Platform Core usage event contract.
- AI Platform Core activity forwarding for official studio events.
- Admin preview panel with release, external-integration health, and release action inventory.

## Release Monitoring Endpoints

- `GET /health`
- `GET /version`
- `GET /contracts/status`
- `GET /release/status`
- `GET /integrations/status`
- `GET /auth/status`
- `GET /domain/status`
- `GET /billing/status`
- `GET /feedback-hub/status`
- `GET /growth-handoff/status`
- `GET /persistence/status`
- `GET /ai-usage/status`
- `GET /apc/status`

## Remaining Work

High priority:

- Confirm live Growth Engine or Stripe subscription fetch against production credentials and keep Numeria plan changes read-only when configured.
- Confirm Clerk enforce-mode rollout in production after token header behavior is verified, then run `verify:auth-release`.
- Configure Feedback Hub submit URL and confirm receipt correlation IDs in the external hub.

Medium priority:

- Improve native Japanese PDF typography beyond the current browser print flow.
- Prepare Growth Engine Business plan handoff without making Business purchasable.
- Keep documentation aligned with Free / Pro entitlement changes.

Low priority:

- Continue tightening admin release diagnostics as external apps mature.
- Point `NUMERIA_PRODUCTION_URL` at `numeria-studio.com` when the custom domain is stable and reuse the production smoke check there.

## Important Boundaries

Numeria owns:

- Session
- Report snapshot
- Appraisal logic
- Calculation result
- Numeria snapshot
- Appraisal client snapshot

Numeria must not become the source of truth for:

- Customer master
- Reservation
- Payment
- Sales
- Conversation
- Message
- AI Activity
- AI Usage

External data should be linked by reference IDs only.
