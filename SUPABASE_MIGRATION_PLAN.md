# Supabase Migration Plan

This site backup currently uses Supabase for authentication and profile-backed admin access.
The new authentication direction is Clerk. Supabase should be treated as legacy auth for this
site unless the app still needs Supabase database or storage features.

## Current Status

- Production site: `https://numeria-studio-site.karukimori.workers.dev`
- Original Sites URL: `https://numeria-studio.illusionddt.chatgpt.site`
- Current Supabase project used by the bundled app: `yooivsztrgswrxfspgdg`
- Current Supabase project name: `numeria-studio`
- Current observed status: `INACTIVE`

If login or signup fails immediately, resume the Supabase project first. Auth and database calls
cannot work while the project is inactive.

## Migration Scope

If Supabase remains in use after Clerk adoption, move or recreate only these non-auth items:

- Profile/admin role tables used by Numeria Studio
- Any Numeria Studio application tables still stored in Supabase
- RLS policies, grants, functions, and triggers

Do not keep Supabase Auth as the primary login provider once Clerk is implemented.

Do not move these responsibilities into Numeria Studio source code:

- Service role keys
- AI Activity
- AI Usage
- Conversation
- Message
- Customer master
- Payment data
- Feedback Hub analysis or issue records

## Legacy Auth URL Configuration

If Supabase Auth must be kept temporarily while Clerk is being implemented, configure Auth URLs in
the Supabase Dashboard:

- Site URL: `https://numeria-studio-site.karukimori.workers.dev`
- Redirect URL: `https://numeria-studio-site.karukimori.workers.dev/**`
- Optional legacy Redirect URL: `https://numeria-studio.illusionddt.chatgpt.site/**`

If a custom domain is attached later, also add:

- Site URL: `https://<custom-domain>`
- Redirect URL: `https://<custom-domain>/**`

## Admin Login After Clerk

The requested admin email is:

- `illusionddt@gmail.com`

Admin status should be stored in Clerk private metadata or a protected backend table, not in public frontend code.
Do not store admin permissions in `user_metadata`; Supabase user metadata can be user-editable
and must not be trusted for authorization.

Recommended approach:

1. Create or confirm the Clerk user for `illusionddt@gmail.com`.
2. Store admin authorization in Clerk private metadata or a server-controlled table.
3. Ensure policies allow only the correct user to read or use admin-only data.
4. Keep service role keys only in protected backend secrets.

## Cloudflare Relationship

Cloudflare Workers currently hosts the static site. Supabase remains an external backend.
For this repository, migration means:

1. Keep Cloudflare deployment for the site.
2. Add Clerk for authentication.
3. Keep Supabase only if database/storage is still required.
4. Rebuild the site after Clerk keys and login UI are added.
5. Redeploy through GitHub Actions.

## Cutover Checklist

- [ ] Decide whether Supabase is still required for database/storage.
- [ ] Export or recreate profile/admin-role data.
- [ ] Recreate RLS policies and grants.
- [ ] Configure Clerk application and Cloudflare domain.
- [ ] Confirm `illusionddt@gmail.com` can sign in.
- [ ] Confirm the signed-in user has admin role.
- [ ] Confirm normal user signup works.
- [ ] Confirm logout/login persists session on the Cloudflare URL.
- [ ] Keep service role and admin secrets out of GitHub source.
