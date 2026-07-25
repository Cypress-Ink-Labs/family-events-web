# Plan 043: Add a preferred-city quick switch to the city selector (D5, web-only first phase)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/profile/api/preferred-cities.ts apps/web/src/features/profile/hooks/use-preferred-cities.ts apps/web/src/features/profile/pages/profile.tsx apps/web/src/app/layouts/app-layout.tsx apps/web/src/app/stores/app-store.ts apps/web/src/shared/components/ui/select.tsx`
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

A user can save a preferred set of cities, but the app-wide selector presents
every city in one undifferentiated list. Quick switching therefore hides a
personalized preference feature already supported by the backend. Ordering and
grouping preferred cities makes the existing selector useful without multiplying
Explore or planner queries across cities.

## Current state

`apps/web/src/features/profile/api/preferred-cities.ts:11-49` exposes the full
preferred-city set: `listPreferredCities(userId)` returns every RLS-scoped row,
and `savePreferredCities(cityIds, primaryCityId)` uses the
`set_preferred_cities` RPC to keep one primary city and mirror
`user_profiles.city_preference_id` atomically.

`apps/web/src/features/profile/hooks/use-preferred-cities.ts:24-63` is the
existing data source for the selector. It resolves rows against active cities,
returns `preferredCities`, and exposes `primaryCityId`. Its result sorts primary
first, then city name:

```ts
const preferredCities = useMemo<PreferredCity[]>(() => {
  return rows
    .map((row) => ({
      cityId: row.city_id,
      isPrimary: row.is_primary,
      city: cityById.get(row.city_id) ?? null,
    }))
    .toSorted((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return (a.city?.name ?? "").localeCompare(b.city?.name ?? "")
    })
}, [rows, cityById])
```

`apps/web/src/app/layouts/app-layout.tsx:60-100` is the only city-switch UI.
It reads `{ selectedCity, setSelectedCity, cities }` from `useApp()` and maps
all cities directly into a single `SelectContent`. The shared Select primitive
already exports `SelectGroup`, `SelectLabel`, and `SelectSeparator` at
`apps/web/src/shared/components/ui/select.tsx:13-15`, `84-92`, and `121-132`.
The new pure, exported `orderCitiesForSelect` helper belongs in
**`apps/web/src/app/layouts/app-layout.tsx`**, immediately above `AppLayout`, so
it stays colocated with the only caller and can be imported by its test.

`apps/web/src/app/stores/app-store.ts:8-52` persists only `selectedCityId` and
resolves it against active `cities`; `useApp()` exposes the resolved
`selectedCity` and `setSelectedCity`. In contrast, the profile page effect at
`apps/web/src/features/profile/pages/profile.tsx:77-83` re-applies the persisted
primary whenever the `cities` array identity changes:

```ts
useEffect(() => {
  if (!persistedPrimaryId) return
  const primaryCity = cities.find((city) => city.id === persistedPrimaryId)
  if (primaryCity) setSelectedCity(primaryCity)
}, [persistedPrimaryId, cities, setSelectedCity])
```

That behavior can overwrite a selector quick switch after an otherwise harmless
cities refetch.

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

- `apps/web/src/app/layouts/app-layout.tsx` (export
  `orderCitiesForSelect`; selector grouping and data hookup)
- `apps/web/src/app/layouts/app-layout.test.tsx` (create)
- `apps/web/src/features/profile/pages/profile.tsx` (primary-mirror ref guard
  only)
- `apps/web/src/features/profile/pages/profile.test.tsx` (extend)
- Existing `usePreferredCities` consumers only as needed to pass the resolved
  preferred ids and primary id into the layout selector

**Out of scope**:

- Preferred-city RPCs, data shape, or server-side ordering.
- Multi-city Explore/planner querying, cross-city aggregation, or ranking.
- Backend changes and a new city-selection persistence model.

## Git workflow

- Branch: `advisor/043-city-selector-preferred-quick-switch`
- Conventional Commits, e.g. `feat(app): prioritize preferred city switches`.
- Do NOT push or open a PR.

## Steps

### Step 1: Add and test the colocated city ordering helper

Export this pure helper from `apps/web/src/app/layouts/app-layout.tsx`, above
`AppLayout`:

```ts
export function orderCitiesForSelect(
  cities: City[],
  preferredIds: readonly string[],
  primaryId: string | null
): City[]
```

