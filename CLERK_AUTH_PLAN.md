# Clerk Authentication Plan

Numeria Studio will use Clerk as the authentication provider.
Supabase should no longer be the primary login provider.

## Decision

- Authentication provider: Clerk
- Clerk application: `AITEC Apps`
- Clerk application ID: `app_3ImOuQXNBc9Rpqs3XoJEtw2NogR`
- Clerk environment: Development
- Primary production host: Cloudflare Workers Static Assets
- Current production URL: `https://numeria-studio-site.karukimori.workers.dev`
- Requested admin email: `illusionddt@gmail.com`

## Why Clerk

- Clerk owns sign-in, sign-up, password reset, email verification, and user sessions.
- Supabase can be reduced to database/storage responsibilities if still needed.
- Admin authorization can be managed through Clerk-controlled metadata or a protected backend table.
- Frontend can use Clerk publishable keys, while secret keys remain in protected backend secrets.

## Required Clerk Configuration

Use the existing Clerk application:

- Application name: `AITEC Apps`
- Application ID: `app_3ImOuQXNBc9Rpqs3XoJEtw2NogR`
- Environment: Development

Configure:

- Production domain: `numeria-studio-site.karukimori.workers.dev`
- Allowed redirect URL: `https://numeria-studio-site.karukimori.workers.dev/*`
- Allowed origin: `https://numeria-studio-site.karukimori.workers.dev`

If a custom domain is attached later, also add that domain to Clerk.

## Environment Variables

Frontend-safe:

- `VITE_CLERK_APPLICATION_ID=app_3ImOuQXNBc9Rpqs3XoJEtw2NogR`
- `VITE_CLERK_PUBLISHABLE_KEY` or equivalent framework-specific public key name
- `VITE_ADMIN_EMAILS=illusionddt@gmail.com`

Backend-only:

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

Do not commit backend-only values to GitHub.

## Clerk CLI Status

The Clerk CLI is installed as a project dev dependency so setup commands can run through `npx clerk`.
Global installation is not required for this repository.

The remote Codex environment can start `npx clerk auth login`, but the browser callback uses
`127.0.0.1` on the operator's computer. That callback does not reach the remote CLI process.
For CLI linking, run the following from a local checkout on a computer where the browser and CLI
share the same localhost:

```bash
npx clerk auth login
npx clerk init --app app_3ImOuQXNBc9Rpqs3XoJEtw2NogR
npx clerk doctor
```

This repository already contains the Vite/React Clerk provider, sign-in, sign-up, and user controls.
The production UI becomes active as soon as `VITE_CLERK_PUBLISHABLE_KEY` is set for the build.

## Admin Authorization

Admin access for `illusionddt@gmail.com` should not be trusted from public JavaScript for protected operations.
The current Vite UI uses `VITE_ADMIN_EMAILS` only to display the MVP admin state after sign-in.
Real admin enforcement must happen in a Worker or protected database rule.

Recommended options:

1. Clerk public metadata for UI display only.
2. Clerk private metadata or backend-managed authorization table for actual admin decisions.
3. If Supabase remains as the app database, store a server-controlled admin profile row keyed by Clerk `userId`.

For MVP, the intended admin identity is:

- Email: `illusionddt@gmail.com`
- Role: `admin`

## Supabase After Clerk

Supabase Auth should be retired for this app. If Supabase database remains in use:

- Enable Clerk/Supabase integration or verify Clerk JWTs in a backend Worker.
- Keep RLS enabled.
- Use Clerk `userId` or mapped `workspaceId + userId` as the owner identity.
- Do not use Supabase user metadata for authorization.

## Implementation Notes

The current repository contains a static public backup from ChatGPT Sites, including a bundled/minified app asset.
This is suitable for Cloudflare static hosting, but it is not ideal for replacing the authentication provider.

To implement Clerk cleanly, one of these is required:

1. Restore the original editable source project and replace Supabase Auth calls with Clerk.
2. Rebuild the Numeria Studio frontend from the static backup into an editable React/Vite app.
3. Add a Cloudflare Worker auth facade only for backend checks, while replacing the frontend login UI in source.

The recommended path is option 2 if the original source cannot be recovered.

## Cutover Checklist

- [x] Use existing Clerk application `AITEC Apps`.
- [x] Add Clerk React provider and visible sign-in/sign-up/user controls.
- [x] Map signed-in Clerk user to MVP `workspaceId + userId` display.
- [x] Add Feedback Hub question/improvement UI behind sign-in.
- [x] Add setup screen when `VITE_CLERK_PUBLISHABLE_KEY` is not configured.
- [ ] Add Cloudflare production domain to Clerk.
- [ ] Choose sign-in methods.
- [ ] Add Clerk publishable key to frontend build configuration.
- [ ] Add Clerk secret key only to protected backend/Worker secrets.
- [ ] Make `illusionddt@gmail.com` admin through server-controlled metadata or database row for protected admin operations.
- [ ] Verify sign-up, sign-in, logout, session restore, and admin access on Cloudflare.
