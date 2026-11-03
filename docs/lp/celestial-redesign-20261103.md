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

## Motion graphics revision

User feedback: strengthen motion graphics; defer rebuilding the inaccurate interactive demo.

- Hero now uses Canvas light particles, CSS 3D orbit rings and satellite numerals. A 15-second loop moves through intuition, symbol and Report creation.
- Scroll-driven story transitions through client context, symbols and a finished page.
- Old interactive demo is hidden and its CTA/navigation removed. It is retained for later replacement with a real product flow; no attempt was made to reconcile it now.
- Stop/resume and reduced-motion preferences apply to Canvas as well as CSS. Rendering pauses outside the hero viewport or when the tab is hidden. Particle drawing is capped near 30fps and pixel ratio at 1.5.
- The back-to-top anchor now targets a static element before the sticky navigation.
- Inline script syntax, existing automated suite and production build passed. Desktop and embedded mobile viewport QA cover visuals and navigation; real iOS and live Clerk verification remain pending.

## Scroll-linked page turning

- The hero Report remains visible and opens with the visitor's scroll instead of disappearing on a timed loop.
- A front cover and two double-sided paper leaves turn around a left-side spine with perspective, paper shading and back faces. Reverse scrolling restores the earlier pages and closes the cover.
- The Report scene stays in view during the sequence. On mobile the introductory text scrolls away before the book pins below the navigation; the open spread is scaled to fit.
- Content is explicitly a fictional design concept. Rebuilding the real product demo remains deferred.
- Reduced motion / pause collapses the extra scroll distance and shows a static cover.

Scroll-turn verification: full existing test suite and production build passed. Browser checked closed cover, intermediate leaf angles, complete turns and reverse scrolling. The 390px embedded mobile viewport showed progress 0.791 with the spread inside the viewport; physical iOS Safari remains unverified.


## Page-turn non-movement fix

Reproduced: with OS reduced motion enabled, clicking resume removed the local pause flag but JavaScript and CSS still unconditionally blocked the book. The new runtime regression failed before the fix with `Explicit motion resume must allow page turning even with OS reduced motion`.

Explicit activation now overrides that default consistently in CSS and JavaScript, while first load still respects OS/user pause preferences. Controls beside the book expose pause state and provide previous/next/return-to-cover operations. Passive touch/wheel fallback handles hosts that scroll an outer preview instead of the inner window; no scrolling is cancelled. Manual button positions survive browser scroll adjustments until a new scroll gesture begins.

Verification: the real inline runtime is exercised for normal/reverse scrolling, reduced-motion opt-in, manual controls and outer-host gesture fallback. The test is included in `npm test`. Browser verified a button turn to progress 0.350 / cover -174 degrees and its open-spread rendering. This confirms the reproduced path; the user's exact iOS WebView environment remains unverified.
