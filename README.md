# Family Events Web

## Getting started

1. **Install dependencies** — requires a `NODE_AUTH_TOKEN` GitHub Packages PAT (see root `.env.example`):
   ```
   pnpm install --frozen-lockfile
   ```
2. **Copy and fill the web env file** — the Vite app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at minimum. For local Supabase, get these from `supabase status` after `supabase start`; for Supabase Cloud, find them in your project settings:
   ```
   cp apps/web/.env.example apps/web/.env
   # Edit apps/web/.env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```
3. **Start the dev server**:
   ```
   pnpm run dev
   ```
4. **Run the full local gate before committing**:
   ```
   pnpm run verify:web
   ```

## Web Workspace

`apps/web` contains the React/Vite app for consumer and admin Family Events workflows. The app depends on the local shared helper package and the published `@cypress-ink-labs/contracts` package for API and database contract types.

## Shared Package

`packages/shared` contains framework-neutral utilities that can be reused by app code without importing browser, React, Supabase, or feature-layer modules.

## Design System Package

`packages/design-system` owns design tokens and generated artifacts. The package writes web CSS, TypeScript token exports, and mobile dist artifacts consumed from the package tarball.

## Workflows

Install dependencies with `pnpm install --frozen-lockfile`. Use `pnpm run verify:web` for the full local web gate, `pnpm run workspace:test` for guard tests, and `pnpm run build` for the CI build path.
