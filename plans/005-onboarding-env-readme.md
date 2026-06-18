# Plan 005: Fix onboarding — sync root `.env.example` and add a README getting-started section

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- README.md .env.example apps/web/.env.example apps/web/vite.config.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / docs
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

A new contributor clones, runs `pnpm install --frozen-lockfile` (the only setup step in the README),
then runs `pnpm run dev` or `web:check` and hits a Zod validation crash because `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` are unset (`apps/web/src/infrastructure/supabase/client.ts` parses them with
`z.url()` / `z.string().min(1)` and throws on missing). The README never mentions copying an env file or
running the dev server, and the **root** `.env.example` is stale/incomplete relative to the canonical
`apps/web/.env.example`. Fixing both removes a first-run wall.

## Current state

Facts verified at `4e739e4`:
- `README.md` (full) mentions only: `pnpm install --frozen-lockfile`, `pnpm run verify:web`,
  `pnpm run workspace:test`, `pnpm run build`. No `.env` step, no `pnpm run dev`.
- Root `.env.example` lists: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`,
  `NODE_AUTH_TOKEN` (GitHub Packages PAT). It is missing several vars the app/build actually read.
- `apps/web/.env.example` is the fuller, canonical list (verified): `DATABASE_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_GOOGLE_SITE_VERIFICATION`, `SUPABASE_SERVICE_ROLE_KEY`
  (marked server-only), `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `VERIFY_SOURCE_ID`, `VITE_SENTRY_DSN`,
  `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`,
  `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`. All values are placeholders.
- `apps/web/vite.config.ts` additionally reads build-time vars: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT`, `SENTRY_RELEASE`, `RAILWAY_GIT_COMMIT_SHA` (all optional, server/build-only).
- `.gitignore` excepts only `.env.example` from the `.env.*` ignore — so `.env.example` files are the
  intended committed templates. (Plan 004 untracks `.env.hosted`; that is separate.)

Required-for-local-dev vars are just `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The dev server
loads `apps/web/.env` (Vite default). For local Supabase, values come from `supabase status` after
`supabase start` (per the comment already in `apps/web/.env.example`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Docs guard | `pnpm run docs:test` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

**Read `tests/guards/docs-coverage.test.mjs` before editing README** — it may assert README contents.

## Scope

**In scope** (modify only):
- `.env.example` (root) — bring it in line with `apps/web/.env.example`
- `README.md` — add a "Getting started" section

**Out of scope** (do NOT touch):
- `apps/web/.env.example` — already correct; leave as the canonical source.
- Any source code, `vite.config.ts`, CI config.
- Do NOT add real values — placeholders only (matches existing `.env.example` style).

## Git workflow

- Branch: `advisor/005-onboarding-env-readme`
- Conventional-commit style, e.g. `docs: document env setup and getting-started flow`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Decide the root `.env.example` strategy

The repo has two `.env.example` files (root + `apps/web`). The simplest correct fix: make the **root**
`.env.example` either (a) mirror the relevant client + GitHub-Packages vars, or (b) become a short pointer
that directs contributors to `apps/web/.env.example` for app vars while keeping `NODE_AUTH_TOKEN` (the
monorepo-install PAT) at root. Prefer (b) to avoid two lists drifting again: keep `NODE_AUTH_TOKEN` at
root with a comment, and add a comment line pointing to `apps/web/.env.example` for all `VITE_*` app vars.

### Step 2: Update root `.env.example`

Implement the chosen strategy. At minimum the root file must:
- Keep `NODE_AUTH_TOKEN` with a comment: GitHub Packages read:packages PAT, needed for
  `pnpm install` to fetch `@cypress-ink-labs/*` packages.
- Add a comment directing contributors to `apps/web/.env.example` for the web app's `VITE_*` vars and to
  copy it to `apps/web/.env` for local dev.

Do not invent new variable names; only reference ones verified in "Current state".

**Verify**: `grep -q NODE_AUTH_TOKEN .env.example` → exit 0, and the file references `apps/web/.env.example`.

### Step 3: Add a "Getting started" section to `README.md`

Append a section after the existing intro with these exact steps:
1. `pnpm install --frozen-lockfile` (note: requires `NODE_AUTH_TOKEN` for GitHub Packages — see root `.env.example`).
2. `cp apps/web/.env.example apps/web/.env` and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
   (from `supabase status` for local dev, or your Supabase Cloud project settings).
3. `pnpm run dev` — starts the Vite dev server for `apps/web`.
4. `pnpm run verify:web` — run before committing (full local gate).

**Verify**: `grep -q "Getting started" README.md` (or your chosen heading) → exit 0.

### Step 4: Confirm guards still pass

**Verify**: `pnpm run docs:test && pnpm run workspace:test` → exit 0.

## Test plan

No code tests. Verification is the docs guard suite still passing and the new content being present
(grep checks in steps above).

## Done criteria

- [ ] Root `.env.example` keeps `NODE_AUTH_TOKEN` and points to `apps/web/.env.example`
- [ ] `README.md` has a getting-started section covering install → copy env → dev → verify
- [ ] No real credential values added (placeholders/comments only)
- [ ] `pnpm run docs:test` exits 0
- [ ] `pnpm run verify:web` exits 0
- [ ] Only `.env.example` and `README.md` modified (`git status`)
- [ ] `plans/README.md` status row for 005 updated

## STOP conditions

Stop and report (do not improvise) if:
- `tests/guards/docs-coverage.test.mjs` enforces a README structure your change conflicts with, and the
  required shape isn't obvious from the test.
- You discover the dev server needs additional **required** (non-optional) env vars beyond
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — report them rather than guessing defaults.

## Maintenance notes

- When a new required `VITE_*` var is added to the app, update `apps/web/.env.example` (canonical) and,
  if the README lists vars, keep them consistent.
- Reviewer: confirm no real secrets were pasted and the two env-example files no longer duplicate a
  drifting list.
</content>
