# Cloudflare Migration

This repository preserves the ChatGPT Sites public build for:

- https://numeria-studio.illusionddt.chatgpt.site

## Target

- Cloudflare Worker name: numeria-studio-site
- Expected Workers URL: https://numeria-studio-site.karukimori.workers.dev

## Required GitHub Actions secrets

Add these secrets to this repository before running the workflow:

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

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
