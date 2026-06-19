# Plan 022: Fix the misleading local-Supabase onboarding step in the README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- README.md`
> If README.md changed since this plan was written, compare the "Current state"
> excerpt against the live file before proceeding; on a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

The README's getting-started step tells a new contributor to get Supabase
credentials from `supabase status` after `supabase start`. But this repo has **no
`supabase/` directory** — the backend is a separate repo (stated in
`CLAUDE.md`). A contributor following the step runs `supabase start`, hits "no
supabase/ directory", and stalls before the app ever boots. The fix is a small
doc correction that removes the dead path and points at the real one.

## Current state

`README.md:9` (step 2 of Getting started):

```
2. **Copy and fill the web env file** — the Vite app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at minimum. For local Supabase, get these from `supabase status` after `supabase start`; for Supabase Cloud, find them in your project settings:
```

`CLAUDE.md` (project context) states the backend "lives in a separate repo" — so
there is no in-repo `supabase start` path. `apps/web/.env.example` documents the
required `VITE_*` vars (and now `VITE_VAPID_PUBLIC_KEY`).

This is the only doc surface with the misleading instruction; `docs/DEVELOPMENT.md`
should be checked for the same phrasing and corrected if present.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Docs guard | `pnpm run docs:test` | exit 0, all pass |
| Grep for the stale phrase | `grep -rn "supabase start" README.md docs/` | only intended matches remain |

## Scope

**In scope**:
- `README.md` (edit step 2)
- `docs/DEVELOPMENT.md` (only if it repeats the same misleading `supabase start` instruction)

**Out of scope**:
- Adding a real local-Supabase setup guide — that belongs in the **backend**
  repo, not here. Do not invent setup steps for a directory this repo doesn't have.
- `apps/web/.env.example` — already correct.
- Any code.

## Git workflow

- Branch: `advisor/022-readme-onboarding-fix`
- Conventional Commits, e.g. `docs(readme): correct local-Supabase onboarding step`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Rewrite README step 2

Replace the misleading clause. The corrected step should: keep the `cp
apps/web/.env.example apps/web/.env` instruction; state that the values come from
**Supabase Cloud** project settings (the supported path for this repo); and note
that local-Supabase development is driven from the separate backend repo (refer
to it rather than implying `supabase start` works here). Do not name a URL you
cannot verify — if the backend repo's location isn't evident in `CLAUDE.md` or
existing docs, phrase it as "the separate Supabase backend repository" without a
fabricated link.

**Verify**: `grep -n "supabase start" README.md` → no matches (the dead instruction is gone).

### Step 2: Check docs/DEVELOPMENT.md

`grep -n "supabase start" docs/DEVELOPMENT.md`. If it repeats the same misleading
instruction, apply the same correction. If not, leave it.

**Verify**: `pnpm run docs:test` → exit 0 (the docs-coverage guard still passes).

## Test plan

- No unit tests (docs-only). The verification is the docs guard plus the grep
  showing the stale instruction is gone.
- Verification: `pnpm run docs:test` → all pass.

## Done criteria

- [ ] `grep -rn "supabase start" README.md` returns no matches
- [ ] README step 2 points at Supabase Cloud + the separate backend repo, no fabricated URL
- [ ] `pnpm run docs:test` exits 0
- [ ] Only `README.md` (and possibly `docs/DEVELOPMENT.md`) modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The `docs-coverage` guard fails after the edit — a required README section/heading
  may have been removed; restore it and re-run.
- The README at line 9 no longer matches the excerpt (drift since `37234b7`).

## Maintenance notes

- If a local-Supabase workflow is ever added to this repo (a `supabase/` dir),
  this step should be expanded then — not before.
- Reviewer: confirm no fabricated backend-repo URL was introduced.
