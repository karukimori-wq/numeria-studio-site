# Numeria Studio ChatGPT Sites Backup

Backup target:

- https://numeria-studio.illusionddt.chatgpt.site

Cloudflare migration target:

- https://numeria-studio-site.karukimori.workers.dev

Captured at:

- 2026-09-02 UTC

Contents:

- Mirrored public HTML from the ChatGPT Sites URL
- CSS, JavaScript, favicon, and font assets referenced by the page
- Converted local links for repository-root inspection
- Cloudflare Workers Static Assets deployment configuration

Important notes:

- This is a static public-site backup, not the original editable ChatGPT Sites project source.
- Runtime APIs, hidden project metadata, deployment permissions, and ChatGPT Sites admin state are not included.
- Actual Cloudflare deployment requires GitHub Actions secrets for Cloudflare.

Open locally:

1. Clone or download this repository.
2. Open `index.html` in a browser.

Repository layout:

- `index.html`
- `favicon.svg`
- `assets/`
- `wrangler.jsonc`
- `.github/workflows/cloudflare-production.yml`
