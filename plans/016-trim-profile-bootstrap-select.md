# Plan 016: Replace `select("*")` with explicit columns in session bootstrap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat e07d499..HEAD -- apps/web/src/features/auth/api/load-profile-and-access.ts apps/web/src/lib/schemas/auth.ts apps/web/src/shared/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `e07d499`, 2026-06-18

## Why this matters

`loadProfileAndAccess()` runs on every session bootstrap (auth init, token
refresh, tab focus that re-syncs) and fetches **all columns** from both
`user_profiles` and `user_access` with `select("*")`. The result is immediately
narrowed through a Zod schema that reads only a known set of fields. Any wide or
future column (JSON blobs, internal metadata) is shipped over the wire on every
sync for no benefit. Pinning the select to the columns actually consumed makes the
hottest auth query smaller and makes the client's data contract explicit.

This is a low-risk win because the schema parse already defines exactly which
fields are required downstream — the column list mirrors it.

## Current state

- `apps/web/src/features/auth/api/load-profile-and-access.ts:22-25` — the queries:
  ```ts
  const [profileResult, accessResult] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle(),
  ])
  ```
  Results are parsed at lines 29-34 via `userProfileRowSchema.parse(...)` /
  `userAccessRowSchema.parse(...)`.

- `apps/web/src/lib/schemas/auth.ts` — the schemas define the consumed fields:
  ```ts
  export const userProfileRowSchema = z.object({
    id: z.string(),
    email: z.string().nullable(),
    display_name: z.string().nullable(),
    avatar_url: z.string().nullable().optional(),
    role: z.enum(["user", "admin"]),
    created_at: z.string(),
    updated_at: z.string(),
  }).passthrough()

  export const userAccessRowSchema = z.object({
    user_id: z.string(),
    is_enabled: z.boolean(),
    enabled_at: z.string().nullable(),
    disabled_at: z.string().nullable(),
    disabled_reason: z.string().nullable(),
    access_expires_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  }).passthrough()
  ```
  **Critical nuance**: both schemas use `.passthrough()`, and the parse is cast to
  `UserProfile` / `UserAccess` (`apps/web/src/shared/types.ts`). The app may read
  fields off the profile that the schema does NOT list but `select("*")` currently
  supplies. For example `profile.tsx` reads `profile.child_name` and
  `profile.child_age` (see `apps/web/src/features/profile/pages/profile.tsx:55-56`)
  and `profile.city_preference_id` — these are NOT in the schema's `z.object`
  shape but survive today because of `select("*")` + `.passthrough()`. **You must
  not drop columns the app actually consumes.** Step 1 enumerates them.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Find UserProfile/UserAccess fields | `grep -rn "interface UserProfile\|interface UserAccess\|type UserProfile\|type UserAccess" apps/web/src` | shows the type defs |
| Find profile field reads | `grep -rn "profile\.\|access\." apps/web/src/features` | enumerate consumed fields |
| Unit tests (web) | `pnpm run web:test` | all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `apps/web/src/features/auth/api/load-profile-and-access.ts` — the two `select` calls only.

**Out of scope** (do NOT touch):
- `apps/web/src/lib/schemas/auth.ts` — schemas stay as they are (still `.passthrough()`).
- Any other `select("*")` in the codebase — this plan is scoped to the bootstrap path only.
- Removing `.passthrough()` — keep it; it tolerates additive migrations.

## Git workflow

- Branch: `advisor/016-trim-profile-bootstrap-select`
- Conventional Commits, e.g. `perf(auth): select explicit columns in session bootstrap`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Enumerate the columns the app actually consumes

Build the exact column list for each table before editing. Start from the schema
fields (above), then add any field read off `profile`/`access` anywhere in the app
but NOT in the schema shape.

Run:
```
grep -rno "profile\.[a-z_]\+" apps/web/src | sort -u
grep -rno "access\.[a-z_]\+" apps/web/src | sort -u
```
Also open `apps/web/src/shared/types.ts` and read the `UserProfile` and
`UserAccess` type definitions — every field on those types that the DB row
provides must be in the select list.

Known reads beyond the schema shape (confirm and include): `child_name`,
`child_age`, `city_preference_id` on the profile (`profile.tsx:55-56,73`).

Produce two comma-separated column lists. If you find a consumed field whose DB
column name is ambiguous (e.g. a computed/derived property that is not a real
column), STOP and report rather than guessing a column name.

### Step 2: Apply the explicit selects

Replace the two `select("*")` calls with the column lists from Step 1, e.g.:
```ts
supabase
  .from("user_profiles")
  .select("id, email, display_name, avatar_url, role, created_at, updated_at, child_name, child_age, city_preference_id")
  .eq("id", userId)
  .maybeSingle(),
supabase
  .from("user_access")
  .select("user_id, is_enabled, enabled_at, disabled_at, disabled_reason, access_expires_at, created_at, updated_at")
  .eq("user_id", userId)
  .maybeSingle(),
```
(Use the lists you derived in Step 1, not these verbatim, if Step 1 found more.)

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0.

### Step 3: Tests

There is an existing schema test at `apps/web/src/lib/schemas/auth.test.ts`. No
schema change here, so it should still pass untouched. Run the full unit suite to
confirm nothing that reads a profile/access field regressed.

**Verify**: `pnpm run web:test` → all pass.

### Step 4: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- No new test file is strictly required (behavior is unchanged; this is a
  payload-shape optimization). The guard is the existing suite plus typecheck.
- **If** Step 1 reveals the consumed-field set is non-obvious, add a brief test to
  `apps/web/src/lib/schemas/auth.test.ts` asserting the schema still parses a row
  containing only the selected columns (model after the existing `parse` cases in
  that file).
- Verification: `pnpm run web:test` → all pass.

## Done criteria

ALL must hold:

- [ ] `grep -n 'select("\*")' apps/web/src/features/auth/api/load-profile-and-access.ts` returns **no** matches
- [ ] Both selects list explicit columns that include every field consumed off `profile`/`access` (verified in Step 1)
- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] `pnpm run web:test` exits 0
- [ ] `pnpm run verify:web` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A field is read off `profile`/`access` in the app but you cannot confidently map
  it to a real DB column name (guessing a column risks a runtime "column does not
  exist" error on the hottest auth path).
- The `UserProfile`/`UserAccess` types in `shared/types.ts` list fields with no
  clear source column.
- Any test that previously passed now fails because a column was dropped — restore
  `select("*")`, report which field broke.

## Maintenance notes

- When a future migration adds a `user_profiles`/`user_access` column the client
  needs, it must be added to these explicit select lists too (and to the schema if
  it should be validated). `.passthrough()` will not surface a *missing* column —
  a forgotten column simply won't be fetched. A reviewer should check that any PR
  adding a consumed profile/access field also updates this select.
