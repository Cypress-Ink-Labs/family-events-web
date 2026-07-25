# Plan 041: Surface why each plan recommendation fits (D1, web-only build)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/plan/hooks/use-plan-for-today.ts apps/web/src/features/plan/components/plan-hero-card.tsx apps/web/src/features/plan/components/plan-thumb-card.tsx apps/web/src/features/plan/pages/saturday-plan.tsx apps/web/src/lib/schemas/plan.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The planner already ranks every recommendation using distance, weather, age fit,
and saved-event affinity, but the UI exposes only an opaque percentage match.
Showing concise, human-readable reasons makes the ranked shortlist explainable
without exposing raw model scores or changing the ranking itself.

## Current state

`apps/web/src/features/plan/hooks/use-plan-for-today.ts:19-25` defines
`PlannedEvent` with `plan_score`, `distance_score`, `weather_score`, `age_score`,
`history_affinity`, and `distance_km`. The hydration at
`use-plan-for-today.ts:182-198` carries every score into each rendered
`PlannedEvent`:

```ts
acc.push({
  ...event,
  plan_score: row.score,
  distance_score: row.distance_score,
  weather_score: row.weather_score,
  age_score: row.age_score,
  history_affinity: row.history_affinity,
  distance_km: row.distance_km ?? null,
})
```

`apps/web/src/features/plan/hooks/use-plan-for-today.ts:17` composes the RPC
result parser as `z.array(planEventsWindowRowSchema)`. The underlying
`apps/web/src/lib/schemas/plan.ts:6-23` coerces the five score fields with
`z.coerce.number()` but does **not** declare numeric bounds; the installed
`@cypress-ink-labs/contracts` package is not present in this workspace. The
repository fixtures in `apps/web/src/lib/schemas/plan.test.ts:8-12` use
normalized values, but that is not a contract. Therefore the score range is
not resolved from live schemas: Step 1 is a required confirmation gate. Use the
pre-decided threshold of `0.6` if the authoritative contract confirms scores
are 0–1, or `60` if it confirms scores are 0–100.

`apps/web/src/features/plan/components/plan-hero-card.tsx:73-77` currently
shows price, optional distance, and `formatMatch(event.plan_score)` only:

```tsx
<div className="flex flex-wrap gap-2">
  <Badge variant="secondary">{formatEventPrice(event.price, event.is_free)}</Badge>
  {distanceLabel ? <Badge variant="outline">{distanceLabel}</Badge> : null}
  <Badge variant="outline">{formatMatch(event.plan_score)}</Badge>
</div>
```

`apps/web/src/features/plan/components/plan-thumb-card.tsx:55-60` similarly
renders a price badge plus the percentage match. The page copy at
`apps/web/src/features/plan/pages/saturday-plan.tsx:140-143` promises a
shortlist "tuned by distance, weather, age fit, and saved events," but no card
explains which of those factors applies to the event.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead-code check | `pnpm knip` | exit 0 |
| Dependency audit | `pnpm audit` | no vulnerabilities |

Vitest tests are colocated: `*.test.ts` uses the node environment, while a
DOM-dependent `*.test.tsx` begins with `// @vitest-environment jsdom`. RTL is
available when a component test is needed.

## Scope

**In scope**:

- `apps/web/src/features/plan/lib/plan-reasons.ts` (create)
- `apps/web/src/features/plan/lib/plan-reasons.test.ts` (create)
- `apps/web/src/features/plan/components/plan-hero-card.tsx`
- `apps/web/src/features/plan/components/plan-thumb-card.tsx`

**Out of scope**:

- The planner RPC and its score computation.
- `apps/web/src/features/plan/hooks/use-plan-for-today.ts` and its query or
  hydration behavior.
- Changing `formatMatch`, exposing raw score values, or changing score ranking.

## Git workflow

- Branch: `advisor/041-plan-reason-chips`
- Conventional Commits, e.g. `feat(plan): explain recommendation fit`.
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the score scale before encoding the second-chip threshold

