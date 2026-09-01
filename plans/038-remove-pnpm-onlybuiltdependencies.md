# Plan 038: Remove the pnpm 11 build-policy setting that no longer exists

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- package.json pnpm-workspace.yaml`
> If an in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live file before proceeding; a mismatch
> is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: deps
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

`onlyBuiltDependencies` was removed in pnpm 11 in favor of `allowBuilds`. The
legacy list is therefore ineffective configuration: editing it appears to
change the build policy while pnpm actually reads the separate `allowBuilds`
map. Removing the dead block leaves one auditable source of truth without
changing which dependency build scripts are permitted.

## Current state

`package.json:5` pins the workspace package manager to pnpm 11:

```json
"packageManager": "pnpm@11.25.0"
```

`pnpm-workspace.yaml:8-17` already has the active pnpm 11 policy and a stale
legacy duplicate:

```yaml
allowBuilds:
  '@sentry/cli': true
  esbuild: true
  lefthook: true
  sharp: true
  workerd: true

onlyBuiltDependencies:
  - esbuild
  - lefthook
```

`esbuild` and `lefthook` are both already explicitly allowed by the active map
at `pnpm-workspace.yaml:10-11`. pnpm 11 no longer recognizes
`onlyBuiltDependencies`; `allowBuilds` is the policy to retain.

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
- `pnpm-workspace.yaml` — delete the obsolete `onlyBuiltDependencies` block.

**Out of scope**:
- The contents of `allowBuilds`; preserve every existing mapping and value.
- `package.json` and the pnpm version pin.
- CI configuration, dependency upgrades, and lockfile changes.
- A new workspace guard test.

## Git workflow

- Branch: `advisor/038-remove-pnpm-onlybuiltdependencies`
- Conventional Commits, e.g. `chore: remove obsolete pnpm build-policy setting`.
- Do **not** push or open a PR.

## Steps

### Step 1: Confirm the active pnpm 11 policy before editing

Read `package.json` and `pnpm-workspace.yaml` after the drift check. Confirm
that `packageManager` remains `pnpm@11.25.0`, `onlyBuiltDependencies` contains
only `esbuild` and `lefthook`, and `allowBuilds` already sets both keys to
`true`. Do not change the active map.

**Verify**: `pnpm config get allowBuilds` prints a map including `esbuild: true`
and `lefthook: true`.

### Step 2: Remove only the dead block

Delete `onlyBuiltDependencies:` and its two list entries from
`pnpm-workspace.yaml`. Keep the surrounding `allowBuilds` and
`minimumReleaseAgeExclude` sections byte-for-byte unchanged.

**Verify**: `grep -n "onlyBuiltDependencies" pnpm-workspace.yaml` returns no
matches, while `grep -n "esbuild\|lefthook" pnpm-workspace.yaml` still shows
both entries in `allowBuilds`.

### Step 3: Validate installation and workspace configuration

Use pnpm's frozen-lockfile install to ensure the workspace config remains
accepted without changing the lockfile, then run the workspace guards that read
workspace configuration.

**Verify**: `pnpm install --frozen-lockfile` exits 0 and `pnpm run workspace:test`
exits 0.

## Test plan

- No unit test is added: this is a pnpm-workspace configuration cleanup with no
  runtime behavior change.
- `pnpm install --frozen-lockfile` proves pnpm accepts the edited config.
- `pnpm config get allowBuilds` proves the retained policy exposes the two
  required build permissions.
- `pnpm run workspace:test` covers the repository's workspace configuration
  guards.

## Done criteria

- [ ] `pnpm-workspace.yaml` has no `onlyBuiltDependencies` key.
- [ ] `allowBuilds` still contains `esbuild: true` and `lefthook: true`.
- [ ] `pnpm install --frozen-lockfile` exits 0 without modifying the lockfile.
- [ ] `pnpm config get allowBuilds` prints the active map.
- [ ] `pnpm run workspace:test` exits 0.
- [ ] Only `pnpm-workspace.yaml` is modified for this plan.
- [ ] `plans/README.md` status row is updated.

## STOP conditions

- `package.json` no longer pins pnpm 11.25.0, or either policy excerpt in
  `pnpm-workspace.yaml` does not match the Current state section.
- `allowBuilds` does not already allow `esbuild` and `lefthook`; do not infer a
  replacement policy in this cleanup plan.
- Removing the legacy block changes the frozen lockfile or causes pnpm to reject
  the workspace configuration.
- The workspace guard fails twice after restoring the exact intended YAML shape.
- Code does not match the Current state excerpts after the drift check.

## Maintenance notes

- `allowBuilds` is now the sole build-script policy. Make future build-policy
  changes there, never in a reintroduced legacy list.
- A workspace guard for the pnpm setting was considered and deliberately
  skipped: Renovate owns the pnpm version pin, so a guard would add maintenance
  burden without protecting a stable project contract.
- When upgrading pnpm, consult the release notes before adding policy keys; a
  removed setting can otherwise create a misleading second source of truth.
