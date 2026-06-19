# Plan 025: Remove the `as unknown as` casts in the auth profile/access loader

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/auth/api/load-profile-and-access.ts apps/web/src/lib/schemas/auth.ts apps/web/src/shared/types.ts`
> If any in-scope file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

The session-bootstrap loader validates the profile/access rows with zod and then
casts the *validated* result through `as unknown as` to the domain type. The
double-cast defeats the point of validating: if the zod schema's output and the
domain type (`UserProfile`/`UserAccess`) ever diverge, the cast silently hides
it instead of failing the compiler. This is a small, contained type-safety
cleanup on a critical path (every authenticated session calls it).

## Current state

`apps/web/src/features/auth/api/load-profile-and-access.ts:41-46`:

```ts
const profile = profileResult.data
  ? (userProfileRowSchema.parse(profileResult.data) as unknown as UserProfile)
  : null
const access = accessResult.data
  ? (userAccessRowSchema.parse(accessResult.data) as unknown as UserAccess)
  : null
```

- `userProfileRowSchema` / `userAccessRowSchema` — `apps/web/src/lib/schemas/auth.ts`
  (both use `.passthrough()`, so their inferred output is a loose object).
- `UserProfile` / `UserAccess` — domain types in `apps/web/src/shared/types.ts`,
  derived from the generated DB `Tables<>` aliases (a different source of truth
  than the zod schema — which is *why* the `as unknown as` bridge exists today).
- Sentry is already imported here as `Sentry` (line 50) — unrelated to this change.

The cast bridges "zod passthrough output" → "DB-derived domain type". The clean
fix is to make the schema's parsed output assignable to the domain type so a
single (or zero) assertion suffices and the compiler enforces the match.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run tests (filter) | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `apps/web/src/features/auth/api/load-profile-and-access.ts`
- `apps/web/src/lib/schemas/auth.ts` (only if the schema must be tightened so its
  output is assignable — e.g. a `.transform()` or matching the column set)

**Out of scope**:
- `apps/web/src/shared/types.ts` — do NOT change `UserProfile`/`UserAccess`; they
  mirror the DB. Align the schema to them, not the reverse.
- The Supabase queries / column selections in the loader.
- The existing `auth.test.ts` schema tests must keep passing.

## Git workflow

- Branch: `advisor/025-load-profile-drop-unknown-cast`
- Conventional Commits, e.g. `refactor(auth): drop as-unknown casts in profile loader`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Determine whether the schema output is already assignable

In `load-profile-and-access.ts`, change line 42 from
`... as unknown as UserProfile` to `... as UserProfile` (single assertion) and
line 45 likewise to `as UserAccess`. Run typecheck.

- If it compiles: the `unknown` hop was pure noise — keep the single `as` (or
  drop it entirely if even that is unneeded) and go to Step 3.
- If it errors: the schema output genuinely diverges from the domain type. Go to
  Step 2.

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → note pass/fail.

### Step 2 (only if Step 1 errored): Align the schema output to the domain type

Tighten `userProfileRowSchema` / `userAccessRowSchema` in `lib/schemas/auth.ts`
so their parsed output is assignable to `UserProfile` / `UserAccess` — e.g. add a
`.transform()` that returns the exact domain shape, or narrow the schema so its
`z.infer` matches. Then the loader needs no cast (or a single `as`). Do not widen
the domain types. If aligning would require restructuring the domain types or the
DB-derived aliases, that is beyond this S-effort cleanup — **STOP and report**.

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0.

### Step 3: Confirm no behavioral change + tests pass

The runtime behavior (validate, then return / throw on parse failure) must be
identical. Run the existing auth schema tests and the full gate.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/lib/schemas/auth.test.ts` → all pass; `pnpm run verify:web` → exit 0.

## Test plan

- No new test strictly required (type-level change). If Step 2 alters the schema,
  add/extend a case in `apps/web/src/lib/schemas/auth.test.ts` asserting a valid
  row parses to the expected shape and an invalid row throws.
- Verification: `pnpm run verify:web` → all pass.

## Done criteria

- [ ] `grep -n "as unknown as UserProfile\|as unknown as UserAccess" apps/web/src/features/auth/api/load-profile-and-access.ts` returns no matches
- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0 (the compiler now enforces schema-output ↔ domain-type match)
- [ ] Runtime behavior unchanged (parse-then-return / throw)
- [ ] `pnpm run verify:web` exits 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Removing the `unknown` hop requires restructuring `shared/types.ts` domain types
  or the DB-derived aliases — out of scope for an S cleanup; STOP and report.
- The schemas' live code diverges from the excerpts (drift since `37234b7`).
- `auth.test.ts` fails after a schema tweak and the fix isn't obvious — STOP.

## Maintenance notes

- Goal is that the compiler — not a cast — guarantees the parsed row matches the
  domain type. If the DB schema later adds a profile/access column, the schema and
  domain type should both pick it up; this change makes a mismatch a compile error.
- Reviewer: confirm runtime parse/throw behavior is byte-equivalent and no domain
  type was widened to make the cast removable.
