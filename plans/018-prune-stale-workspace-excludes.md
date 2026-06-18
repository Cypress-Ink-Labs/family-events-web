# Plan 018: Prune stale `minimumReleaseAgeExclude` entries for tanstack-virtual

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat e07d499..HEAD -- pnpm-workspace.yaml apps/web/package.json`
> If either in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies / tech-debt
- **Planned at**: commit `e07d499`, 2026-06-18

## Why this matters

`minimumReleaseAgeExclude` in `pnpm-workspace.yaml` lists packages exempt from the
workspace's minimum-release-age gate. Two entries are **version-pinned to versions
the manifest has already moved past**: `@tanstack/react-virtual@3.13.26` while
`apps/web/package.json` declares `@tanstack/react-virtual: ^3.14.3`, and
`@tanstack/virtual-core@3.16.0`. A pinned exclude entry only matches its exact
version, so these no longer match the resolved dependency — they are dead
configuration that reads as intentional pinning to a future maintainer. Removing
them keeps the exclude list honest (it should list only packages that genuinely
need the age-gate bypass). This is pure config hygiene with no runtime effect.

## Current state

- `pnpm-workspace.yaml:19-31` — the exclude block:
  ```yaml
  minimumReleaseAgeExclude:
    - '@vitest/*'
    - vitest
    # framer-motion/motion-dom/motion are excluded as a release trio; framer-motion is a transitive of motion, kept intentionally
    - framer-motion@12.40.0
    - motion-dom@12.40.0
    - motion@12.40.0
    - vite@8.0.16
    - '@tanstack/react-virtual@3.13.26'
    - '@tanstack/virtual-core@3.16.0'
    - '@cypress-ink-labs/contracts'
    - '@cypress-ink-labs/design-system'
  ```
- `apps/web/package.json:33` — `"@tanstack/react-virtual": "^3.14.3"` (the manifest
  floor is already above the pinned exclude `3.13.26`; `virtual-core` is its
  transitive peer).

The two **target lines** to remove are exactly:
```yaml
    - '@tanstack/react-virtual@3.13.26'
    - '@tanstack/virtual-core@3.16.0'
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lockfile dry-check | `pnpm install --lockfile-only` | exit 0; lockfile unchanged or only metadata reorder |
| Lockfile diff | `git diff --stat pnpm-lock.yaml` | ideally no change (see Step 2) |
| Workspace guard | `pnpm run workspace:test` | all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `pnpm-workspace.yaml` — remove the two `@tanstack/*` exclude lines only.

**Out of scope** (do NOT touch):
- The `framer-motion`/`motion-dom`/`motion` trio — kept intentionally (see the
  inline comment); do not remove or "tidy" them.
- The `vite@8.0.16`, `@vitest/*`, `vitest`, `@cypress-ink-labs/*` entries.
- `apps/web/package.json` dependency ranges — do not bump or move anything.
- **Do NOT move `@cypress-ink-labs/contracts` to devDependencies.** It exports
  runtime values used in the bundle (`DEFAULT_NOTIFICATION_PREFERENCES` and
  `toUpsertParams` in `apps/web/src/features/profile/hooks/use-notification-preferences.ts`),
  so it must stay a regular dependency. (This was a considered-and-rejected finding —
  see `plans/README.md`.)

## Git workflow

- Branch: `advisor/018-prune-stale-workspace-excludes`
- Conventional Commits, matching the recent style for this exact file:
  `chore: drop stale tanstack-virtual entries from workspace release-age exclude`
  (cf. `53239f9 chore: fix stale vite version in workspace release-age exclude`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the two stale lines

Delete exactly these two lines from the `minimumReleaseAgeExclude` block in
`pnpm-workspace.yaml`:
```yaml
    - '@tanstack/react-virtual@3.13.26'
    - '@tanstack/virtual-core@3.16.0'
```
Leave every other entry intact.

**Verify**: `grep -n "tanstack" pnpm-workspace.yaml` → returns **no** matches.

### Step 2: Confirm the lockfile is stable

Run `pnpm install --lockfile-only`. Because these entries were stale (not matching
the resolved version), removing them should not change which versions resolve.

**Verify**: `git diff --stat pnpm-lock.yaml`
- Expected: no change, or a no-op reordering.
- If the lockfile shows `@tanstack/react-virtual` or `@tanstack/virtual-core`
  changing to a **different version**, that means the exclude was load-bearing
  after all — **STOP and report** (do not commit the lockfile change). Restore the
  two lines.

### Step 3: Guards + full gate

**Verify**: `pnpm run workspace:test` → all pass.
**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- No new tests. This is config hygiene; the guards (`workspace:test`) and a stable
  lockfile are the verification.
- Verification: `pnpm run workspace:test` and `pnpm run verify:web` → both pass.

## Done criteria

ALL must hold:

- [ ] `grep -n "tanstack" pnpm-workspace.yaml` returns no matches
- [ ] `pnpm install --lockfile-only` leaves `@tanstack/react-virtual` /
      `@tanstack/virtual-core` resolved versions unchanged (`git diff pnpm-lock.yaml`)
- [ ] `pnpm run workspace:test` exits 0
- [ ] `pnpm run verify:web` exits 0
- [ ] Only `pnpm-workspace.yaml` modified (`git status`); `apps/web/package.json` untouched
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Removing the lines changes resolved versions in `pnpm-lock.yaml` (the exclude was
  not stale after all).
- The exclude block no longer matches the excerpt (drift since `e07d499`).
- Any guard in `pnpm run workspace:test` fails after the change.

## Maintenance notes

- `minimumReleaseAgeExclude` entries should be removed once the package they
  unblocked has aged past the gate; the pattern this repo uses for a still-needed
  pin is to **bump the version** (as `53239f9` did for vite), not to leave a stale
  one. A reviewer should treat any version-pinned exclude entry that no longer
  matches the manifest range as removable.
- `@cypress-ink-labs/contracts` must remain a runtime dependency (it has value
  exports) — do not revisit moving it to devDependencies.
