# External Intelligence development integration

Numeria Studio uses External Intelligence System (EIS) only as development intelligence. EIS is not a runtime dependency and does not own Numeria business data.

## Development start

At the start of a development task, a connected development agent should call EIS `development_start` through HTTP or MCP with:

- `workspaceId`: `professional-platform-dev`
- `appId`: `numeria-studio`
- `componentId`: `site`
- `projectId`: `numeria-studio-site`
- `repository`: `karukimori-wq/numeria-studio-site`
- current repository HEAD
- a concise description of the current task

The returned Project Snapshot, proven patterns, and known failures should be considered before implementation. Repository HEAD alone is not sufficient for cache validity; updated shared Knowledge must be allowed to refresh context.

If EIS communication does not succeed, report `External Intelligence: NOT CONNECTED` and continue development without claiming that EIS Knowledge was used.

## Production workflow result recording

`.github/workflows/cloudflare-production.yml` records a non-blocking development result after the configured Cloudflare Production workflow succeeds.

GitHub Actions authenticates to EIS with GitHub OIDC. No long-lived EIS repository secret or repository variables are required. The workflow grants only `id-token: write`, and EIS verifies the GitHub issuer, EIS audience, repository owner identity, and source repository before accepting `POST /api/development/results`.

The reusable EIS workflow defaults to:

- EIS Production: `https://external-intelligence-system.vercel.app`
- workspace: `professional-platform-dev`

Recording uses `strict=false`; EIS availability must not block the Numeria release.

The automated workflow records `implementation_result`, not `production_verified_success`, because the workflow does not prove every intended-user UI/role/plan behavior. In particular, administrator entitlement behavior and full UI reachability require separate verification.

## Production success rule

Do not mark a feature complete solely because code exists, README/task status says complete, or CI is Green. When applicable, confirm current main and current Production from the user-facing UI, required authorization/plan behavior, persistence/readback, required integrations, and human-visible behavior.
