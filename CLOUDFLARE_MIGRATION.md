# Cloudflare Migration

This repository preserves the ChatGPT Sites public build for:

- https://numeria-studio.illusionddt.chatgpt.site

## Production target

- Cloudflare Worker name: numeria-studio-site
- Workers URL: https://numeria-studio-site.karukimori.workers.dev

## Current status

Cloudflare migration is deployed and verified.

Completed:

- Static backup committed
- `npm test` static verification configured and passing
- `npm run build` copies files to `dist/` and passes
- `wrangler.jsonc` configured for Workers Static Assets
- GitHub Actions workflow configured
- Cloudflare secrets configured in GitHub Actions
- Cloudflare Workers deployment succeeded
- Production page verification succeeded

Latest successful path:

- GitHub Actions workflow: Cloudflare Production
- Deploy command: `npx wrangler deploy`
- Verification target: `/` or `/index.html`

## Required GitHub Actions secrets

These secrets are required for future deploys:

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

The workflow verifies the static backup, copies the public site files to `dist/`, deploys with Wrangler, and checks the production page with retry handling for Cloudflare propagation delay.

## Admin identity

If login/admin features are implemented later, keep admin configuration outside public source code.

Recommended environment variable name:

- `ADMIN_EMAILS`

Requested admin email:

- `illusionddt@gmail.com`

This backup does not include ChatGPT Sites ownership, editor roles, hidden admin state, or private deployment tokens.
