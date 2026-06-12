# Development

## Web (apps/web)

Run `pnpm --filter @cypress-ink-labs/web dev` for the Vite dev server. Use `pnpm run web:check`, `pnpm run web:test`, and `pnpm run web:build` to match the scoped CI commands.

## Shared Packages (packages)

`packages/shared` is for framework-neutral helpers. `packages/config-typescript` and `packages/config-quality` provide shared TypeScript, lint, and format configuration. `packages/design-system` owns generated design token artifacts.

## Design Tokens

Regenerate token artifacts with `pnpm --filter @cypress-ink-labs/design-system build`. The drift check runs in `pnpm run packages:check` through the design-system package check script.

## CI and Local Verification Workflows

CI runs install, docs guards, workspace guards, type/lint checks, unit tests, build, and secret scans. Locally, `pnpm run verify:web` runs the web gate and `scripts/check-monorepo.sh` delegates to `pnpm run verify:full`.
