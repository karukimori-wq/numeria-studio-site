# Numeria Studio LP redesign — 2026-11-03

Direction: a quiet celestial atelier, with midnight blue, warm gold, paper, fine orbit lines, and Japanese serif headings.

## Changes

- New CSS astrolabe and floating Report cover, with restrained orbital motion.
- Interactive Report design demo directly after the hero; existing method/theme/layout/page controls retained.
- Editorial spacing, dark/light section rhythm, clearer Free/Pro summaries, and mobile layouts.
- Scroll progress and progressive section reveals; animation pause control persists locally and honors reduced-motion preference.
- Existing Clerk code and app/Worker routes retained without modification.
- Demo content remains explicitly fictional; no private/customer data or live calculations are used.

## Verification

- `npm test`: passed, including LP structure, Clerk entry, Worker routing, application contracts, report and persistence checks.
- `node scripts/verify-lp-clerk-auth.mjs`: passed.
- `npm run build`: passed, including runtime assets and layout guards.
- Browser: desktop hero and Report demo; tarot/Pearl/magazine/page combinations; workflow step details; FAQ; motion pause.
- Browser: 390px embedded viewport, hero layout and mobile navigation opening. This is not a physical iOS device test.
- Live `numeria-studio.com` was blocked from this browser; no live authentication or production route verification was claimed.

## Review before release

Review copy and visual direction, then verify Clerk sign-up/sign-in and signed-in redirects in an environment with the real auth configuration. Confirm plan copy against the current commercial release. No main merge or production deployment was performed.
