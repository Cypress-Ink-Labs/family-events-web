# Plan 042: Complete the plan→Explore filter handoff (D2, web-only build)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/plan/pages/saturday-plan.tsx apps/web/src/features/explore/pages/explore.tsx apps/web/src/features/explore/stores/explore-store.ts apps/web/src/features/explore/components/explore/explore-active-filters.tsx apps/web/src/features/admin/hooks/use-city-filter.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The planner's "See more options" link already serializes a recommended date and
15 km radius, but Explore does not consume either parameter. A user therefore
lands on an unfiltered browse page after asking for more options, breaking the
plan-to-discovery journey. This plan makes that handoff durable across reloads
without inventing a weather-fit filter that the search contract cannot honor.

## Current state

`apps/web/src/features/plan/pages/saturday-plan.tsx:18-29` builds the handoff
URL. It always writes `dist=15`, writes `date` when available, and currently
adds an unsupported decorative `fit` parameter for non-`any` weather:

```ts
function planExploreHref(date: string | null, weatherFit: string): string {
  const params = new URLSearchParams()
  if (date) {
    params.set("date", date)
  }
  params.set("dist", "15")
  if (weatherFit !== "any") {
    params.set("fit", weatherFit)
  }
  const query = params.toString()
  return query ? `/explore?${query}` : "/explore"
}
```

The link is rendered at `saturday-plan.tsx:211-217`. The Explore page at
`apps/web/src/features/explore/pages/explore.tsx:32-56` reads all filter state
from `useExploreStore`/`useExploreViewStore`; a repository search confirms that
there is **no** `useSearchParams` consumer anywhere under
`apps/web/src/features/explore/`. Its date range at `explore.tsx:68-106` derives
only from `activeDateFilter` using local `setHours(0, 0, 0, 0)` boundaries.

`apps/web/src/features/explore/stores/explore-store.ts:10-21` contains the
filter defaults, including `activeDateFilter`, `nearMeEnabled`, `radiusKm: 10`,
and `location`. `setActiveDateFilter` at lines 52-54 currently changes only the
bucket. The store has no `customDate`. The radius UI at
`apps/web/src/features/explore/components/radius-filter.tsx:10` exposes the
allowed range as the discrete options `[5, 10, 25, 50]`, so URL `dist` values
must be clamped to **5–50 km** before entering store state.

The existing removable-filter bar is
`apps/web/src/features/explore/components/explore/explore-active-filters.tsx`.
It receives its state and callbacks from `ExplorePage` at
`explore.tsx:205-213` and currently renders only free, category, and tag chips.
The URL-state convention to copy is
`apps/web/src/features/admin/hooks/use-city-filter.ts:7-30`: it uses
`useSearchParams`, creates a fresh `URLSearchParams` from the current value, and
calls the setter with `{ replace: true }`.

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

- `apps/web/src/features/explore/stores/explore-store.ts`
- `apps/web/src/features/explore/stores/explore-store.test.ts`
- `apps/web/src/features/explore/pages/explore.tsx`
- `apps/web/src/features/explore/pages/explore.test.tsx` (create)
- `apps/web/src/features/explore/components/explore/explore-active-filters.tsx`
- `apps/web/src/features/plan/pages/saturday-plan.tsx` (`planExploreHref` only)
- `apps/web/src/features/plan/pages/saturday-plan.test.tsx` (create)

**Out of scope**:

- The backend search RPC, `SearchEventsParams`, and planner query hook.
- Adding weather-fit support to the search contract or retaining decorative
  `fit` URL parameters.
- Persisting arbitrary Explore filter state beyond the date/radius handoff.

## Git workflow

- Branch: `advisor/042-plan-explore-filter-handoff`
- Conventional Commits, e.g. `feat(explore): preserve plan filter handoff`.
- Do NOT push or open a PR.

## Steps

### Step 1: Extend the Explore store with explicit custom-date semantics

Add `customDate: string | null` and `setCustomDate` to
`explore-store.ts` and its initial state. Update `setActiveDateFilter` so
choosing any date-bucket value clears `customDate`; `setCustomDate` must retain
the exact validated `YYYY-MM-DD` key until cleared. Ensure `resetFilters`
returns both fields to their initial values.

Extend `explore-store.test.ts` to prove `setCustomDate` stores a custom date,
selecting each date-bucket filter clears it, and reset clears it. Keep the
existing `past|today|weekend|week|month` bucket behavior intact.

**Verify**: `pnpm run web:test` → all store tests pass.

### Step 2: Make a custom date take precedence in Explore's search range

