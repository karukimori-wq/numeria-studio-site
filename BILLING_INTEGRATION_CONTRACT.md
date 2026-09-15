# Numeria Studio Billing Integration Contract

Updated: 2026-09-15

## Purpose

Numeria Studio should not become the billing source of truth.
For the Free / Pro release, Numeria can keep using its Worker MVP subscription
state until Growth Engine or Stripe subscription status is available.

When an external billing source is configured, Numeria reads the subscription
state and applies the returned `planId` to entitlement checks.
At that point, Numeria's MVP plan switching endpoint becomes read-only by
default so Growth Engine or Stripe remains the subscription source of truth.

## Runtime Configuration

Preferred Growth Engine configuration:

- `GROWTH_ENGINE_BILLING_STATUS_URL`
- `GROWTH_ENGINE_API_TOKEN`

Optional Stripe-direct configuration:

- `STRIPE_SUBSCRIPTION_STATUS_URL`
- `BILLING_STATUS_API_TOKEN`

Safety:

- Secrets are never returned by `/billing/status`.
- External billing fetch timeout defaults to `1500ms`.
- `BILLING_STATUS_TIMEOUT_MS` may tune the timeout up to `5000ms`.
- Fetch failures fall back to the Numeria Worker MVP subscription state.
- `NUMERIA_ENABLE_MVP_PLAN_SWITCHING=1` can temporarily allow local or test plan
  switching even when an external billing URL is configured.

## Numeria Status Endpoint

`GET /billing/status`

Returns readiness only. It does not fetch a user's live subscription.

Example:

```json
{
  "status": "success",
  "appId": "numeria-studio",
  "billingContractVersion": "growth-engine-stripe-subscription-readiness.v1",
  "configured": true,
  "provider": "growth-engine",
  "subscriptionSource": "external-readiness",
  "sourceOfTruth": "growth-engine",
  "tokenConfigured": true,
  "timeoutMs": 1500,
  "mvpPlanSwitchingEnabled": false,
  "supportedPlans": ["free", "pro"],
  "businessPurchasable": false,
  "failurePolicy": "fallback_to_mvp_subscription",
  "secretValuesReturned": false
}
```

## External Billing Request

When configured, Numeria calls the configured URL with query parameters:

- `workspaceId`
- `userId`
- `appId=numeria-studio`

Headers:

- `Accept: application/json`
- `Authorization: Bearer <token>` when a token is configured

## Expected External Billing Response

Preferred response:

```json
{
  "status": "success",
  "subscription": {
    "planId": "pro",
    "billingStatus": "active",
    "currentPeriod": "2026-09",
    "source": "growth-engine"
  }
}
```

Accepted aliases:

- `subscription.planId`
- `subscription.currentPlan`
- `subscription.currentPlanId`
- top-level `planId`
- `subscription.billingStatus` or `subscription.status`
- `subscription.currentPeriod` or `subscription.billingMonth`

## Plan Behavior

- `free`: Apply Free limits.
- `pro`: Apply Pro entitlements.
- `business`: Treated as preparing and falls back to MVP state in this release.

Business remains unavailable for purchase in Numeria Studio during the Free / Pro
release.

## Plan Mutation Behavior

`PATCH /api/billing/subscription` is kept for MVP and local verification.
When Growth Engine or Stripe is configured as the billing source, the endpoint
returns `409 EXTERNAL_BILLING_SOURCE_READ_ONLY` unless
`NUMERIA_ENABLE_MVP_PLAN_SWITCHING=1` is explicitly set.
