# Plan 001: Add a project `CLAUDE.md` so agents can execute work without rediscovery

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- README.md docs/DEVELOPMENT.md package.json apps/web/package.json turbo.json`
> If these changed since this plan was written, re-read them before proceeding; the script
> reference below must match reality.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / docs
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

This repo has no `CLAUDE.md` or `AGENTS.md`. Every agent (and new human) must rediscover the
monorepo layout, the exact verify commands, the package boundaries enforced by guard tests, and
the unusual toolchain (oxlint/oxfmt, TS 6, pnpm+turbo) before doing useful work. A single
project-context file removes that friction and makes every other plan in this directory cheaper
and safer to execute. This is the highest-leverage doc in the repo precisely because the other
plans will be run by agents.

## Current state

There is no `CLAUDE.md` at the repo root (verified: `ls CLAUDE.md AGENTS.md` → not found). The
facts an agent needs are scattered across:

- `README.md` — workspace overview (web app, shared, design-system packages).
- `docs/DEVELOPMENT.md` — dev/check/test/build command pointers.
- `package.json` (root) — scripts: `dev`, `build`, `check`, `test`, `verify:web`, `verify:full`,
  `workspace:test`, `docs:test`, `web:check`, `web:test`, `web:build`.
- `apps/web/package.json` — web scripts: `dev`, `build` (`tsc -b && vite build`), `typecheck`
  (`tsc -b`), `lint` (`oxlint src`), `format:check` (`oxfmt ...`), `check`, `test` (`vitest run`),
  `test:e2e` (`playwright test`).
- `turbo.json` — task graph; `docs/rfcs/2026-06-11-web-package-boundaries.md` — the package
  boundary rules enforced by `tests/guards/domain-boundaries.test.mjs`.

Key facts to capture (verified during the audit):

- Package manager is `pnpm@11.7.0`; monorepo via turbo. Workspaces: `apps/*`, `packages/*`.
- Packages: `@cypress-ink-labs/web` (app), `@cypress-ink-labs/shared` (framework-neutral helpers),
  `@cypress-ink-labs/design-system` (tokens), `config-typescript`, `config-quality`.
- Full local gate is `pnpm run verify:web` (docs guards → workspace guards → packages check/test →
  web check/test/build). Unit tests live beside source as `*.test.ts` and run on Node env.
- The authorization boundary is Supabase Row-Level Security in a **separate backend repo**;
  client-side access checks (`apps/web/src/shared/access-control.ts`) are UX gating only.
- DB/API contract types come from the published `@cypress-ink-labs/contracts` package.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Docs guard | `pnpm run docs:test` | exit 0, all pass |
| Workspace guards | `pnpm run workspace:test` | exit 0, all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

Note: `pnpm run docs:test` runs `tests/guards/docs-coverage.test.mjs`. **Read that test before
writing** — it may assert which docs must exist / contain which sections. Your new file must not
break it.

## Scope

**In scope** (create / modify only these):

- `CLAUDE.md` (create, repo root)

**Out of scope** (do NOT touch):

- `README.md`, `docs/DEVELOPMENT.md` — leave existing docs as-is; `CLAUDE.md` links to them.
- Any source file, script, or CI config.
- Do NOT add an `AGENTS.md` symlink/alias unless `docs/guards/docs-coverage.test.mjs` requires it.

## Git workflow

- Branch: `advisor/001-add-project-claude-md`
- Single commit; conventional-commit style (matches `git log`, e.g. `docs: add project CLAUDE.md`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the docs guard so the new file doesn't break it

Read `tests/guards/docs-coverage.test.mjs` fully. Note any assertion about files that must exist or
strings that must be present.

**Verify**: `pnpm run docs:test` → exit 0 (establish the baseline passes before you change anything).

### Step 2: Write `CLAUDE.md`

Create `CLAUDE.md` at the repo root with these sections (concise, factual, no invented detail):

1. **Overview** — one paragraph: pnpm+turbo monorepo, React 19 + Vite 8 SPA in `apps/web` backed by
   Supabase (backend in a separate repo), shared packages under `packages/*`.
2. **Layout** — bullet list of `apps/web` (with the `src/{app,features,infrastructure,lib,shared,components}`
   feature-sliced structure) and each `packages/*` with its one-line role.
3. **Commands** — a table copied from the script facts in "Current state": how to dev, typecheck,
   lint, format-check, test, build, and the full gate `pnpm run verify:web`. Mark `pnpm run verify:web`
   as the command to run before declaring web work done.
4. **Guard tests** — explain `pnpm run workspace:test` enforces package boundaries
   (`docs/rfcs/2026-06-11-web-package-boundaries.md`) and bundle budget; changing structure may
   require updating a guard.
5. **Conventions** — TypeScript via `tsc -b`; lint/format via oxlint + oxfmt (NOT eslint/prettier);
   tests are `*.test.ts` colocated with source, Node env (no DOM unless infra is added — see
   `plans/008`); Conventional Commits.
6. **Security note** — authorization is enforced by Supabase RLS in the backend repo; client
   access-control is UX gating only; never commit `.env*` files (see `.gitignore`).

Keep it under ~120 lines. Link to `README.md` and `docs/DEVELOPMENT.md` rather than duplicating them.

**Verify**: `test -f CLAUDE.md && wc -l CLAUDE.md` → file exists, reasonable length.

### Step 3: Confirm guards still pass

**Verify**: `pnpm run docs:test && pnpm run workspace:test` → exit 0, all pass.

## Test plan

No code tests. The verification is that the existing guard suites still pass with the new file
present. If `docs-coverage.test.mjs` enumerates required docs, confirm `CLAUDE.md` either satisfies
it or is not in conflict.

## Done criteria

- [ ] `CLAUDE.md` exists at repo root and contains the 6 sections above
- [ ] `pnpm run docs:test` exits 0
- [ ] `pnpm run workspace:test` exits 0
- [ ] No files other than `CLAUDE.md` are modified (`git status`)
- [ ] `plans/README.md` status row for 001 updated

## STOP conditions

Stop and report (do not improvise) if:

- `tests/guards/docs-coverage.test.mjs` fails after adding `CLAUDE.md` and the cause is not an
  obvious missing-section assertion you can satisfy factually.
- You cannot determine a script's behavior from `package.json` — do not guess command semantics.
- Adding the file appears to require touching a guard test or another doc.

## Maintenance notes

- When scripts in `package.json` change, update the Commands table here.
- A reviewer should check the file states only verified facts (no aspirational architecture).
- Deferred: an `AGENTS.md` equivalent for other tools was not added; add a symlink later if needed.
</content>
