# Plan 036: Override `brace-expansion` to the patched version

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- pnpm-workspace.yaml pnpm-lock.yaml`
> If any cited file changed since this plan was written, compare the "Current
> state" excerpts against the live files before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: deps/security
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The production static server transitively resolves a vulnerable
`brace-expansion` release. The 2026-07-24 audit found a high-severity denial of
service issue caused by unbounded expansion. A narrow workspace override raises
the vulnerable transitive version without changing the direct `serve` or Sentry
plugin versions, preserving Renovate as the owner of broader dependency
upgrades.

## Current state

Audit evidence captured on 2026-07-24 against commit `48f32f9`: `pnpm audit`
reported **3 high** vulnerabilities for the `brace-expansion` unbounded-expansion
DoS advisory [GHSA-mh99-v99m-4gvg]. Releases through `5.0.7` are vulnerable;
`5.0.8` and later are patched. The audited paths were:

- `apps/web > serve > serve-handler > minimatch` — the production static server
  used by the web package's `start` script.
- `apps/web > @sentry/vite-plugin > @sentry/bundler-plugins > glob > minimatch`.

`pnpm-workspace.yaml:5-6` already uses the workspace override mechanism:

```yaml
overrides:
  js-yaml: ">=4.1.2"
```

`pnpm-lock.yaml:2512-2517` currently resolves both an older v1 line and the
vulnerable v5 line; the latter records `brace-expansion@5.0.7`:

```yaml
brace-expansion@1.1.16:
  resolution: {integrity: sha512-IDw48K2/2kRkg9LdJxurvq3lV3aBgq0REY89duEqFRthjlPdXHKMj7EnQOXVckxzgisinf3nHfrcE2FufFLXMw==}

brace-expansion@5.0.7:
  resolution: {integrity: sha512-7oFy703dxfY3/NLxC1fh2SUCQ0H9rmAY+5EpDVfXjUTTs+HEwR2nYaqLv+GWcTsumwxPfiz6CzCNkwXwBUwqCA==}
  engines: {node: 18 || 20 || >=22}
```

The lockfile's importer graph also uses the vulnerable v5 instance through
`minimatch` at `pnpm-lock.yaml:7018-7023`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Dependency audit | `pnpm audit` | 0 vulnerabilities |

## Scope

**In scope**:
- `pnpm-workspace.yaml` — add the patched `brace-expansion` workspace override.
- `pnpm-lock.yaml` — regenerate after the override is added.

**Out of scope**:
- Direct upgrades of `serve`, `serve-handler`, `minimatch`, or Sentry packages;
  Renovate owns those broader upgrades.
- Application source, VAPID/Sentry configuration, and CI workflows.
- Any unrelated lockfile refresh.

## Git workflow

- Branch: `advisor/036-brace-expansion-override`
- Conventional Commits, e.g. `chore(deps): override vulnerable brace-expansion`.
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the audited resolution and existing override convention

Run the drift command from the preamble. Confirm the `js-yaml` entry remains
under the top-level `overrides` key and that the lockfile still has the
vulnerable `brace-expansion@5.0.7` resolution. Preserve the existing v1
resolution unless the package manager independently changes it while applying
the requested override.

**Verify**: `pnpm audit` → before the change, record the audit's reported
`brace-expansion` advisory and do not treat the historical count as a reason to
change scope.

### Step 2: Add the minimum patched override and regenerate the lockfile

Add this sibling entry under `overrides` in `pnpm-workspace.yaml`:

```yaml
brace-expansion: ">=5.0.8"
```

Run `pnpm install` once to update `pnpm-lock.yaml`. Review the resulting lockfile
only for the resolution changes caused by this override; do not manually edit
integrity values or refresh unrelated packages.

**Verify**: `pnpm audit` → `0 vulnerabilities`.

### Step 3: Build and smoke the production static server

Build the web package. Start its production server in the background, request
`http://localhost:3000/`, verify that the response is HTML, then terminate the
background server before completing the step.

**Verify**: `pnpm run web:build` → exit 0; `curl -sf http://localhost:3000/` →
returns HTML while `pnpm --filter @cypress-ink-labs/web start` is running, and
the server process is stopped afterward.

## Test plan

- No unit tests: this is a workspace override and lockfile update.
- `pnpm audit` must report zero vulnerabilities after install.
- `pnpm run web:build` proves the resolved production dependency graph builds.
- The production-server curl smoke proves the `serve` path remains able to serve
  the built HTML.

## Done criteria

- [ ] `pnpm-workspace.yaml` contains `brace-expansion: ">=5.0.8"` under
  `overrides` beside the established `js-yaml` pattern.
- [ ] `pnpm-lock.yaml` is updated by `pnpm install`, without manual integrity
  edits or unrelated dependency refreshes.
- [ ] `pnpm audit` reports `0 vulnerabilities`.
- [ ] `pnpm run web:build` exits 0.
- [ ] A running `pnpm --filter @cypress-ink-labs/web start` serves HTML to
  `curl -sf http://localhost:3000/`, and its background process is stopped.

## STOP conditions

- The cited files do not match the "Current state" excerpts after the drift
  check.
- The workspace no longer uses top-level `overrides`, or a conflicting
  `brace-expansion` override already exists.
- `pnpm install` requires an unrelated package-manager or workspace-policy
  migration; stop instead of broadening the dependency change.
- The post-install audit still reports this advisory, the web build fails, or
  the production server cannot return HTML after a focused investigation.

## Maintenance notes

- The override is intentionally a narrow security bridge. Remove it when direct
  dependency upgrades make it redundant, rather than retaining duplicate policy.
- Keep Renovate responsible for upgrading `serve` and Sentry packages; this plan
  does not pin or manually upgrade those parents.
- The historical audit count and paths in this plan are evidence from
  2026-07-24, not a substitute for the executor's post-change `pnpm audit`.
