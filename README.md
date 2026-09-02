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
- GitHub Actions workflow for Cloudflare deployment

## Migration status

Ready in this repository:

- Static backup
- Static verification
- Static build
- Wrangler config
- Cloudflare Production workflow

Waiting for owner-side configuration:

- GitHub Actions secret: `CLOUDFLARE_API_TOKEN`
- GitHub Actions secret: `CLOUDFLARE_ACCOUNT_ID`

Setup guide:

- [CLOUDFLARE_SETUP_GUIDE.md](CLOUDFLARE_SETUP_GUIDE.md)

Important notes:

- This is a static public-site backup, not the original editable ChatGPT Sites project source.
- Runtime APIs, hidden project metadata, deployment permissions, and ChatGPT Sites admin state are not included.
- Actual Cloudflare deployment requires GitHub Actions secrets for Cloudflare.
- Do not commit Cloudflare tokens, account secrets, or admin-login secrets to the repository.

Open locally:

1. Clone or download this repository.
2. Open `index.html` in a browser.

Repository layout:

- `index.html`
- `favicon.svg`
- `assets/`
- `wrangler.jsonc`
- `.github/workflows/cloudflare-production.yml`
- `CLOUDFLARE_MIGRATION.md`
- `CLOUDFLARE_SETUP_GUIDE.md`
- `ADMIN_BACKUP.md`
