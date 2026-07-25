# Plan 026: Derive planner "today" from the selected city's timezone

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/plan/hooks/use-plan-for-today.ts apps/web/src/features/plan/hooks/use-plan-for-today.test.tsx apps/web/src/shared/lib/intl-formatters.ts apps/web/src/features/dashboard/pages/dashboard.tsx`
> Re-read every cited file and compare the "Current state" excerpts against the
> live code before proceeding. Any mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The planner currently derives its date from UTC. For a selected city west of
UTC, the planner can request tomorrow's events while the city is still on the
previous local day; east-of-UTC cities have the inverse boundary risk. The
wrong date becomes both a React Query cache dimension and the `p_date` supplied
to `plan_events_first_nonempty_window`, so the mismatch is user-visible rather
than a display-only defect. Dashboard already establishes the intended city-timezone
convention; planner must use the same source of truth.

## Current state

`apps/web/src/features/plan/hooks/use-plan-for-today.ts:46-48` currently derives
a UTC key:

```ts
function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}
```

The hook initializes and refreshes that key without any city timezone at
`apps/web/src/features/plan/hooks/use-plan-for-today.ts:79-103`:

```ts
export function usePlanForToday(options: UsePlanForTodayOptions = {}) {
  const { userId, selectedCity, childAge, enabled = true } = options
  // ... geolocation and weather setup ...
  const [dateKey, setDateKey] = useState(() => todayDateKey())

  useEffect(() => {
    const interval = setInterval(() => {
      const nextDateKey = todayDateKey()
      setDateKey((currentDateKey) =>
        currentDateKey === nextDateKey ? currentDateKey : nextDateKey
      )
    }, 60_000)

    return () => {
      clearInterval(interval)
    }
  }, [])
```

That `dateKey` is included in `qk.saturdayPlan.byContext` at
`use-plan-for-today.ts:105-114` and sent to the RPC as `p_date` at
`use-plan-for-today.ts:136-149`:

```ts
p_date: dateKey,
```

`apps/web/src/shared/lib/intl-formatters.ts:32-38` provides the established
cached formatter path:

```ts
function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
  return getOrCreateFormatter(dayFormattersByTimeZone, "en-CA", dayFormatterOptions, timeZone)
}

export function formatDayKey(date: Date, timeZone: string): string {
  return getDayFormatter(timeZone).format(date)
}
```

Dashboard already applies that convention at
`apps/web/src/features/dashboard/pages/dashboard.tsx:78-79`:

```ts
const selectedTimeZone = selectedCity?.timezone ?? "UTC"
const todayKey = useMemo(() => formatDayKey(new Date(), selectedTimeZone), [selectedTimeZone])
```

The colocated hook suite is a jsdom Vitest suite
(`apps/web/src/features/plan/hooks/use-plan-for-today.test.tsx:1-4`) with mocked
Supabase RPC results and `renderHook`; its existing assertions cover hydration
observability (`:79-121`), not date-key timezone behavior.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0, no type or lint errors |
| Web tests | `pnpm run web:test` | all tests pass, including the new timezone cases |
| Web build | `pnpm run web:build` | exit 0 |
| Guard tests | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead code | `pnpm knip` | no new dead-code findings |
| Dependency audit | `pnpm audit` | no new vulnerabilities |

Vitest unit tests are colocated: `*.test.ts` uses the node environment and
`*.test.tsx` declares `// @vitest-environment jsdom`. React Testing Library is
available for hook tests.

## Scope

**In scope**:

- `apps/web/src/features/plan/hooks/use-plan-for-today.ts`
- `apps/web/src/features/plan/hooks/use-plan-for-today.test.tsx`

**Out of scope**:

- `apps/web/src/features/dashboard/pages/dashboard.tsx` — it already applies the
  selected-city timezone correctly.
- `apps/web/src/shared/lib/intl-formatters.ts` — reuse `formatDayKey`; do not
  change its cached-formatter implementation.
