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

## Migration status

Cloudflare migration is deployed.

Completed:

- Static backup committed to GitHub
- Editable Vite app scaffold committed
- Clerk login/sign-up entry added
- Admin candidate email configured as `illusionddt@gmail.com`
- Feedback Hub question/improvement UI added with mock fallback
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

- The original ChatGPT Sites public build is retained under `legacy-static/`.
- Runtime APIs, hidden project metadata, deployment permissions, and ChatGPT Sites admin state are not included.
- Login/signup now uses the Clerk migration scaffold. It becomes active after `VITE_CLERK_PUBLISHABLE_KEY` is configured in GitHub Actions Variables or Secrets.
- Supabase should be retired as the primary login provider after Clerk is implemented. Keep Supabase only for database/storage if still needed.
- Do not commit Cloudflare tokens, account secrets, or admin-login secrets to the repository.

## Clerk setup

Set this in GitHub Actions Variables or Secrets:

- `VITE_CLERK_PUBLISHABLE_KEY`

Optional:

- `VITE_FEEDBACK_HUB_BASE_URL`

Backend-only Clerk secrets such as `CLERK_SECRET_KEY` must not be committed to this repository.

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
