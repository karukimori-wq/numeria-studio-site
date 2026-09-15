# Numeria Studio ChatGPT Sites Backup

Backup source:

- https://numeria-studio.illusionddt.chatgpt.site

Cloudflare production:

- https://numeria-studio-site.karukimori.workers.dev

Captured at:

- 2026-09-02 UTC

Contents:

- Editable React/Vite application rebuilt from the ChatGPT Sites backup direction
- CSS, JavaScript, favicon, and font assets referenced by the page
- Converted local links for repository-root inspection
- Cloudflare Workers Static Assets deployment configuration
- GitHub Actions workflow for Cloudflare deployment
- Clerk authentication migration plan and implementation scaffold
- Free / Pro plan, usage, and entitlement release scaffold

## Migration status

Cloudflare migration is deployed.

Completed:

- Static backup committed to GitHub
- Editable Vite app scaffold committed
- Clerk login/sign-up entry added
- Clerk CLI added as a project dev dependency
- Existing Clerk app recorded: `AITEC Apps` / `app_3ImOuQXNBc9Rpqs3XoJEtw2NogR` / Development
- Admin candidate email configured as `illusionddt@gmail.com`
- Feedback Hub question/improvement UI added with Numeria Worker intake and mock fallback
- Free / Pro pricing comparison UI added
- Free usage counters added: completed appraisals, in-progress draft, and latest visible history
- Worker API limit checks added for completed appraisals and one unfinished draft
- Business plan shown as preparing and not purchasable
- Static verification passes in GitHub Actions
- Static build passes in GitHub Actions
- Wrangler config committed
- Cloudflare Production workflow committed
- Cloudflare Workers deployment succeeded
- Production verification succeeded

Current Cloudflare URL:

- https://numeria-studio-site.karukimori.workers.dev

Operational notes:

- The ChatGPT Sites URL remains the original source backup target.
- The Cloudflare Workers URL is the migrated static production target.
- Future Cloudflare redeploys run through the `Cloudflare Production` GitHub Actions workflow.

Setup and operations guide:

- [CLOUDFLARE_SETUP_GUIDE.md](CLOUDFLARE_SETUP_GUIDE.md)
- [CLERK_AUTH_PLAN.md](CLERK_AUTH_PLAN.md)
- [SUPABASE_MIGRATION_PLAN.md](SUPABASE_MIGRATION_PLAN.md)

Important notes:

- The original ChatGPT Sites public build is retained in `original.html` and restored to `/original` during the production build.
- Runtime APIs, hidden project metadata, deployment permissions, and ChatGPT Sites admin state are not included.
- Login/signup now uses the Clerk migration scaffold. It becomes active after `VITE_CLERK_PUBLISHABLE_KEY` is configured in GitHub Actions Variables or Secrets.
- Existing signed-in users default to Free until a protected billing system upgrades them.
- Supabase should be retired as the primary login provider after Clerk is implemented. Keep Supabase only for database/storage if still needed.
- Do not commit Cloudflare tokens, account secrets, or admin-login secrets to the repository.

## Clerk setup

Set this in GitHub Actions Variables or Secrets:

