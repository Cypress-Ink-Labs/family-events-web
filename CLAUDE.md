# CLAUDE.md — Project context for agents and new contributors

See [README.md](README.md) for a human-oriented overview and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
for detailed workflow docs. This file distills the agent-critical facts.

---

## Overview

`family-events-web` is a pnpm + Turbo monorepo. The primary deliverable is a React 19 + Vite 8
single-page application in `apps/web`, backed by a **Supabase backend that lives in a separate
repo**. Shared utilities and design tokens live under `packages/*`.

Package manager: see the `packageManager` field in `package.json`. Node workspaces: `apps/*`, `packages/*`.

---

## Layout

```
apps/
  web/                    @cypress-ink-labs/web — the React 19 + Vite 8 SPA
    src/
      app/                router, providers, top-level layout
      features/           vertical feature slices (self-contained domain modules)
      infrastructure/     Supabase client, external integrations
      lib/                framework-neutral library code
      shared/             cross-feature helpers (access-control, utils, hooks)
      components/         shared UI primitives
      styles/             global CSS / Tailwind entry

packages/
  shared/                 @cypress-ink-labs/shared — framework-neutral helpers
  design-system/          @cypress-ink-labs/design-system — design tokens
  config-typescript/      shared tsconfig bases
  config-quality/         shared oxlint + oxfmt config
```

External contract types are published as `@cypress-ink-labs/contracts` (separate repo/registry).

---

## Commands

Run these from the **repo root** unless noted. `pnpm run verify:web` is the full gate — run it
before declaring any web work done.

| Purpose | Command |
|---|---|
| Start dev server | `pnpm run dev` |
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` |
| Format check (web) | `pnpm --filter @cypress-ink-labs/web run format:check` |
| Full check (web) | `pnpm run web:check` |
| Unit tests (web) | `pnpm run web:test` |
| Build (web) | `pnpm run web:build` |
| Check shared packages | `pnpm run packages:check` |
| Test shared packages | `pnpm run packages:test` |
| Docs guard | `pnpm run docs:test` |
| Workspace guards | `pnpm run workspace:test` |
| **Full gate (run before done)** | **`pnpm run verify:web`** |
| E2E tests (Playwright) | `pnpm run test:e2e` |
| Deploy to prod (manual) | `pnpm run deploy` |

---

## Deployment

The `web` service deploys to Railway via GitHub Actions (`.github/workflows/deploy.yml`)
after `ci` passes on `main`, gated by a one-click approval on the `production`
environment (Railway auto-deploy is disabled). For a web change that depends on a new
backend RPC/column, deploy the backend first — never ship web code calling something
introduced in the same release. See `docs/DEPLOYMENT.md`.

---

## Guard tests

`pnpm run workspace:test` runs a suite of guard tests under `tests/guards/`:

- **domain-boundaries** — enforces the package boundary rules defined in
  `docs/rfcs/2026-06-11-web-package-boundaries.md`. Changing import structure across package
  boundaries may require updating a guard or the RFC.
- **web-bundle-budget** — asserts the production bundle stays within a size budget. Significant
  new dependencies may cause this to fail.
- **workspace-layout**, **packages-consumers**, **shared-boundary**, **url-validation-boundary**,
  **config-typescript**, **config-quality**, **workspace-workflows**, **docs-coverage** — structural
  guards; changing folder names, package names, or removing docs sections may trip these.

If a guard fails after a structural change, read the failing test before modifying it — the guard
may be pointing to a real contract violation.

---

## Conventions

- **TypeScript**: `tsc -b` (project references). Config bases in `packages/config-typescript/`.
- **Lint / format**: `oxlint` + `oxfmt`. Do **not** use ESLint or Prettier — they are not installed.
- **Unit tests**: `*.test.ts` files colocated with source, run with Vitest in Node environment.
  No DOM globals unless explicitly configured (see `plans/008` for the planned DOM env work).
- **Commits**: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- **Monorepo tasks**: use Turbo pipelines (`pnpm run build`, `pnpm run check`) for cross-package
  work; use `pnpm --filter` for single-package work.

---

## Security note

Authorization is enforced by **Supabase Row-Level Security in the backend repo**. The
client-side access-control helpers in `apps/web/src/shared/access-control.ts` are UX gating only
and must never be treated as a security boundary.

Never commit `.env*` files — they are listed in `.gitignore`. Use `.env.local` for local secrets.
