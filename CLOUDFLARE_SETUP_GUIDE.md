# Cloudflare Setup Guide

This repository is the backup and Cloudflare migration target for the important ChatGPT Sites deployment:

- Source site: https://numeria-studio.illusionddt.chatgpt.site
- GitHub repository: https://github.com/karukimori-wq/numeria-studio-site
- Cloudflare Worker production: https://numeria-studio-site.karukimori.workers.dev

## Current migration status

Cloudflare migration is deployed and verified.

Done:

- Static backup is committed to GitHub.
- Cloudflare Workers static asset config is committed.
- GitHub Actions workflow is committed.
- Static verification passes.
- Static build passes.
- Cloudflare deploy passes.
- Production verification passes.

## Required GitHub Secrets

These repository secrets are required for future deploys:

| Secret name | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Allows GitHub Actions to deploy to Cloudflare Workers. |
| `CLOUDFLARE_ACCOUNT_ID` | Tells Wrangler which Cloudflare account to deploy into. |

Do not commit these values into the repository.

## How to find Cloudflare Account ID

1. Open Cloudflare Dashboard.
2. Select the account or domain you want to use.
3. Copy the Account ID from the right-side account/API section.
4. Add it to GitHub as `CLOUDFLARE_ACCOUNT_ID`.

## How to create Cloudflare API Token

1. Open Cloudflare Dashboard.
2. Go to **My Profile**.
3. Open **API Tokens**.
4. Select **Create Token**.
5. Use a Workers deploy capable token.
6. Add the token to GitHub as `CLOUDFLARE_API_TOKEN`.

Recommended minimum scope:

- Account: Workers Scripts Edit
- Account: Workers Tail Read is optional
- Account: Account Settings Read may be required by Wrangler

If Cloudflare asks for a specific account resource, select the target account only.

## How to add or replace GitHub Secrets

1. Open: https://github.com/karukimori-wq/numeria-studio-site/settings/secrets/actions
2. Click **New repository secret** or update the existing secret.
3. Add or replace `CLOUDFLARE_API_TOKEN`.
4. Add or replace `CLOUDFLARE_ACCOUNT_ID`.

## How to redeploy

1. Open: https://github.com/karukimori-wq/numeria-studio-site/actions/workflows/cloudflare-production.yml
2. Click **Run workflow**.
3. Select branch `main`.
4. Click the green **Run workflow** button.
5. Wait for the run to become green.

Production URL:

- https://numeria-studio-site.karukimori.workers.dev

## Admin email handling

The requested admin email is:

- `illusionddt@gmail.com`

For security, admin identity should not be treated as public repository source code when real login is implemented.

Use environment configuration instead, for example:

- GitHub Secret or Cloudflare environment variable: `ADMIN_EMAILS`
- Value: the admin email address

This static backup does not include the original ChatGPT Sites editable project permissions or hidden admin state. It only preserves the public site output and deploys that output to Cloudflare.

## What this migration does not include

This migration does not export or recreate:

- ChatGPT Sites ownership permissions
- ChatGPT Sites editor/admin roles
- Private deployment tokens
- Hidden runtime metadata
- Server-side login state

Those must be configured separately in the destination platform if needed.
