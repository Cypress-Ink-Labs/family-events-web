# Project knowledge — `@family-events/web`

React + Vite SPA for the Family Events product (consumer + admin workflows). Lives inside a pnpm + Turbo monorepo as `apps/web`.

## Quickstart

Run from the repo root (preferred — uses workspace filters):

```bash
pnpm --filter @family-events/web dev        # local dev server (Vite)
pnpm --filter @family-events/web build      # tsc -b && vite build
pnpm --filter @family-events/web test       # vitest unit tests
pnpm --filter @family-events/web test:e2e   # Playwright e2e (chromium)
pnpm --filter @family-events/web check      # tsc + oxlint + oxfmt --check
pnpm --filter @family-events/web typecheck  # tsc -b
pnpm --filter @family-events/web lint       # oxlint src
pnpm --filter @family-events/web lint:fix   # oxlint --fix src
pnpm --filter @family-events/web format     # oxfmt --write src
```

Or from this directory: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm check`, etc.

Web-only verification: `pnpm run verify:web` (from repo root).

### Environment

- Vite reads `.env.development.local` for local dev and `.env.hosted` for `dev:hosted`.
- Required runtime envs include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
- Build-time envs are validated via `@t3-oss/env-core` + zod in `vite.config.ts` (`SENTRY_*`, `RAILWAY_GIT_COMMIT_SHA`, `VITE_GOOGLE_SITE_VERIFICATION`).
- Vitest stubs Supabase envs in `vitest.config.ts`; tests run in the `node` environment.

## Architecture

- `src/main.tsx` — React 19 root, mounts `<App />`.
- `src/app/` — App shell: providers, router, route-level pages, error boundary, scroll-to-top.
- `src/features/<domain>/` — Feature slices (`auth`, `admin`, `calendar`, `dashboard`, `events`, `explore`, `legal`, `map`, `marketing`, `my-events`, `plan`, `profile`). Pages, hooks, components, and stores live inside their feature.
- `src/infrastructure/` — Browser/runtime adapters:
  - `supabase/client.ts` — the **only** place that constructs Supabase runtime clients.
  - `queries/` — TanStack React Query client + query keys.
  - `observability/sentry.ts`
  - `auth/auth-events.ts`, `realtime/channel-registry.ts`, `safe-url.ts`.
- `src/lib/` — Pure browser helpers: `db/` (Supabase RPC wrappers), `schemas/` (zod schemas + parsers), `events/` (enrichment, grouping), `database.types.ts` (generated Supabase types).
- `src/shared/` — Cross-feature hooks, types, intl helpers, map styles, access control.
- `src/components/` — Shared UI. `components/v2/` is the design-system-aligned layout primitives (`page`, `toolbar`, `stack`, `filter-bar`, `form-grid`). shadcn/ui via `components.json` (style: new-york, alias `@/components/ui`).
- `src/styles/tokens.generated.css` — **Generated**. Do not hand-edit.
- `e2e/` — Playwright specs (`smoke`, `favorite-toggle`) with auth setup project (`auth.setup.ts` writes `e2e/.auth/admin.json`).

### Path aliases

- `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Workspace package boundaries

- `@family-events/contracts` — backend/API contract types (use for anything crossing the API).
- `@family-events/shared` — framework-neutral helpers only.
- `@family-events/design-system` — design tokens / generated UI assets.
- **Do not import** from `apps/ios`, `apps/android`, cron apps, or Supabase function source.

## Conventions

- **Tooling:** TypeScript (strict via `tsconfig.app.json`), Vite 8, React 19, React Router 7, TanStack Query 5, Zustand, Tailwind v4 (via `@tailwindcss/vite`), shadcn/ui, MapLibre + react-map-gl, Recharts, Sonner, react-hook-form + zod, Sentry.
- **Linting:** `oxlint` (extends `packages/config-quality/oxlint.base.json`). Browser env enabled.
- **Formatting:** `oxfmt` (config at `packages/config-quality/oxfmt.base.json`). Run `pnpm format` or `format:check`.
- **Tests:**
  - Unit: Vitest, files `src/**/*.test.ts`, node environment, no JSX in tests.
  - E2E: Playwright (chromium only, `fullyParallel: false`, single worker). Auto-starts vite on `127.0.0.1:4173` unless `PLAYWRIGHT_BASE_URL` is set.
- **Schemas:** Zod schemas live in `src/lib/schemas/` and are tested alongside (`*.test.ts`).
- **Feature work:** Add new pages/flows under `src/features/<domain>/`. Co-locate hooks, components, and tests with the feature.
- **Visual changes:** Read `docs/DESIGN.md` (in repo root) before touching styling.

## Gotchas

- **Generated files** are not hand-edited:
  - `src/styles/tokens.generated.css`
  - `packages/design-system/src/generated/*`
  - To change tokens: edit `packages/design-system/tokens/tokens.json`, then `pnpm --filter @family-events/design-system build`.
- **Supabase clients:** never instantiate outside `src/infrastructure/supabase/client.ts`.
- **Source maps** are only emitted when all `SENTRY_*` envs + a release are present (see `vite.config.ts`). This is intentional — bare `serve -s dist` would otherwise expose `*.map`.
- **Manual chunking** in `vite.config.ts` splits heavy single-purpose vendors (`maplibre`, `recharts`, `sentry`, `motion`, `date-fns`, `radix-ui`, `supabase`, `d3`). It also strips `maplibre`/`recharts`/`sentry` from initial `<link rel="modulepreload">` to keep first paint lean — they load via `React.lazy()` on demand. Don't disable this without measuring TTI.
- **Chunk size warning** is set to Rollup's default 500 KB so regressions surface in CI.
- **`/version.json`** is synthesized in dev and written at build close — `useVersionCheck` relies on it.
- **Playwright** uses `vite` (not `vite preview`), so behavior matches dev. It depends on a setup project that creates `e2e/.auth/admin.json`; if e2e is failing locally, check that auth fixture.
- The `dist/` directory is checked in here (build output committed for the deployed image); regenerate via `pnpm build` rather than editing it.
