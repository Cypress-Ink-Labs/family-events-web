# Plan 031: Enrich only the newly loaded Explore page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/explore/hooks/use-search-events-enriched.ts apps/web/src/features/events/hooks/use-enriched-events.ts apps/web/src/features/explore/lib/merge-search-enriched.test.ts apps/web/src/features/explore/hooks/use-search-events-enriched.test.ts`
> Re-read every existing in-scope file and compare the "Current state" excerpts
> against live code. A mismatch is a STOP condition; do not improvise a changed
> query or cache contract.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Explore paginates the ordered search result but currently builds one enrichment
query from every loaded page. Each "load more" changes that by-IDs query key,
so React Query refetches enrichment for pages already fetched. With $k$ pages of
$p$ events, the transfer grows from the needed $p \cdot k$ rows to
$p \cdot k(k+1)/2$. Per-page enrichment preserves the existing merged UI while
letting cached earlier pages stay cached.

## Current state

`apps/web/src/features/explore/hooks/use-search-events-enriched.ts:1-99` uses
an infinite search query, flattens all loaded pages, then passes all event IDs
to one `useEnrichedEvents` call:

```ts
import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"

const allSearchEvents = useMemo(
  () => infiniteData?.pages.flatMap((page) => page.events) ?? [],
  [infiniteData]
)
const allEventIds = useMemo(() => allSearchEvents.map((e) => e.id), [allSearchEvents])

const { data: enrichedData, isFetching: isEnrichmentFetching } = useEnrichedEvents({
  eventIds: allEventIds,
  userId,
  enabled: allEventIds.length > 0,
})

const enrichedById = useMemo(() => indexEnrichedById(enrichedData ?? []), [enrichedData])
const events = useMemo(
  () => mergeSearchWithEnriched(allSearchEvents, enrichedById),
  [allSearchEvents, enrichedById]
)
```

The current comments at `use-search-events-enriched.ts:29-36` describe this as
one batched call for all loaded IDs. Update those comments as part of the
implementation: the target is one **batched query per loaded page**, not one
query per event and not one query for every loaded page combined.

`apps/web/src/features/events/hooks/use-enriched-events.ts:138-177` already
exports the stable key builder and uses a module-private fetch path:

```ts
export function buildEnrichedQueryKey(options: UseEnrichedEventsOptions) {
  return qk.enrichedEvents.key({
    ...options,
    limit: options.eventIds ? undefined : (options.limit ?? DEFAULT_LIMIT),
    dateFrom: effectiveDateFrom(options),
  })
}

async function fetchEnrichedEvents(options: UseEnrichedEventsOptions): Promise<EventWithDetails[]> {
  if (options.eventIds && options.eventIds.length === 0) {
    return []
  }
  const rpcArgs = buildEnrichedRpcArgs(options)
  const data = await fetchEventsPage({
    cityId: rpcArgs.p_city_id,
    status: rpcArgs.p_status,
    userId: rpcArgs.p_user_id,
    eventIds: rpcArgs.p_event_ids,
    dateFrom: rpcArgs.p_date_from,
    dateTo: rpcArgs.p_date_to,
    limit: rpcArgs.p_limit ?? 24,
  })
  return (data as unknown[]).map((row) => adaptEnrichedRow(row))
}

export function useEnrichedEvents(options: UseEnrichedEventsOptions = {}) {
  return useQuery({
    queryKey: buildEnrichedQueryKey(options),
    queryFn: () => fetchEnrichedEvents(options),
    enabled,
  })
}
```

`buildEnrichedQueryKey` retains the `events-enriched` by-IDs prefix and sorts
ID sets through `qk.enrichedEvents.key`; page queries must retain that shape so
existing prefix invalidations continue to work. `fetchEnrichedEvents` already
short-circuits an empty `eventIds` array and must keep doing so after export.