It returns active preferred cities first: the primary city first when it occurs
in the preferred set, followed by the remaining preferred ids in their supplied
order, followed by all non-preferred cities in their existing `cities` order.
Do not sort the fallback portion or duplicate a city. The layout will supply
`preferredIds` from `preferredCities.map((entry) => entry.cityId)`, which is the
existing hook's primary-first resolved preference order.

Create `app-layout.test.tsx` with the jsdom docblock and test the exported
helper for primary-first ordering, retained supplied preference order,
non-preferred append order, and empty-preference passthrough.

**Verify**: `pnpm run web:test` → city-ordering tests pass.

### Step 2: Group preferred cities in the existing city selector

Call `usePreferredCities(user?.id)` in `AppLayout`, derive preferred ids and the
primary id, and pass the full active `cities` list through
`orderCitiesForSelect`. Extend the existing Select imports and content with the
already-exported `SelectGroup`, `SelectLabel`, and `SelectSeparator` primitives:
render a `Preferred` group/label for active preferred cities, then a separator
and the remaining cities. When there are no active preferred cities, preserve a
single ungrouped list. Keep `value`, `onValueChange`, and `setSelectedCity`
semantics exactly as they are now.

Add a layout-level assertion that the Preferred group is present only when the
hook resolves active preferences and that selecting either group still invokes
the existing app-store city setter.

**Verify**: `pnpm run web:test` → selector grouping and existing layout-related
tests pass.

### Step 3: Prevent profile's primary-mirror effect from snapping back a quick switch

In `profile.tsx`, add a `useRef` for the last primary id that the effect applied.
The effect may call `setSelectedCity` only when `persistedPrimaryId` changes; it
must update the ref only after resolving and applying the active primary city.
Keep the existing behavior for an initial non-null primary and a genuine primary
change. Do not make changes to preferred-city persistence or to the app store.

Extend `profile.test.tsx` with a real page/effect-level case that mocks the
profile city dependencies: a `cities` refetch with the same primary must not
call `setSelectedCity` again, while changing `persistedPrimaryId` must apply the
new primary once.

**Verify**: `pnpm run web:test` → both profile mirror cases pass.

### Step 4: Run the web regression gate

Run the web suite and check after the helper, grouped selector, and ref guard
are complete. Manually select a non-primary preferred city from the top bar,
then cause a cities-query refetch; the selected city must remain the quick
switch until the persisted primary itself changes.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- `app-layout.test.tsx` tests primary-first order, remaining preference order,
  append order for non-preferred cities, empty preferences, and selector group
  rendering/selection.
- `profile.test.tsx` tests both the unchanged-primary refetch and changed-primary
  transitions against the actual effect boundary.
- Manual smoke: choose a preferred city in the grouped selector, refetch cities,
  and confirm the selection does not snap back.

## Done criteria

- [ ] `orderCitiesForSelect` is exported from
  `apps/web/src/app/layouts/app-layout.tsx` and preserves the specified ordering
  rules without duplicates.
- [ ] The selector obtains data from `usePreferredCities(user?.id)` and renders
  active preferred cities in a labeled `Preferred` group using existing Select
  primitives.
- [ ] The profile primary-mirror effect re-applies only when
  `persistedPrimaryId` changes; an unchanged primary survives a cities refetch.
- [ ] No multi-city querying, backend work, or cross-city ranking is introduced.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The live code does not match the "Current state" excerpts after the drift
  check.
- `usePreferredCities` no longer exposes a resolved preferred-city list and
  primary id suitable for the layout, or its calling contract changes.
- The shared Select primitive lacks group, label, or separator support.
- Implementing the quick switch requires multi-city query fan-out, a backend
  change, or a second persisted selection model.
- `pnpm run verify:web` fails after a reasonable correction to an in-scope
  change.

## Maintenance notes

- This is deliberately a web-only first phase: the selector changes one active
  city at a time. Combined cross-city Explore/planner queries and ranking remain
a later, separately approved phase.
- The layout consumes the existing hook's resolved primary-first preferred order;
keep preference ordering in that hook/API contract rather than introducing a
second source of truth in the app store.
- The primary mirror represents a persisted default, not a command to override
an intentional session-level quick switch whenever active cities refetch.
