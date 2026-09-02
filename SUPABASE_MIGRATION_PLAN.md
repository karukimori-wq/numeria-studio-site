# Supabase Migration Plan

This site backup currently uses Supabase for authentication and profile-backed admin access.
The Cloudflare static site deployment is separate from Supabase. Moving the site to Cloudflare
does not move Supabase Auth, users, profiles, or database rows.

## Current Status

- Production site: `https://numeria-studio-site.karukimori.workers.dev`
- Original Sites URL: `https://numeria-studio.illusionddt.chatgpt.site`
- Current Supabase project used by the bundled app: `yooivsztrgswrxfspgdg`
- Current Supabase project name: `numeria-studio`
- Current observed status: `INACTIVE`

If login or signup fails immediately, resume the Supabase project first. Auth and database calls
cannot work while the project is inactive.

## Migration Scope

Move or recreate these Supabase-owned items:

- Supabase Auth users
- Authentication providers and email settings
- Auth URL configuration and redirect allow-list
- Profile/admin role tables used by Numeria Studio
- Any Numeria Studio application tables still stored in Supabase
- RLS policies, grants, functions, and triggers

Do not move these responsibilities into Numeria Studio source code:

- Service role keys
- AI Activity
- AI Usage
- Conversation
- Message
- Customer master
- Payment data
- Feedback Hub analysis or issue records

## Required Auth URL Configuration

After resuming or recreating Supabase, configure Auth URLs in the Supabase Dashboard:

- Site URL: `https://numeria-studio-site.karukimori.workers.dev`
- Redirect URL: `https://numeria-studio-site.karukimori.workers.dev/**`
- Optional legacy Redirect URL: `https://numeria-studio.illusionddt.chatgpt.site/**`

If a custom domain is attached later, also add:

- Site URL: `https://<custom-domain>`
- Redirect URL: `https://<custom-domain>/**`

## Admin Login

The requested admin email is:

- `illusionddt@gmail.com`

Admin status should be stored in Supabase profile or app metadata, not in public frontend code.
Do not store admin permissions in `user_metadata`; Supabase user metadata can be user-editable
and must not be trusted for authorization.

Recommended approach:

1. Create or confirm the Supabase Auth user for `illusionddt@gmail.com`.
2. Store admin authorization in a server-controlled table or `app_metadata`.
3. Ensure RLS policies allow only the correct user to read or use admin-only data.
4. Keep service role keys only in protected backend secrets.

## Cloudflare Relationship

Cloudflare Workers currently hosts the static site. Supabase remains an external backend.
For this repository, migration means:

1. Keep Cloudflare deployment for the site.
2. Resume or create the target Supabase project.
3. Configure Auth URLs for the Cloudflare domain.
4. Rebuild the site only if the Supabase project URL or public anon/publishable key changes.
5. Redeploy through GitHub Actions.

## Cutover Checklist

- [ ] Resume current Supabase project or create the replacement project.
- [ ] Export or recreate Auth users.
- [ ] Export or recreate profile/admin-role data.
- [ ] Recreate RLS policies and grants.
- [ ] Configure Auth Site URL and Redirect URLs.
- [ ] Confirm `illusionddt@gmail.com` can sign in.
- [ ] Confirm the signed-in user has admin role.
- [ ] Confirm normal user signup works.
- [ ] Confirm logout/login persists session on the Cloudflare URL.
- [ ] Keep service role and admin secrets out of GitHub source.