**Test discovery decision**: `apps/web/src/features/explore/lib/merge-search-enriched.test.ts`
exists (`merge-search-enriched.test.ts:68-169`) and already verifies merge
semantics, search ordering, and `indexEnrichedById`. **Extend that existing
suite** with a page-order concatenation/index regression if needed to make the
multi-page merge explicit; do not create a second merge suite.
`apps/web/src/features/explore/hooks/use-search-events-enriched.test.ts` does
not exist. **Create it** as a jsdom hook test (with the Vitest jsdom docblock)
to test `useQueries`, network inputs, and invalidation behavior end to end.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead code | `pnpm knip` | no newly introduced dead exports |
| Dependency audit | `pnpm audit` | no newly introduced vulnerabilities |

Vitest unit tests are colocated `*.test.ts` in the node environment and
`*.test.tsx` with a `// @vitest-environment jsdom` docblock. RTL is available;
use its hook utilities and a `QueryClientProvider` for the new hook suite.

## Scope

**In scope**:
- `apps/web/src/features/explore/hooks/use-search-events-enriched.ts`
- `apps/web/src/features/events/hooks/use-enriched-events.ts` (export
  `fetchEnrichedEvents`; no behavioral rewrite of that fetch path)
- `apps/web/src/features/explore/lib/merge-search-enriched.test.ts` (extend the
  existing test suite)
- `apps/web/src/features/explore/hooks/use-search-events-enriched.test.ts`
  (create)

**Out of scope**:
- The search RPC and `apps/web/src/features/explore/lib/search-api.ts`.
- Event-card or Explore presentation components.
- A new generic enrichment API, query-key redesign, or changed favorite
  invalidation policy.

## Git workflow

- Branch: `advisor/031-explore-per-page-enrichment`
- Conventional Commits, e.g. `perf(web): enrich Explore results per page`.
- Do **not** push or open a PR.

## Steps

### Step 1: Add a hook-level regression harness for two search pages

Create `use-search-events-enriched.test.ts` with the jsdom docblock and the
repo's QueryClient/RTL hook-test pattern. Mock the paginated search result as
two pages with distinct IDs and mock/spy on the enrichment fetch path
(`fetchEventsPage` or the Supabase RPC it reaches). Render the hook, load page
1, then invoke `fetchNextPage()` to load page 2.

Assert that loading page 2 makes an enrichment request containing **only**
page-2 IDs; it must not re-request page-1 IDs. Also assert the returned events
remain in search order and have the expected enrichment fields applied. Add a
favorite-toggle/prefix-invalidation scenario proving that invalidation refetches
the affected per-page query rather than collapsing the cache into an all-pages
request.

**Verify**: `pnpm run web:test` → the new test fails while the old all-pages
implementation is present and passes after the per-page implementation.

### Step 2: Export the canonical enrichment fetch path

In `use-enriched-events.ts`, change the module-private function to the exact
public export:

```ts
export async function fetchEnrichedEvents(
  options: UseEnrichedEventsOptions
): Promise<EventWithDetails[]> {
  // retain the existing empty-eventIds short-circuit and fetch/adapt behavior
}
```

Keep `buildEnrichedQueryKey` unchanged and keep `useEnrichedEvents` using that
same canonical function. Do not duplicate RPC argument construction or event
row adaptation in the Explore hook.

**Verify**: `pnpm run web:check` → `useEnrichedEvents` and the new named import
compile with no changed query-key types.

### Step 3: Replace all-loaded enrichment with `useQueries` per page

In `use-search-events-enriched.ts`, import `useQueries` from
`@tanstack/react-query`, plus `buildEnrichedQueryKey` and the newly exported
`fetchEnrichedEvents`. Replace the one `useEnrichedEvents` call with one query
configuration per loaded `infiniteData.pages` entry:

```ts
const enrichmentQueries = useQueries({
  queries: (infiniteData?.pages ?? []).map((page) => {
    const pageIds = page.events.map((event) => event.id)
    return {
      queryKey: buildEnrichedQueryKey({ eventIds: pageIds, userId }),
      queryFn: () => fetchEnrichedEvents({ eventIds: pageIds, userId }),
    }
  }),
})
```

