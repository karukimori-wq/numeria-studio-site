# Cloudflare Migration

This repository preserves the ChatGPT Sites public build for:

- https://numeria-studio.illusionddt.chatgpt.site

## Target

- Cloudflare Worker name: numeria-studio-site
- Expected Workers URL: https://numeria-studio-site.karukimori.workers.dev

## Current status

The repository is ready for Cloudflare deployment.

Already completed:

- Static backup committed
- `npm test` static verification configured
- `npm run build` copies files to `dist/`
- `wrangler.jsonc` configured for Workers Static Assets
- GitHub Actions workflow configured

Current blocker:

- `CLOUDFLARE_API_TOKEN` is not set in GitHub Actions secrets.
- `CLOUDFLARE_ACCOUNT_ID` is not set in GitHub Actions secrets.

The latest workflow reached build successfully and failed only at the Cloudflare configuration check.

## Required GitHub Actions secrets

Add these secrets to this repository before running the workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Do not commit these values to the repository.

Detailed setup guide:

- [CLOUDFLARE_SETUP_GUIDE.md](CLOUDFLARE_SETUP_GUIDE.md)

## Local commands

```bash
npm test
npm run build
npm run smoke
```

## Deployment

Run the GitHub Actions workflow:

- Cloudflare Production

The workflow verifies the static backup, copies the public site files to `dist/`, deploys with Wrangler, and checks the production page.

## Admin identity

If login/admin features are implemented later, keep admin configuration outside public source code.

Recommended environment variable name:

- `ADMIN_EMAILS`

Requested admin email:

- `illusionddt@gmail.com`

This backup does not include ChatGPT Sites ownership, editor roles, hidden admin state, or private deployment tokens.
