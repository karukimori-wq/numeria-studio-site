# Five development workstreams — 2026-11-27

User scope: unify calculations; Western astrology 16 pages; Zi Wei 14 pages;
Tarot 13 pages; immutable complete reports with consistent screen/PDF.
User verification follows main deployment and is not a prerequisite for merging.

## Implemented in this increment

- Draft save and completion use the same server recomputation for numerology,
  Four Pillars, Nine Star and Tarot. Server Session ID/method scope wins over
  incoming calculation metadata. Invalid supplied snapshots reject before writes.
- The legacy numerology display, AI request numbers and report number projection
  use the confirmed selected name and saved reference date. Partner report numbers
  use the partner's confirmed source. Missing values cannot borrow number 1 or the
  old hardcoded year 2026. Name changes trigger a React render.
- Completion freezes the reading, handwritten sections/comments/layout state and,
  when enabled, the full selected numerology text/figure draft. A SHA-256 identifies
  that captured content. Registry updates do not regenerate that saved text.
- Export of a linked Session takes identity/numbers/content from the saved Session,
  rather than replacement content submitted with export. Locked reports stay locked.
  Completion retries return the original saved content.
- Completion enforces the existing Four Pillars/Nine Star reference locks too.

## Still required to fulfill the full request

- Western astrology: adopted houses, comparison/composite/transit calculations,
  input/save/form/figures and 16 registered page connections.
- Zi Wei: full stars/transformations/periods, input/save/forms/figures and 14 pages.
- Tarot: registered interpretation and card asset/figure connections for 13 pages.
- Immutable report replay in both screen and Japanese PDF, including all methods;
  the existing minimal server PDF is not replaced by this increment. Legacy report
  text and full chart figures still require the method-specific connections above.

The stored report is a review-required draft. No mathematical, editorial, asset or
formal publication approval is created. No human acceptance checkboxes are changed.

## Validation

- `verify-reading-calculation.mjs`: forged/stale numbers/cards, canonical identity,
  completion retry, invalid snapshots, immutable full text/comments/hash, export
  replacement attempts, missing result and unknown Session.
- `verify-numerology-legacy-bridge.mjs`: own/partner name confirmation, reference
  year 2027, null-to-unavailable projection and invalid date.
- Existing full test suite and production build. Two-axis review found and resolved
  invalid-array snapshot loss and stale-number fallback on unavailable calculation.

These are automated development checks, not independent astrological validation or
authenticated human acceptance of the 85 pages.