Keep the empty-ID short-circuit in `fetchEnrichedEvents`; do not add a second
empty-ID implementation. Concatenate the query data in the same page order as
`infiniteData.pages`, then pass that combined array to the existing
`indexEnrichedById`. Leave the existing `mergeSearchWithEnriched` call and
ordered flattened search rows unchanged. Set:

```ts
const isEnriching = enrichmentQueries.some((query) => query.isFetching)
```

Return that value as `isEnriching`. Retain the `events-enriched` by-IDs key
prefix through `buildEnrichedQueryKey`, so existing prefix invalidations keep
invalidating the matching page queries. Update the stale comments to describe
one batched enrichment query per loaded page.

**Verify**: `pnpm run web:test` → the two-page request, ordered merge, and
favorite-invalidation regressions pass.

### Step 4: Extend pure merge coverage and run the web gate

Extend the existing `merge-search-enriched.test.ts` with the concrete
multi-page concatenation/index assertion decided above: page-1 enriched rows
followed by page-2 enriched rows index correctly, while
`mergeSearchWithEnriched` still emits the independently supplied search order.
Do not duplicate the existing general ordering or fallback tests.

Manually inspect Explore after implementation: load three pages with the
Network panel open and confirm each enrichment request payload contains only
that newly loaded page's IDs.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Create the jsdom hook suite at
  `apps/web/src/features/explore/hooks/use-search-events-enriched.test.ts`.
  Mock two search pages and assert page 2 enriches only page-2 IDs.
- Assert merged output preserves search ordering while using enriched fields.
- Assert the existing favorite-toggle/prefix invalidation contract refetches
  affected per-page queries and preserves the `events-enriched` prefix.
- Extend the existing `merge-search-enriched.test.ts` only for explicit
  page-order concatenation/index coverage; retain its current pure merge tests.
- Manual smoke: Explore → load three pages with Network open; no enrichment
  payload includes IDs from already cached pages.

## Done criteria

- [ ] `fetchEnrichedEvents` is exported from `use-enriched-events.ts`, retains
  the empty-ID short-circuit, and remains the query function used by
  `useEnrichedEvents`.
- [ ] `use-search-events-enriched.ts` uses `useQueries` with one by-IDs query
  per loaded search page, each built by `buildEnrichedQueryKey`.
- [ ] Enrichment results concatenate in page order before `indexEnrichedById`;
  `mergeSearchWithEnriched` remains the merge path and preserves search order.
- [ ] `isEnriching` equals `enrichmentQueries.some((query) => query.isFetching)`.
- [ ] Existing `events-enriched` prefix invalidations remain compatible with
  every per-page query key.
- [ ] The merge test is extended and the new jsdom hook test exists and passes.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- Either cited source file, the existing merge test, or the discovered test
  presence differs from the Current state after the drift check.
- `buildEnrichedQueryKey` no longer produces the established by-IDs prefix or
  `fetchEnrichedEvents` no longer owns the empty-ID short-circuit.
- A per-page query cannot reuse the existing fetch/adaptation path without
  changing the search RPC, `search-api.ts`, or card components.
- Prefix invalidation fails to refetch an affected page query, or page 2 still
  requests page-1 IDs after the change.
- `pnpm run verify:web` fails after a reasonable fix attempt.

## Maintenance notes

- This is intentionally one batched request per page, not an N+1 request per
  event. Preserve `buildEnrichedQueryKey` for every page to share cache and
  invalidation behavior with the rest of the app.
- Adding a page changes only the query set for that page; prior pages remain
  cached. A refetch caused by an explicit enrichment-prefix invalidation is
  expected and correct.
- Reviewer focus: do not reimplement RPC arguments, row adaptation, or empty-ID
  handling in Explore; all three stay owned by `fetchEnrichedEvents`.
