# Plan 039: Delete the orphaned `scripts/dev-all.sh`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- scripts/dev-all.sh scripts package.json README.md`
> If an in-scope or cited file changed since this plan was written, compare the
> "Current state" excerpts against the live file before proceeding; a mismatch
> is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The purported all-in-one development script cannot start the application. It
first invokes two absent backend scripts and an absent root package script,
while the README explicitly says this repository has no in-repo Supabase stack.
Keeping the dead entry point advertises a local topology that does not exist and
sends contributors into a deterministic failure before `pnpm run dev` starts.
Deleting it is safer than inventing a replacement for a separate backend repo.

## Current state

`scripts/dev-all.sh:24-31` attempts to start an in-repo Supabase stack and then
launches the web dev process:

```bash
bash scripts/supabase.sh start
pnpm run setup:local

bash scripts/supabase-functions-serve.sh &
pids+=("$!")

pnpm run dev &
pids+=("$!")
```

Neither `scripts/supabase.sh` nor `scripts/supabase-functions-serve.sh` exists.
The `scripts/` directory contains only these four scripts:

- `check-monorepo.sh`
- `clean-generated-artifacts.sh`
- `deploy-web.sh`
- `dev-all.sh`

The root `package.json:6-31` has no `setup:local` script. The documented
workspace topology is explicit at `README.md:9`: “This repo has no in-repo
Supabase stack; local-Supabase development is driven from the separate Supabase
backend repository.” No root package script, README entry, or documentation file
references `dev-all`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead-code scan | `pnpm knip` | completes without a newly introduced finding |
| Dependency audit | `pnpm audit` | reports the current dependency audit result |

## Scope

**In scope**:
- `scripts/dev-all.sh` — delete the orphaned script.

**Out of scope**:
- Creating a replacement local-Supabase orchestrator.
- README and other documentation changes; the existing separate-backend guidance
  is already authoritative and accurate.
- Root package scripts, dev-server behavior, and backend repository tooling.

## Git workflow

- Branch: `advisor/039-delete-orphaned-dev-all-script`
- Conventional Commits, e.g. `chore: remove orphaned dev-all script`.
- Do **not** push or open a PR.

## Steps

### Step 1: Reconfirm that the script is orphaned

After the drift check, read `scripts/dev-all.sh`, list `scripts/`, inspect the
root `package.json` scripts, and read the topology statement in `README.md`.
Confirm the two shell-script dependencies and `setup:local` remain absent, and
that the README still directs local backend work to the separate backend repo.

**Verify**: `grep -rn "setup:local\|supabase-functions-serve\|scripts/supabase.sh" scripts package.json README.md` returns only the stale references in `scripts/dev-all.sh`.

### Step 2: Delete the dead entry point

Delete `scripts/dev-all.sh` with no replacement. The supported developer entry
point remains the existing root `pnpm run dev` command, backed by the separate
backend workflow documented in the README.

**Verify**: `grep -rn "dev-all" . --include="*.json" --include="*.md" --include="*.sh" --include="*.yml"` returns no matches.

### Step 3: Run the full web gate

Run the normal repository gate to ensure no package, workspace, or docs guard
still expects the deleted script.

**Verify**: `pnpm run verify:web` exits 0.

## Test plan

- No unit test is added: this plan removes an unreachable shell entry point.
- The repository-wide grep proves no supported surface still references
  `dev-all`.
- `pnpm run verify:web` proves the workspace and web pipeline do not depend on
  the removed file.

## Done criteria

- [ ] `scripts/dev-all.sh` is absent.
- [ ] `grep -rn "dev-all" . --include="*.json" --include="*.md" --include="*.sh" --include="*.yml"` returns no matches.
- [ ] `pnpm run verify:web` exits 0.
- [ ] No replacement script or local-Supabase setup is introduced.
- [ ] Only `scripts/dev-all.sh` is modified for this plan.
- [ ] `plans/README.md` status row is updated.

## STOP conditions

- A cited script, root package command, README statement, or another repository
  reference shows that `dev-all.sh` is a supported current workflow.
- `scripts/supabase.sh`, `scripts/supabase-functions-serve.sh`, or a
  `setup:local` root script exists after the drift check; this is no longer an
  orphan deletion and requires a separately scoped decision.
- The full web gate reports a dependency on the deleted script.
- Code does not match the Current state excerpts after the drift check.

## Maintenance notes

- The separate Supabase backend repository remains the authoritative home for
  local database and functions orchestration. Do not recreate that workflow in
  this repository without an approved cross-repository design.
- If the project later adds an in-repo backend stack, introduce a new documented
  launcher with its dependencies and smoke coverage rather than restoring this
  stale script.
