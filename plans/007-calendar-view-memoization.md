# Plan 007: Memoize calendar-view per-day filtering and derived values

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/calendar/pages/calendar-view.tsx apps/web/src/features/calendar/components/calendar-view-sections.tsx`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

`CalendarViewPage` fetches up to 500 events and renders a month grid. For each day cell it calls
`getEventsForDay(day)`, which does `monthEvents.filter(...)` allocating a `new Date(event.start_datetime)`
per event per day — roughly O(days × events) `Date` allocations on every render (≈ 42 cells × 500 events
≈ 21k `Date` objects per render). `getEventsForDay` is also a fresh function reference each render (defeats
any `React.memo` on the panel children), and `eventsForSelectedDate`/`upcomingCount` are recomputed every
render even when inputs are unchanged — while sibling values in the same component (`savedEventIds`,
`baseFavoritedIds`) are already correctly `useMemo`'d. Precomputing a day→events map and memoizing the
derived values removes the per-render work with no behavior change.

## Current state

`apps/web/src/features/calendar/pages/calendar-view.tsx` (verified at `4e739e4`). The file already uses
`useMemo` for `savedEventIds` (76–81), `savedIdsArray` (83), and `baseFavoritedIds` (89–97) — match that
style. The un-memoized hot spots:

```ts
// lines 103–109 — recomputed every render
const eventsForSelectedDate = monthEvents
  .filter((event) => isSameDay(new Date(event.start_datetime), selectedDate))
  .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())

const upcomingCount = savedEvents.filter(
  (event) => new Date(event.start_datetime) >= new Date()
).length

// lines 111–113 — new function ref each render; O(events) scan per day cell
function getEventsForDay(day: Date) {
  return monthEvents.filter((event) => isSameDay(new Date(event.start_datetime), day))
}
```

`getEventsForDay` is passed as a prop to both panels (lines 149 and 160):

```tsx
<CalendarWeekPanel ... getEventsForDay={getEventsForDay} ... />
<CalendarMonthPanel ... days={days} getEventsForDay={getEventsForDay} ... />
```

Relevant imports already present: `useMemo`, `useReducer`, `useState` from `react`; `isSameDay`,
`startOfDay`, etc. from `date-fns` (lines 1–14). `date-fns` also exports `format` (used elsewhere in the
codebase) — usable to build a stable day key.

`monthEvents` is `EventWithDetails[]` (from `useEnrichedEvents`, default `[]`). `event.start_datetime` is
an ISO string.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Web unit tests | `pnpm run web:test` | exit 0, all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (modify only):
- `apps/web/src/features/calendar/pages/calendar-view.tsx`

**Out of scope** (do NOT touch):
- `calendar-view-sections.tsx` — the panels consume `getEventsForDay` as a function prop; keep that
  contract identical (still pass a `(day: Date) => EventWithDetails[]` function). Do NOT change the panel
  prop signatures.
- `use-enriched-events.ts` — data fetching is unchanged.
- Behavior must not change: same events per day, same sort, same counts.

## Git workflow

- Branch: `advisor/007-calendar-view-memoization`
- Conventional-commit style, e.g. `perf(calendar): memoize per-day event lookup and derived values`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Build a memoized day→events map

After `monthEvents` is available, add a `useMemo` that groups events by a stable day key, allocating each
event's `Date` exactly once:

```ts
const eventsByDay = useMemo(() => {
  const map = new Map<string, EventWithDetails[]>()
  for (const event of monthEvents) {
    const key = format(new Date(event.start_datetime), "yyyy-MM-dd")
    const bucket = map.get(key)
    if (bucket) bucket.push(event)
    else map.set(key, [event])
  }
  return map
}, [monthEvents])
```

Add `format` to the existing `date-fns` import. (`EventWithDetails` is already imported transitively via
the hook; if not in scope, import the type from `@/shared/types`.)

### Step 2: Replace `getEventsForDay` with a memoized lookup

Make the callback stable and O(1) per day, reading from the map:

```ts
const getEventsForDay = useCallback(
  (day: Date) => eventsByDay.get(format(day, "yyyy-MM-dd")) ?? [],
  [eventsByDay]
)
```

Add `useCallback` to the `react` import. The empty-array fallback must be returned for days with no events
(do not return `undefined`). Note: returning a shared `[]` literal is fine; if a panel mutates the array
(it should not), return a fresh `[]` instead — check `calendar-view-sections.tsx` usage first.

### Step 3: Memoize `eventsForSelectedDate` and `upcomingCount`

```ts
const eventsForSelectedDate = useMemo(
  () =>
    (eventsByDay.get(format(selectedDate, "yyyy-MM-dd")) ?? [])
      .slice()
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()),
  [eventsByDay, selectedDate]
)

