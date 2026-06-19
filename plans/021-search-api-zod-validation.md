# Plan 021: Validate explore-search RPC rows with zod (parity with enriched events)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/explore/lib/search-api.ts apps/web/src/lib/schemas`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

Every other Supabase read path in this app validates RPC rows with a zod schema
and reports parse failures to Sentry via `parseRowsWithSentry`, so schema drift
surfaces as a captured error. The explore-search path is the lone exception: it
blind-casts raw rows with `as unknown as EventWithDetails`. If `search_events`
drifts (a renamed/dropped column), the cast still "succeeds" and the bad shape
flows into the explore cards, producing `undefined`-access render errors with no
Sentry breadcrumb pointing at the cause. This plan brings search to parity.

## Current state

`apps/web/src/features/explore/lib/search-api.ts:55-71`:

```ts
if (error) throw error

const rows = (data ?? []) as unknown[]

// search_events returns raw event rows, not enriched rows.
// Map them to EventWithDetails-compatible shape with empty enrichment fields.
const events: EventWithDetails[] = rows.map((row) => {
  const r = row as Record<string, unknown>
  return {
    ...(r as unknown as EventWithDetails),
    tags: [],
    avg_rating: 0,
    rating_count: 0,
    is_favorited: false,
    is_in_calendar: false,
  }
})
```

`search_events` returns **base event rows** (not enriched). The repo already has
a base-event schema and a Sentry-reporting parse helper:

- `eventRowSchema` — `apps/web/src/lib/schemas/event.ts` (the base event row;
  enriched rows extend it via `enrichedEventRowSchema`). Exported from the barrel
  `apps/web/src/lib/schemas` (see `apps/web/src/lib/schemas/index.ts:1`).
- `parseRowsWithSentry(schema, rows, context)` — `apps/web/src/lib/schemas/parse-rows.ts`
  (exported from the same barrel). Used by e.g.
  `apps/web/src/features/admin/api/sources.ts:17` and
  `apps/web/src/features/admin/hooks/events/use-admin-event-detail.ts:38`.

The enriched path that this should mirror:
`apps/web/src/features/events/hooks/use-enriched-events.ts` parses each row via
`enrichedEventRowSchema.safeParse(row)` before use.

**Important**: `eventRowSchema` validates only the **base** event columns. The
five enrichment fields the current code appends (`tags`, `avg_rating`,
`rating_count`, `is_favorited`, `is_in_calendar`) are NOT part of the base row —
they are defaults this function adds. So the fix validates the base row, then
spreads the defaults on top — same output shape, now drift-safe.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run tests (filter) | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `apps/web/src/features/explore/lib/search-api.ts` (modify the mapping block)
- `apps/web/src/features/explore/lib/search-api.test.ts` (create, if none exists)

**Out of scope**:
- `apps/web/src/lib/schemas/event.ts` — reuse `eventRowSchema` as-is; do NOT
  change the schema. If `search_events` returns a column the base schema lacks,
  STOP and report (the schema, not this call site, would need a decision).
- The `search_events` RPC itself (backend repo).
- `use-enriched-events.ts` — already validates; do not touch.

## Git workflow

- Branch: `advisor/021-search-api-zod-validation`
- Conventional Commits, e.g. `fix(explore): validate search RPC rows with zod`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace the blind cast with `parseRowsWithSentry(eventRowSchema, ...)`

In `search-api.ts`, import `eventRowSchema` and `parseRowsWithSentry` from
`@/lib/schemas`. Replace the `rows.map(...)` block so it (a) parses the raw
`data` array with `parseRowsWithSentry(eventRowSchema, data ?? [], { context })`
— matching the call style in `admin/api/sources.ts:17` — then (b) maps each
validated base row to `EventWithDetails` by spreading the same five enrichment
defaults (`tags: []`, `avg_rating: 0`, `rating_count: 0`, `is_favorited: false`,
`is_in_calendar: false`). Pass a descriptive `context` string (e.g.
`"search_events"`) so Sentry breadcrumbs identify this path. Preserve the
existing cursor logic below the map unchanged.

If `parseRowsWithSentry` drops invalid rows rather than throwing (read its
implementation first to confirm its contract), keep that behavior — partial
results are better than a crashed search; the Sentry capture is the goal.

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0; `grep -n "as unknown as EventWithDetails" apps/web/src/features/explore/lib/search-api.ts` → no matches.

### Step 2: Add a unit test

Create `search-api.test.ts`. Mock the supabase RPC to return a well-formed base
row → assert the mapped result has the enrichment defaults and the base fields.
Add a malformed-row case (missing a required column) → assert the function does
not throw and the bad row is handled per `parseRowsWithSentry`'s contract
(dropped or captured). Mock `@/infrastructure/supabase/client` and any Sentry
import as the existing schema tests do (see `apps/web/src/lib/schemas/event.test.ts`).

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/explore/lib/search-api.test.ts` → all pass.

### Step 3: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- `search-api.test.ts`: happy path (valid rows → mapped EventWithDetails with
  defaults), drift path (malformed row handled, no throw). Pattern:
  `apps/web/src/lib/schemas/event.test.ts` for schema/parse usage.
- Verification: `pnpm --filter @cypress-ink-labs/web run test` → all pass incl. new file.

## Done criteria

- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] `grep -rn "as unknown as EventWithDetails" apps/web/src/features/explore/` returns no matches
- [ ] `search-api.ts` parses via `parseRowsWithSentry(eventRowSchema, ...)`
- [ ] New test passes; `pnpm run verify:web` exits 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `search_events` returns columns the base `eventRowSchema` does not model (parse
  drops everything) — STOP; the schema needs a deliberate update, out of scope here.
- The output `EventWithDetails` shape no longer matches the five defaults in the
  excerpt (drift since `37234b7`).
- Typecheck fails because `eventRowSchema`'s inferred row type isn't spread-
  compatible with `EventWithDetails` — STOP and report rather than `as`-casting around it.

## Maintenance notes

- If enrichment is ever added to `search_events` server-side, switch the schema
  from `eventRowSchema` to `enrichedEventRowSchema` and drop the hardcoded defaults.
- Reviewer: confirm the Sentry `context` string is set and the cursor logic below
  the map is byte-unchanged.
