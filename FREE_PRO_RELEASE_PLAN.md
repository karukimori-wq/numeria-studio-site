# Numeria Studio Free / Pro Release Plan

Numeria Studio is being prepared for a Free / Pro release.
Business is intentionally kept as a future branch and is not purchasable in this release.

## Plan Definitions

### Free

User-facing description:

> 月20件まで鑑定でき、鑑定完成ボタンを押した時点で1件として数えます。途中保存は1案件まで、鑑定対象者プロフィール登録とPDF出力は無料で使えます。

Includes:

- Monthly completed appraisals: 20
- Count trigger: pressing the appraisal completed button
- In-progress draft appraisals: 1 account-wide unfinished appraisal
- Appraisal client profiles: unlimited
- Visible completed appraisal details: latest 3 completed appraisals
- PDF export
- Basic appraisal
- Basic report
- Basic templates
- AI assistance within the free quota

Does not include:

- Branded reports
- Detailed reports
- Unlimited in-progress appraisals
- Unlimited completed appraisal history

### Pro

User-facing description:

> 件数を気にせず、鑑定とレポート作成を仕事で使えます。

Includes:

- Unlimited completed appraisals
- Unlimited in-progress appraisals
- Unlimited completed appraisal history
- Unlimited appraisal client profiles
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
- Release monitoring endpoints:
  - `GET /health`
  - `GET /version`
  - `GET /contracts/status`
- Pricing labels are environment-driven:
  - `VITE_PRICE_FREE_LABEL`
  - `VITE_PRICE_PRO_LABEL`
  - `VITE_PRICE_BUSINESS_LABEL`
- Worker API enforces Free limits:
  - `POST /api/sessions/start` starts work without incrementing monthly completed count
  - `POST /api/appraisals/save-draft` enforces the 1 unfinished appraisal limit
  - `POST /api/appraisals/complete` increments monthly completed count and updates latest-history visibility
  - `POST /api/appraisal-clients` keeps profile count unlimited
- Usage and billing status APIs:
  - `GET /api/usage`
  - `GET /api/billing/subscription`
  - `PATCH /api/billing/subscription`
- Business returns `BUSINESS_PREPARING`.

## Release Caveat

The current Worker implementation enforces limits at the Cloudflare Worker layer.
For long-term durable billing periods, the usage store should be moved to D1 or another protected billing store before paid traffic scales.

The design already uses `workspaceId + userId + billingMonth`, so the reset can later follow a Stripe billing period without changing the UI contract.

The D1 schema foundation is prepared in `migrations/0001_numeria_usage_store.sql`.
Bind it as `NUMERIA_DB` before switching production persistence from `runtime-memory` to `durable-d1`.
The live readiness check is exposed at `GET /persistence/status`.

## Deployment Notes

- 2026-09-02: Triggered Cloudflare Production after Free / Pro release controls were merged to main.