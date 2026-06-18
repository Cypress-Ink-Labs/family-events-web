# Plan 004: Stop tracking `apps/web/.env.hosted` in git

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git ls-files --error-unmatch apps/web/.env.hosted`
> If this errors (file no longer tracked), the work may already be done — verify and update the index.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security (hygiene)
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

`apps/web/.env.hosted` is committed to git (`git ls-files` lists it) even though `.gitignore` declares
`.env.*` should be ignored with only `!.env.example` excepted — the file slipped in before/around the
ignore rule and is now tracked. It contains hosted-environment build values including
`VITE_SUPABASE_ANON_KEY`. The Supabase **anon** key is public-by-design (it is baked into the client
bundle at build time), so this is **not** a high-severity secret leak — but tracking a `.env.*` file is
a hygiene and precedent problem: the next person copies the pattern and commits a file that *does* hold a
real secret, and `.gitignore` will silently not protect it because the path is already tracked. Untracking
it restores the intended ignore behavior.

> **Handling rule**: do NOT print, paste, or commit any value from `.env.hosted` anywhere (PR text,
> commit message, comments). Reference the file path and variable *names* only.

## Current state

Facts verified at `4e739e4`:
- `git ls-files | grep env` → includes `apps/web/.env.hosted` (tracked).
- `git check-ignore apps/web/.env.hosted` → prints nothing / exits non-zero (NOT ignored, because it is
  already tracked; tracked files bypass `.gitignore`).
- Root `.gitignore` already contains:
  ```
  .env
  .env.*
  !.env.example
  ```
- Variable *names* present in `apps/web/.env.hosted` (values intentionally omitted): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_APP_ENV`, `VITE_SITE_URL`, `VITE_GOOGLE_SITE_VERIFICATION`,
  `VITE_SENTRY_DSN`, `VITE_SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`,
  `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`. All are `VITE_`-prefixed (client/public) build values.
- `apps/web/.env.example` already documents the same variable names with placeholder values — so removing
  the tracked real-value file does not lose any documentation.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm tracked | `git ls-files apps/web/.env.hosted` | prints the path |
| Untrack (keep on disk) | `git rm --cached apps/web/.env.hosted` | removes from index, file stays locally |
| Confirm ignored after | `git check-ignore apps/web/.env.hosted` | prints the path (now ignored) |
| Build still works | `pnpm run web:build` | exit 0 |

## Scope

**In scope**:
- Remove `apps/web/.env.hosted` from git tracking (`git rm --cached`).
- Add an explicit ignore line if needed (see Step 3).

**Out of scope** (do NOT do):
- Do NOT delete the file from disk (`git rm` without `--cached`) — it may be used locally / by the
  Railway build. Use `--cached` only.
- Do NOT rewrite git history (`git filter-repo`/BFG). History rewriting is a separate, coordinated
  operation and is out of scope; since the anon key is public-by-design, immediate history scrubbing is
  not required. Note it as a follow-up only.
- Do NOT rotate or print any credential value.
- Do NOT touch CI workflows or `railway.toml` — they pass env vars via the platform, not this file.

## Git workflow

- Branch: `advisor/004-untrack-env-hosted`
- Single commit; conventional-commit style, e.g. `chore: stop tracking apps/web/.env.hosted`.
- Commit message must NOT contain any value from the file — path and rationale only.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm current tracked state

**Verify**: `git ls-files apps/web/.env.hosted` → prints `apps/web/.env.hosted`.

### Step 2: Untrack the file, keeping it on disk

Run `git rm --cached apps/web/.env.hosted`.

**Verify**: `git status --short apps/web/.env.hosted` shows a staged deletion (`D`), and
`test -f apps/web/.env.hosted` → file still exists on disk (exit 0).

### Step 3: Confirm `.gitignore` now covers it

The existing `.env.*` rule should now make git ignore the (untracked) file.

**Verify**: `git check-ignore apps/web/.env.hosted` → prints the path (exit 0). If it does NOT print
(still not ignored), add an explicit line `apps/web/.env.hosted` under the env block in `.gitignore`,
then re-run until it prints.

### Step 4: Confirm the build is unaffected

The build reads env from the process environment / platform, not from a tracked file.

**Verify**: `pnpm run web:build` → exit 0. (CI already injects `VITE_SUPABASE_*` as job env, per
`.github/workflows/ci.yml`.)

## Test plan

No code tests. Verification is: file untracked, still on disk, now matched by `.gitignore`, and the build
still succeeds.

## Done criteria

- [ ] `git ls-files apps/web/.env.hosted` prints nothing (untracked)
- [ ] `test -f apps/web/.env.hosted` exits 0 (still on disk)
- [ ] `git check-ignore apps/web/.env.hosted` prints the path (ignored)
- [ ] `pnpm run web:build` exits 0
- [ ] No credential value appears in the diff, commit message, or PR text
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report (do not improvise) if:
- Untracking the file breaks the build or a CI step that reads it directly as a tracked path (it should
  not — env is injected by the platform; if something reads `.env.hosted` as a committed file, report it).
- You find the file contains a non-`VITE_`-prefixed value or anything resembling a service-role/secret key
  (names like `SERVICE_ROLE`, `SECRET`, `PRIVATE`). If so, STOP: this becomes a real secret-leak incident
  requiring rotation + history scrub, which is beyond this plan's scope. Report the variable *name* only.

## Maintenance notes

- **Deferred follow-up**: history rewrite to purge the file from past commits — only worth doing if a
  *non-public* secret is ever found in it (see STOP). For public anon/`VITE_` values it is optional.
- Document in `CLAUDE.md` (plan 001) that `.env*` files must never be tracked; `.env.example` is the only
  committed env file.
- Reviewer: confirm `--cached` was used (file still on disk) and no value leaked into the commit.
</content>
