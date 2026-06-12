# Family Events Web

## Web Workspace

`apps/web` contains the React/Vite app for consumer and admin Family Events workflows. The app depends on the local shared helper package and the published `@cypress-ink-labs/contracts` package for API and database contract types.

## Shared Package

`packages/shared` contains framework-neutral utilities that can be reused by app code without importing browser, React, Supabase, or feature-layer modules.

## Design System Package

`packages/design-system` owns design tokens and generated artifacts. The package writes web CSS, TypeScript token exports, and mobile dist artifacts consumed from the package tarball.

## Workflows

Install dependencies with `pnpm install --frozen-lockfile`. Use `pnpm run verify:web` for the full local web gate, `pnpm run workspace:test` for guard tests, and `pnpm run build` for the CI build path.