- The `plan_events_first_nonempty_window` RPC and its backend date semantics.
- Catching invalid IANA timezone values. Backend-owned city timezone values must
  follow Dashboard's existing no-`try`/`catch` convention.

## Git workflow

- Branch: `advisor/026-plan-today-city-timezone`
- Conventional Commits, e.g. `fix(web): derive planner date in selected city timezone`.
- Do NOT push or open a PR.

## Steps

### Step 1: Reconfirm the timezone boundary and test fixture

Run the drift check from the preamble, then re-read the hook, its test, the
formatter, and Dashboard excerpts above. In the existing test setup, use
`vi.setSystemTime` to create an instant that is 23:00 UTC and 18:00 in
`America/Chicago`; retain the existing mocked RPC/result approach.

**Verify**: `pnpm run web:test` → the unmodified suite passes before the change.

### Step 2: Derive the hook date key from the selected city timezone

Import `formatDayKey` from `@/shared/lib/intl-formatters`. In
`usePlanForToday`, derive exactly:

```ts
const timeZone = selectedCity?.timezone ?? "UTC"
```

Change `todayDateKey` to accept `timeZone` and return
`formatDayKey(new Date(), timeZone)`. Initialize state with
`useState(() => todayDateKey(timeZone))`. Add `timeZone` to the interval effect
dependency array and recompute `nextDateKey` inside that interval with the
current `timeZone`. Leave `addDays` unchanged: UTC arithmetic over an existing
`YYYY-MM-DD` key remains correct.

**Verify**: `pnpm run web:check` → the hook typechecks and no lint errors are introduced.

### Step 3: Pin city-local and UTC-fallback behavior

Extend `use-plan-for-today.test.tsx` using the existing mocked Supabase and
`renderHook` pattern. With a selected city whose `timezone` is
`"America/Chicago"` and fake time at 23:00 UTC, assert the local date key is
used in both the query key and the `plan_events_first_nonempty_window` RPC's
`p_date`. Add the no-selected-city case and assert its UTC fallback key. Reset
the fake system clock in cleanup so the test remains isolated.

**Verify**: `pnpm run web:test` → new local-time and UTC-fallback cases pass.

### Step 4: Run the complete web gate

Run the project web verification after the focused behavior is covered.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Extend the existing jsdom hook suite; do not create a second test convention.
- At fake time 23:00 UTC, a selected `America/Chicago` city produces its local
  calendar date in both `qk.saturdayPlan.byContext` and RPC `p_date`.
- With no selected city, the hook uses the UTC date key.
- Run `pnpm run web:test`, `pnpm run web:check`, and the final full gate.

## Done criteria

- [ ] `todayDateKey(timeZone)` delegates to `formatDayKey(new Date(), timeZone)`.
- [ ] The hook derives `timeZone` as `selectedCity?.timezone ?? "UTC"`.
- [ ] State initialization and the 60-second rollover effect use that timezone;
  the effect depends on it.
- [ ] `addDays` is unchanged.
- [ ] The hook test asserts both the query key and RPC `p_date` for the
  America/Chicago boundary and asserts the no-city UTC fallback.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- Any cited file does not match the "Current state" excerpts after the drift
  check.
- `formatDayKey` no longer produces the Dashboard's `YYYY-MM-DD` day-key
  contract, or Dashboard no longer establishes the selected-city timezone
  convention.
- The hook's date key is no longer used by both the planner query key and
  `p_date`; re-scope only after the owner resolves the changed contract.
- A proposed fix requires changing the planner RPC, Dashboard, or
  `intl-formatters.ts`.
- The verification gate fails twice after a reasonable in-scope correction.

## Maintenance notes

- City timezones are backend-owned values; intentionally do not surround
  `formatDayKey` with error handling for invalid IANA names, matching Dashboard.
- The 60-second timer remains a polling boundary detector. It may update up to
  one minute after local midnight; this plan changes the timezone source, not
  that established refresh cadence.
- When changing planner date-key semantics later, update both cache-key and RPC
  assertions together: they are one contract.
