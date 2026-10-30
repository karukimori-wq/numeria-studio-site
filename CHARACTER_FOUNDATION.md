# Character foundation — P1-01

Source: https://app.notion.com/p/407e71121fed81fb890cf0f4f728a680

`src/character-store.js` and `migrations/0005_character_collections.sql` implement an NS-only canonical aggregate. Each immutable content version is retained in the aggregate; a conditional revision update commits quota checks and content appends together. Conflicts are returned rather than retried against a changed version. Aggregates are scoped by workspace and owner; all non-deleted custom Characters count toward the trusted plan limit. Deleting a Character preserves its versions.

Run `npm run test:characters` on Node 24. The test executes the D1 repository's SQL on real SQLite, with only the result envelope adapted. This verifies SQL and domain behavior, not a remote Cloudflare binding.

## Integration boundary

This is a server-only storage slice, not a released Character feature. No route/UI currently calls it. Do not expose `D1CharacterRepository.read()` or serialize aggregates: they contain private inherited parameters. Only the explicit allowlisted service responses may be returned to users.

The HTTP adapter must resolve authenticated workspace/user, a current GE-backed plan and a trusted published official source. Never take any of these authorities from request JSON. Official duplication accepts only a server-resolved source; it fixes both parameter sets at duplication time. New blank custom Characters have no inherited hidden settings. Official catalog management remains unimplemented.

Surface values use nine positional percentages (0–100, step 10). The supplied Notion pages do not enumerate all eight surface-axis names/order; do not invent labels or connect this positional representation to APC before the stable axis catalog is recovered. The ninth axis is text length. ReadingConfig stays separate. Avatar selection/upload and its validation are deferred.

`publishedVersion` denotes NS publication only. It must never be treated as NP's applied version or an existing order's pinned version. No initial publication, stop, resume, or synchronization endpoint exists in this slice. Future lifecycle writes must atomically enqueue their events and preserve audit evidence; local soft deletion must not become a production endpoint before NP stop propagation is connected.

The existing generic workspace-state JSON path and report-generation normalizer still accept legacy Character data. Close those bypass paths when wiring the dedicated authenticated API. This slice deliberately does not activate Business subscriptions, change existing APC payloads, or grant new production access.

## Verification / remaining acceptance

- Local SQLite/domain: 9/9 PASS, including simultaneous create/save/last-slot CAS, limits, owner/workspace isolation, hidden-field rejection and non-disclosure, immutable history, fixed official duplication, deleted count exclusion.
- Existing `npm test`: PASS after installing existing dependencies without modifying a lockfile.
- R1–R10 remain open: authentication/API/UI, official selection, real D1 integration, APC actual-use evidence, NP fixed-version generation/delivery, events, notifications, operational approvals and staged-release evidence are still required.

Full P0 inventory and Q1–Q240 traceability: `professional-platform-contracts/docs/release-readiness/character-foundation-p0-20261028.md` on the companion Draft PR branch.
