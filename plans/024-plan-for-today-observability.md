# Plan 024: Add a Sentry signal when plan-for-today silently drops ranked events

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/plan/hooks/use-plan-for-today.ts`
> If it changed since this plan was written, compare the "Current state" excerpt
> against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

`use-plan-for-today` hydrates the ranked plan rows (from the planning RPC) with
enriched event data fetched by id. Any ranked row whose enriched event is missing
is silently dropped — the user sees fewer plan suggestions than the server
computed, and there is no signal that it happened. The skip itself is a
defensible anti-join (a transiently-missing enrichment shouldn't crash the page),
but the **silence** is the problem: a systematic enrichment drift degrades the
core "today's plan" feature with zero operator visibility. This plan adds a
non-fatal Sentry capture on the mismatch — behavior unchanged, observability added.

## Current state

`apps/web/src/features/plan/hooks/use-plan-for-today.ts:173-186`:

```ts
const eventsById = new Map(
  (eventRows ?? []).map((row) => {
    const enrichedEvent = adaptEnrichedRow(row)
    return [enrichedEvent.id, enrichedEvent]
  })
)

const plannedEvents = rankedRows.reduce<PlannedEvent[]>((acc, row) => {
  const event = eventsById.get(row.event_id)
  if (!event) {
    return acc  // <-- silent skip
  }
  acc.push({ ...event, plan_score: row.score, /* ... */ })
  ...
```

The repo already reports to Sentry from non-React data code — see
`apps/web/src/lib/schemas/parse-rows.ts` (`parseRowsWithSentry`) for the exact
Sentry import and `captureException`/`captureMessage` idiom this codebase uses.
**Match that import and call style** rather than introducing a new Sentry import
convention. Confirm the idiom with: `grep -rn "captureMessage\|captureException\|@sentry" apps/web/src | head`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run tests (filter) | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `apps/web/src/features/plan/hooks/use-plan-for-today.ts` (add the mismatch check + capture)
- `apps/web/src/features/plan/hooks/use-plan-for-today.test.ts(x)` (create or extend)

**Out of scope**:
- Changing the skip behavior itself — the page must NOT throw or block on a
  missing enriched row. Add observability only.
- The planning RPC or `adaptEnrichedRow` (used elsewhere).

## Git workflow

- Branch: `advisor/024-plan-for-today-observability`
- Conventional Commits, e.g. `fix(plan): capture a Sentry signal when ranked events are dropped`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Capture a non-fatal Sentry event on count mismatch

After the `reduce` builds `plannedEvents`, compare `plannedEvents.length` to
`rankedRows.length`. When `plannedEvents.length < rankedRows.length`, call the
codebase's existing Sentry capture (the one used in `parse-rows.ts`) with a
non-fatal message tagged to this area (e.g. tag `area: "plan.hydration"`) and
extra data `{ expected: rankedRows.length, got: plannedEvents.length, missingIds }`,
where `missingIds` is the list of `row.event_id` values not present in
`eventsById`. Do NOT include any PII beyond event ids. Keep the existing return
value identical.

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0; `pnpm --filter @cypress-ink-labs/web run lint` → exit 0.

### Step 2: Test the mismatch path

Create/extend `use-plan-for-today.test.ts(x)`. Mock the Sentry capture (as the
schema tests mock it). Two cases: (a) all ranked rows have enriched events →
capture NOT called, all events returned; (b) one ranked row's enriched event
missing → capture called once with the missing id, and the returned list omits
exactly that event (behavior preserved).

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/plan/hooks/use-plan-for-today.test.tsx` → all pass.

### Step 3: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- New/extended `use-plan-for-today` test: no-mismatch (no capture), mismatch
  (capture called with missing ids, list still omits the unhydrated event).
- Pattern for mocking Sentry: `apps/web/src/lib/schemas/event.test.ts` /
  `parse-rows`-adjacent tests.
- Verification: `pnpm run verify:web` → all pass.

## Done criteria

- [ ] On a hydration mismatch, the codebase's Sentry capture is invoked with
      `{ expected, got, missingIds }`; otherwise it is not called
- [ ] The returned `plannedEvents` value is unchanged vs. before (no behavior change)
- [ ] New test covers both branches and passes
- [ ] `pnpm run verify:web` exits 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The hook's live code diverges from the excerpt (drift since `37234b7`).
- There is no existing Sentry capture idiom to match (grep returns nothing) —
  STOP and report rather than adding a brand-new Sentry dependency/import style.
- The capture cannot be invoked from this non-React function without restructuring —
  STOP and report.

## Maintenance notes

- This is a diagnostic, not a fix: if the Sentry signal fires in production it
  means `events_enriched` is dropping ids the planner returned — investigate the
  backend RPC, not this hook.
- Reviewer: confirm only event ids (no PII) are sent to Sentry and the return
  value is untouched.