In `explore.tsx`, select `customDate` from `useExploreStore`. When it is set,
make `dateRange` compute local bounds `[dayStart, dayStart + 1 day)` from that
key using the existing `setHours(0, 0, 0, 0)` style, before considering
`activeDateFilter`. Otherwise preserve every existing bucket's range exactly.

Add a page-level test in `explore.test.tsx` that uses a custom date and asserts
the resulting search parameters use that local day start and next-day end,
including the precedence case where a stale bucket exists. The test must not
change the search RPC contract.

**Verify**: `pnpm run web:test` → custom-date range and existing Explore tests
pass.

### Step 3: Hydrate and synchronize only the supported URL state

Use `useSearchParams` in `ExplorePage` following the replacement pattern in
`use-city-filter.ts`. On mount, read the parameters once: accept `date` only
when it matches `/^\d{4}-\d{2}-\d{2}$/` and produces a valid `Date`, then call
`setCustomDate`; parse `dist` as an integer and clamp it to the live 5–50 km
range before calling `setRadiusKm`. Ignore malformed, impossible, empty, and
non-integer values without throwing.

Synchronize `customDate` and `radiusKm` back to the URL when UI actions change
them. Update a fresh `URLSearchParams` and call the setter with
`{ replace: true }`; remove the `date` parameter when the custom date is
cleared, and retain unrelated query parameters. Do not create a browser-history
entry for state synchronization.

Extend `explore.test.tsx` to cover valid URL hydration, invalid `date`/`dist`
being ignored, a store/UI change round-tripping to the URL, and `replace: true`
rather than push behavior.

**Verify**: `pnpm run web:test` → URL hydration, validation, and replace-sync
cases pass.

### Step 4: Surface the custom date as a removable active filter

Extend `ExploreActiveFilters` and its caller in `ExplorePage` with the custom
date value and a clear callback. Render a removable chip alongside the existing
free/category/tag chips when the value is present. Removing it must call
`setCustomDate(null)` and therefore remove `date` through the Step-3 sync; it
must not change the user's radius or unrelated filters.

**Verify**: `pnpm run web:check` → exit 0 with the expanded prop contract fully
typed.

### Step 5: Keep the planner URL limited to executable filters

Change `planExploreHref` so it emits only `date` and `dist=15`; remove the
`fit` branch and any now-unused input/call-site dependency without changing the
link destination. Test the rendered "See more options" link rather than adding
a new public helper: it must contain `date` and `dist` and never `fit`.

**Verify**: `pnpm run web:test` → the planner-link contract test passes.

### Step 6: Exercise the complete web gate and handoff

Run the full gate, then manually use the browser to navigate from Plan through
"See more options." Confirm Explore is filtered to the selected plan day and
15 km, and a reload preserves the custom date/radius URL state.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Store tests cover custom-date storage, date-bucket clearing, and reset.
- Explore page tests cover local custom-day bounds, URL hydration, invalid input
  rejection, replace-based round trips, and removable-chip clearing.
- The plan page test asserts the generated Explore link has `date`/`dist` and
  omits `fit`.
- Manual smoke: Plan → "See more options" → Explore shows the plan day and
  15 km; reloading preserves that state.

## Done criteria

- [ ] `customDate` and `setCustomDate` exist in the Explore store, and every
  date-bucket selection clears custom date state.
- [ ] A valid custom date produces local `[dayStart, dayStart + 1 day)` search
  bounds and takes precedence over a bucket.
- [ ] URL hydration strictly validates `date`, clamps integer `dist` to 5–50 km,
  and ignores invalid values without throwing.
- [ ] URL updates use `{ replace: true }`, preserve unrelated parameters, and
  the custom-date chip clears the URL date.
- [ ] `planExploreHref` emits `date` and `dist` only; it never emits `fit`.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The live code does not match the "Current state" excerpts after the drift
  check.
- The search RPC already accepts a weather-fit filter, or an existing Explore
  URL-state consumer appears; stop and reconcile the design rather than adding
  a competing path.
- The radius contract is not the current 5–50 km range represented by
  `[5, 10, 25, 50]`.
- Implementing URL synchronization requires changing the backend search RPC or
  planner hook.
- `pnpm run verify:web` fails after a reasonable correction to an in-scope
  change.

## Maintenance notes

- This is a web-only handoff: custom date and radius are URL state, not a new
  persistent preference model.
- Keep URL state restricted to filters the search contract actually executes.
  Weather fit remains intentionally absent until a backend contract supports it.
- The selected radius may be an integer within 5–50 km from a URL; the current
  quick-select UI exposes its standard values `[5, 10, 25, 50]`.
