# Numeria Studio Free / Pro Release Plan

Numeria Studio is being prepared for a Free / Pro release.
Business is intentionally kept as a future branch and is not purchasable in this release.

## Plan Definitions

### Free

User-facing description:

> 月20件までの鑑定と、3名までの鑑定対象者管理を無料で試せます。

Includes:

- Monthly appraisals: 20
- Appraisal client snapshots: 3
- Basic appraisal
- Basic report
- Appraisal history
- Basic templates
- AI assistance within the free quota

Does not include:

- PDF export
- Branded reports
- Detailed reports
- Unlimited history

### Pro

User-facing description:

> 件数を気にせず、鑑定とレポート作成を仕事で使えます。

Includes:

- Unlimited appraisals
- Unlimited appraisal client snapshots
- Everything in Free
- Detailed appraisal
- Detailed report
- PDF export
- Branded reports
- Report text adjustment
- Unlimited appraisal history
- Past appraisal search
- Client-specific appraisal history
- Session notes
- AI-assisted consultation organization and deepening
- AI-assisted tone adjustment

### Business

Status: preparing.

Business remains unavailable for purchase in this release.
The branch exists only so Growth Engine, reservations, sales, payment, and cross-app integrations can be added safely later.

## Data Responsibility

Numeria Studio keeps only Numeria-owned appraisal data:

- Session
- Report
- Appraisal logic
- Calculation result
- Numeria snapshot
- Appraisal client snapshot

Numeria Studio must not become the source of truth for:

- Customer master
- Reservation
- Payment
- Sales
- Conversation
- Message
- AI Activity
- AI Usage

Business integrations should pass reference IDs only.

## Current Implementation

- Plan IDs: `free`, `pro`, `business`
- Existing users default to Free.
- Entitlements are defined in `src/plan-config.js`.
- Pricing labels are environment-driven:
  - `VITE_PRICE_FREE_LABEL`
  - `VITE_PRICE_PRO_LABEL`
  - `VITE_PRICE_BUSINESS_LABEL`
- Worker API enforces Free limits:
  - `POST /api/sessions/start`
  - `POST /api/appraisal-clients`
- Usage and billing status APIs:
  - `GET /api/usage`
  - `GET /api/billing/subscription`
  - `PATCH /api/billing/subscription`
- Business returns `BUSINESS_PREPARING`.

## Release Caveat

The current Worker implementation enforces limits at the Cloudflare Worker layer.
For long-term durable billing periods, the usage store should be moved to D1 or another protected billing store before paid traffic scales.

The design already uses `workspaceId + userId + billingMonth`, so the reset can later follow a Stripe billing period without changing the UI contract.