- `VITE_CLERK_APPLICATION_ID=app_3ImOuQXNBc9Rpqs3XoJEtw2NogR`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_ADMIN_EMAILS=illusionddt@gmail.com`

Optional:

- `VITE_FEEDBACK_HUB_BASE_URL`
- `FEEDBACK_HUB_BASE_URL`
- `FEEDBACK_HUB_SUBMIT_URL`
- `FEEDBACK_HUB_API_TOKEN`
- `GROWTH_ENGINE_BILLING_STATUS_URL`
- `GROWTH_ENGINE_API_TOKEN`
- `STRIPE_SUBSCRIPTION_STATUS_URL`
- `BILLING_STATUS_API_TOKEN`
- `NUMERIA_ENABLE_MVP_PLAN_SWITCHING`
- `AI_PLATFORM_CORE_BASE_URL`
- `APC_ACTIVITIES_URL`
- `APC_API_TOKEN`
- `VITE_PRICE_FREE_LABEL`
- `VITE_PRICE_PRO_LABEL`
- `VITE_PRICE_BUSINESS_LABEL`

AI Platform Core forwarding is non-blocking. When `AI_PLATFORM_CORE_BASE_URL`
or `APC_ACTIVITIES_URL` is configured, the Worker forwards these activity
events without returning secret values:

- `studio.session.started.v1`
- `studio.session.completed.v1`
- `studio.report.generated.v1`

Feedback Hub intake is available at `POST /api/feedback/submit`. It accepts
Free and Pro questions or improvement requests without requiring Business or a
billing success state. When `FEEDBACK_HUB_BASE_URL` or `FEEDBACK_HUB_SUBMIT_URL`
is configured, the Worker forwards the request and keeps a non-blocking local
receipt if forwarding fails.

External release dependencies can be reviewed through `GET /integrations/status`.
It summarizes Growth Engine, Feedback Hub, AI Platform Core, Clerk, billing, and
domain readiness for the Free / Pro release without returning secret values.

When Growth Engine or Stripe is configured as the billing source, Numeria reads
that subscription state and disables direct MVP plan switching by default.

Backend-only Clerk secrets such as `CLERK_SECRET_KEY` must not be committed to this repository.

## Free / Pro release

Free:

- Monthly completed appraisals: 20, counted when the appraisal completion button is pressed
- In-progress draft appraisals: 1 account-wide unfinished appraisal
- Appraisal client profiles: 3
- Visible completed appraisal details: latest 3 completed appraisals
- PDF export, basic appraisal, structured basic report, and basic templates

Pro:

- Unlimited completed appraisals
- Unlimited in-progress draft appraisals
- Unlimited appraisal client profiles and completed appraisal history
- Detailed reports
- PDF export
- Branded reports
- Report text adjustment
- Search and client-specific appraisal history

Business:

- Preparing
- Not purchasable in this release
- Reserved for Growth Engine and cross-app integrations
- Growth Engine reservation handoff is accepted as external references only
- Customer, reservation, payment, and sales records remain owned by Growth Engine

See [FREE_PRO_RELEASE_PLAN.md](FREE_PRO_RELEASE_PLAN.md) for the release contract and remaining durable billing notes.
See [BILLING_INTEGRATION_CONTRACT.md](BILLING_INTEGRATION_CONTRACT.md) for the Growth Engine / Stripe billing read contract.

Release monitoring endpoints:

- `GET /health`
- `GET /version`
- `GET /contracts/status`
- `GET /release/status`
- `GET /auth/status`
- `GET /domain/status`
- `GET /billing/status`
- `GET /growth-handoff/status`
- `GET /persistence/status`
- `GET /ai-usage/status`
- `GET /apc/status`

`GET /auth/status` includes Clerk enforce-mode rollout readiness without returning backend secrets.
`GET /domain/status` reports whether the current request reached the Worker through the expected custom domain or the Workers fallback host.
`GET /growth-handoff/status` confirms that Growth Engine reservation references can be received without enabling Business purchase, payment, sales, or customer-master storage inside Numeria.

Production smoke check:

- `npm run verify:production`
- `NUMERIA_PRODUCTION_URL=https://numeria-studio.com npm run verify:production`
- `NUMERIA_PRODUCTION_URL=https://numeria-studio.com npm run verify:auth-release`

The production check verifies the page, release contracts, auth, domain, billing, persistence, AI usage, and APC status endpoints without expecting secrets to be returned.
The auth release check uses the same endpoint set but requires Clerk enforce readiness and `AUTH_ENFORCEMENT_MODE=enforce`, so run it after signed-in production API traffic has been verified.

PDF reports:

- Worker PDF export uses `numeria-report-template.v1`.
- Free can export the structured basic report.
- Pro can export detailed reports and hide Numeria branding.
- Report exports include a delivery snapshot for prepaid/postpaid partial preview, paid amount, expected amount, and delivery due date.
- Native Japanese PDF output remains available through the browser print-to-PDF flow.

Clerk CLI note:

- `npx clerk auth login`
- `npx clerk init --app app_3ImOuQXNBc9Rpqs3XoJEtw2NogR`
- `npx clerk doctor`

Run these CLI commands on a local machine where the browser callback to `127.0.0.1` can reach the CLI.
The remote Codex environment can install and start the CLI, but the login callback opens on the user's
computer and does not complete the remote CLI session.

Open locally:

1. Clone or download this repository.
2. Open `index.html` in a browser.

Repository layout:

- `index.html`
- `src/`
- `favicon.svg`
- `assets/`
- `legacy-static/`
- `wrangler.jsonc`
- `.github/workflows/cloudflare-production.yml`
- `CLOUDFLARE_MIGRATION.md`
- `CLOUDFLARE_SETUP_GUIDE.md`
- `CLERK_AUTH_PLAN.md`
- `SUPABASE_MIGRATION_PLAN.md`
- `ADMIN_BACKUP.md`