const upcomingCount = useMemo(
  () => savedEvents.filter((event) => new Date(event.start_datetime) >= new Date()).length,
  [savedEvents]
)
```

`eventsForSelectedDate` must reuse the same day-grouping as the grid (consistency) and `.slice()` before
sorting so the cached bucket isn't mutated. Confirm the result equals the previous `isSameDay`-based
filter (same events, same order).

**Verify**: `grep -n "useCallback\|eventsByDay\|useMemo" apps/web/src/features/calendar/pages/calendar-view.tsx`
→ shows the new map, callback, and two memoized values.

### Step 4: Typecheck and test

**Verify**: `pnpm run web:check` → exit 0. `pnpm run web:test` → exit 0.

## Test plan

The grouping logic is now a small pure transform worth a unit test, but `calendar-view.tsx` currently has
no test and the component needs a DOM to render. Two options:
- **Preferred (low effort)**: extract the grouping into a tiny pure helper `groupEventsByDay(events)` in the
  same file (exported) and add `apps/web/src/features/calendar/pages/calendar-view.test.ts` modeled on
  `apps/web/src/features/my-events/pages/my-events.test.tsx` (which tests an exported pure function from a
  page module). Cases: empty input → empty map; two events same day → one bucket of 2; events on different
  days → separate buckets; ordering within `eventsForSelectedDate` is ascending by `start_datetime`.
- If you do not extract a helper, rely on `pnpm run web:test` staying green + manual verification that the
  calendar renders the same events per day as before.

If you add the test file, it runs under the Node env (no DOM needed) since it tests a pure function.

**Verify (if test added)**: `pnpm run web:test` → all pass including the new `calendar-view.test.ts`.

## Done criteria

- [ ] `getEventsForDay` is a `useCallback` reading from a memoized `Map`
- [ ] `eventsForSelectedDate` and `upcomingCount` are `useMemo`'d
- [ ] Panel prop contract unchanged (still receives a `(day: Date) => EventWithDetails[]` function)
- [ ] No behavior change: same events per day, same ascending sort, same counts
- [ ] `pnpm run web:check` exits 0; `pnpm run web:test` exits 0
- [ ] Only `calendar-view.tsx` (and optionally a new `calendar-view.test.ts`) modified (`git status`)
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

Stop and report (do not improvise) if:
- `calendar-view-sections.tsx` mutates the array returned by `getEventsForDay` (then you must return fresh
  arrays, not the shared bucket — report and adjust).
- The live file no longer matches the excerpts (drift).
- Memoization changes which events appear on a day (timezone edge: `isSameDay` vs `format(..., "yyyy-MM-dd")`
  could differ if events carry timezone offsets — verify the rendered days match the old behavior; if they
  differ, STOP and report rather than shipping a behavior change).

## Maintenance notes

- The `format(date, "yyyy-MM-dd")` key uses local time, matching `isSameDay`'s local-time comparison. If the
  app later moves to explicit timezone handling (`shared/lib/intl-formatters.ts`), revisit the key.
- Reviewer: confirm the day grouping is consistent between the grid and the selected-date panel.
</content>