Open `planEventsWindowResultSchema` at
`apps/web/src/features/plan/hooks/use-plan-for-today.ts:17`, its underlying
`planEventsWindowRowSchema` at `apps/web/src/lib/schemas/plan.ts:6-23`, and any
available range documentation in `@cypress-ink-labs/contracts`. The current
workspace evidence has no bounded schema and no installed contracts package, so
do not infer a range from fixture values. Confirm the backend/RPC contract:
use `0.6` when all four inputs are normalized 0–1, or `60` when they are 0–100.
Record the confirmed scale and selected threshold in the implementation PR.

**Verify**: `pnpm run web:check` → exit 0 before implementation; the confirmed
contract supplies exactly one of the two pre-decided thresholds.

### Step 2: Add the pure reason-chip selector and its focused tests

Create `apps/web/src/features/plan/lib/plan-reasons.ts` with:

```ts
export function planReasonChips(
  event: Pick<
    PlannedEvent,
    "distance_score" | "weather_score" | "age_score" | "history_affinity"
  >
): string[]
```

Build exactly these candidates: `distance_score` → `"Close by"`,
`weather_score` → `"Good for today's weather"`, `age_score` →
`"Great age fit"`, and `history_affinity` → `"Matches your saved events"`.
Drop only `null` and `undefined` scores, sort remaining candidates descending
by score, return the top label whenever one exists, and return the second label
only when its score is at least the confirmed Step-1 threshold. Return no more
than two labels and never return score values.

Create `plan-reasons.test.ts` in the node environment. Cover descending order,
null exclusion (including `history_affinity: null` for a user with no saved
events), boundaries of `0.59` excluded and `0.6` included when Step 1 confirms
the normalized scale, a maximum of two labels, and an empty array when every
score is null. If Step 1 confirms the 0–100 scale, translate only the boundary
fixtures to `59`/`60`; preserve every other behavior.

**Verify**: `pnpm run web:test` → all tests pass, including
`plan-reasons.test.ts`.

### Step 3: Render explanation badges beside the existing card badges

Import `planReasonChips` into `plan-hero-card.tsx` and `plan-thumb-card.tsx`.
Render each returned label as `<Badge variant="outline">` adjacent to the
existing price/distance/match affordances. Preserve the existing price,
distance, `formatMatch`, image, and navigation behavior. The labels explain the
recommendation; they must not show raw numbers or replace the match badge.

**Verify**: `pnpm run web:check` → exit 0 with no unused imports or type errors.

### Step 4: Run the web regression gate

Run the web test suite and check after the pure helper and both card call sites
are in place.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- `plan-reasons.test.ts` pins candidate ordering, null handling, the selected
  threshold boundary, the two-label cap, and empty input.
- Existing planner/card behavior remains unchanged except for additional
  outline badges; no RPC, query-key, or scoring tests change.
- Run `pnpm run web:test` and `pnpm run web:check` before the full gate.

## Done criteria

- [ ] The confirmed score scale and the matching pre-decided threshold (`0.6` or
  `60`) are recorded.
- [ ] `planReasonChips` implements exactly the four specified labels and returns
  at most two labels without raw numbers.
- [ ] Hero and thumb cards render returned labels as `Badge variant="outline"`
  next to their existing badges.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.
- [ ] Only the in-scope files and the plan status row are modified.

## STOP conditions

- The live code does not match the "Current state" excerpts after the drift
  check.
- The authoritative RPC/contract score scale is neither normalized 0–1 nor
  0–100; stop rather than inventing a third threshold.
- A proposed change requires altering the RPC, score calculation,
  `formatMatch`, or the planner query contract.
- `pnpm run verify:web` fails after a reasonable correction to an in-scope
  change.

## Maintenance notes

- The helper intentionally explains ranking factors without changing the
  ranking. Keep labels tied to the existing score fields; add a new reason only
  with a corresponding, documented planner score.
- `history_affinity` may be null for users without saved events, so absence is
  expected and must stay silent.
- The first score is always shown when present; the second is deliberately
  thresholded to avoid weak or noisy explanations.
