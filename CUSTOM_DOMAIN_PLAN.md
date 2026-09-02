# Custom Domain Plan

Current Cloudflare production URL:

- https://numeria-studio-site.karukimori.workers.dev

Original ChatGPT Sites URL:

- https://numeria-studio.illusionddt.chatgpt.site

## Recommended next step

Use the Workers URL as the migrated production URL until a public product domain is selected.

Possible future domain patterns:

| Pattern | Example | Notes |
| --- | --- | --- |
| Subdomain | `numeria.karukimori.com` | Clean product URL. Good for release. |
| Product domain | `numeria-studio.com` | Strongest brand separation, but requires separate domain purchase. |
| Brand subpath | `aitec.example/numeria` | Not ideal for Workers static deployment unless routed through a gateway app. |

## Cloudflare setup needed for a custom domain

For a future custom hostname:

1. Add the domain or subdomain in Cloudflare.
2. Point DNS to Cloudflare if the domain is not already managed there.
3. Add a Workers route for the hostname.
4. Confirm HTTPS certificate issuance.
5. Update `PRODUCTION_URL` in `.github/workflows/cloudflare-production.yml`.
6. Update README and migration docs.
7. Run the `Cloudflare Production` workflow.

## Current recommendation

Keep this URL as the current production target:

- https://numeria-studio-site.karukimori.workers.dev

Decide the final public domain later, after Numeria Studio and Velvet release-domain strategy is fixed.
