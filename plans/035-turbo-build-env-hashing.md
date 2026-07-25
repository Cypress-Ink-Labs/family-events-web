# Plan 035: Declare and hash the production build environment in Turbo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- turbo.json apps/web/vite.config.ts railway.toml`
> If any cited file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Turbo strict environment mode exposes only declared task environment variables
(or framework-inferred variables). The web production build consumes Sentry
release/upload configuration that is neither framework-inferred nor declared on
its build task. Railway therefore can build without the intended Sentry/release
inputs, while Turbo's cache key cannot distinguish builds made with different
release configuration. The stale pass-through list also suggests platform
surfaces that this web-only workspace does not contain.

## Current state

`apps/web/vite.config.ts:10-20` constructs `buildEnv` with `createEnv` and reads
all six production build values:

```ts
const buildEnv = createEnv({
  server: {
    VITE_GOOGLE_SITE_VERIFICATION: z.string().min(1).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    SENTRY_RELEASE: z.string().min(1).optional(),
    RAILWAY_GIT_COMMIT_SHA: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
```

The release is subsequently derived from `SENTRY_RELEASE` or
`RAILWAY_GIT_COMMIT_SHA` at `apps/web/vite.config.ts:69-71`, making those inputs
material to the built output.

`turbo.json:3-11` currently has a global pass-through block, while the dedicated
web build task at `turbo.json:35-38` declares only dependencies and outputs:

```json
"globalPassThroughEnv": [
  "ANDROID_GOOGLE_WEB_CLIENT_ID",
  "ANDROID_HOME",
  "ANDROID_SDK_ROOT",
  "JAVA_HOME",
  "MAP_STYLE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_URL"
],
"@cypress-ink-labs/web#build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", "../../node_modules/.tmp/apps-web*.tsbuildinfo"]
}
```

The declared pass-through names are stale for this repository: a targeted grep
finds `MAP_STYLE_URL` and unprefixed `SUPABASE_URL`/`SUPABASE_ANON_KEY` only in
this block; current app configuration uses `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The `apps/` workspace contains only `web`, not Android
or iOS projects.

`railway.toml:1-5` invokes Turbo for deployment builds and starts the web package:

```toml
[build]
buildCommand = "turbo run build --filter=@cypress-ink-labs/web"

[deploy]
startCommand = "pnpm --filter=@cypress-ink-labs/web start"
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |

## Scope

**In scope**:
- `turbo.json` — remove `globalPassThroughEnv` and declare the web build task's
  complete hashed environment list.

**Out of scope**:
- `apps/web/vite.config.ts` — it already validates the required build inputs.
- `railway.toml` — it correctly invokes the Turbo web build.
- CI workflows, environment-secret provisioning, and any runtime env handling.
- Adding `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` manually: Vite infers
  `VITE_*` variables for Turbo.

## Git workflow

- Branch: `advisor/035-turbo-build-env-hashing`
- Conventional Commits, e.g. `chore(turbo): hash production web build environment`.
- Do NOT push or open a PR.

## Steps

### Step 1: Reconfirm the Turbo boundary

Run the drift command from the preamble, then compare `vite.config.ts`'s
`createEnv` schema with `turbo.json`'s dedicated web-build task. Confirm that the
six required task names are exactly `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_RELEASE`, `RAILWAY_GIT_COMMIT_SHA`, and
`VITE_GOOGLE_SITE_VERIFICATION`. Do not add the Vite-inferred Supabase names.

**Verify**: `pnpm exec turbo run @cypress-ink-labs/web#build --dry=json` → the
pre-change task metadata shows no explicit six-name `env` list; record this only
as the before-state for the next step.

### Step 2: Replace the stale pass-through list with task-scoped hashing

Delete the entire top-level `globalPassThroughEnv` block. Add this exact `env`
array to `@cypress-ink-labs/web#build`:

```json
"env": [
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_RELEASE",
  "RAILWAY_GIT_COMMIT_SHA",
  "VITE_GOOGLE_SITE_VERIFICATION"
]
```

Place it in the existing task object alongside `dependsOn` and `outputs`. These
task-scoped `env` entries both expose the variables in strict mode and include
them in Turbo's cache key.

**Verify**: `pnpm exec turbo run @cypress-ink-labs/web#build --dry=json` → the
web build task's `env` list contains all six names and no
`globalPassThroughEnv` block remains in `turbo.json`.

### Step 3: Prove the build remains valid and release changes miss cache

Run a normal web build. Then run the same Turbo web-build task twice with all
other inputs held constant but with a different `SENTRY_RELEASE` value for the
second run. Inspect Turbo output: the second run must be a cache MISS, proving
that the value participates in the task hash rather than only being forwarded.

**Verify**: `pnpm run web:build` → exit 0; the changed-`SENTRY_RELEASE` second
Turbo invocation reports a cache MISS.

## Test plan

- No unit tests: this is a Turbo configuration change.
- Inspect the dry-run JSON after the edit and assert the dedicated web build task
  contains all six exact environment names.
- Run `pnpm run web:build`, then use two otherwise-identical Turbo build runs
  with distinct `SENTRY_RELEASE` values to observe a cache MISS on the second
  run.

## Done criteria

- [ ] `globalPassThroughEnv` is absent from `turbo.json`.
- [ ] `@cypress-ink-labs/web#build` declares exactly the six specified `env`
  names in its dry-run JSON.
- [ ] `pnpm run web:build` exits 0.
- [ ] Changing only `SENTRY_RELEASE` between two Turbo web-build runs produces a
  cache MISS on the second run.
- [ ] No files outside `turbo.json` are modified for this implementation.

## STOP conditions

- The cited code does not match the "Current state" excerpts after the drift
  check.
- `turbo.json` already has task-scoped build environment declarations that
  conflict with the specified six-name list.
- Dry-run JSON does not expose a reliable web-task environment list; stop and
  capture the exact Turbo output rather than guessing its schema.
- The changed-release build reports a cache HIT after the task was edited.

## Maintenance notes

- This change intentionally invalidates existing web-build cache entries once;
  that one-time cache churn is expected because the task hash gains new inputs.
- Keep build-time Sentry/release inputs task-scoped. Do not reintroduce a broad
  global pass-through list for platforms absent from this workspace.
- If a new production build input is added to `vite.config.ts`, add it to this
  task's `env` list in the same change so strict-mode exposure and cache hashing
  stay aligned.
