# Plan 009: Restore enrichment parity in explore/search results (tags, ratings, favorite state)

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/explore apps/web/src/features/events/hooks/use-enriched-events.ts apps/web/src/lib/db/rpc-events.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt / correctness (UX parity)
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

Every event list in the app shows tags, average rating, and whether the current user favorited/saved the
event — except **search results on the explore page**. The `searchEvents` adapter zero-fills those fields,
so a popular, tagged, already-favorited event renders in search as untagged, unrated ("No rating"), and not
favorited. This is a visible parity break: search is the primary discovery surface yet shows strictly less
information than browsing. The fix restores enrichment for search results.

## Current state

`apps/web/src/features/explore/lib/search-api.ts` (verified at `4e739e4`) calls the `search_events` RPC,
which returns **raw** event rows, then maps them with empty enrichment fields:

```ts
// lines ~57–71
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

For comparison, the enriched path exists and is well-factored:
`apps/web/src/features/events/hooks/use-enriched-events.ts` exposes `useEnrichedEvents({ eventIds, userId })`
which calls the `events_enriched` RPC (`p_event_ids` mode bypasses city/status/limit filters) and
`adaptEnrichedRow(row)` which validates with `enrichedEventRowSchema` and populates `tags`, `avg_rating`,
`rating_count`, `is_favorited`, `is_in_calendar`, etc. The by-ids query key is sorted so caller insertion
order doesn't fragment the cache.

The explore page consumes search via the explore feature (`apps/web/src/features/explore/components/explore-sections.tsx`,
stores in `apps/web/src/features/explore/stores/`). `search-api.ts` has a test
(`apps/web/src/features/explore/lib/search-api.test.ts`) — read it before changing the adapter.

## Two viable approaches

**Approach A — backend (preferred, but needs a backend change outside this repo):** add the enrichment
fields to the `search_events` RPC (or a new `search_events_enriched`) so results come back enriched in one
round-trip, matching `events_enriched`. The web change is then to stop zero-filling and use
`adaptEnrichedRow`. **The `search_events` RPC lives in the Supabase backend repo, not here** — if you
cannot change it, use Approach B.

**Approach B — client-side enrichment (self-contained in this repo):** keep `search_events` for the
filtered/sorted/paginated ID ordering, then batch-fetch enrichment for the returned event IDs via the
existing `useEnrichedEvents({ eventIds, userId })` path and merge, preserving search order.

This plan implements **Approach B** (no backend dependency) and notes Approach A as a follow-up.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Web unit tests | `pnpm run web:test` | exit 0, all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (Approach B):
- `apps/web/src/features/explore/components/explore-sections.tsx` (and/or the explore page/hook that owns
  the search results list) — after search returns, enrich the result IDs and render enriched events.
- A new or existing hook in `apps/web/src/features/explore/` that composes `searchEvents` + `useEnrichedEvents`.
- Tests for the merge/order-preservation logic.

**Out of scope** (do NOT touch):
- The `search_events` RPC (backend repo) — Approach B does not require it.
- `use-enriched-events.ts` — reuse it as-is; do not modify the shared enriched hook.
- Pagination/cursor logic in `search-api.ts` — keep the existing cursor; only enrichment changes.
- Do NOT remove the zero-fill in `search-api.ts` until the enrichment merge is in place and the page renders
  enriched data (so search never regresses to a crash on missing fields mid-change).

## Git workflow

- Branch: `advisor/009-explore-search-enrichment`
- Commit per unit: (1) compose hook + merge logic + tests, (2) wire into the explore UI.
- Conventional-commit style, e.g. `fix(explore): enrich search results with tags/ratings/favorite state`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the current data flow and its test

Read `search-api.ts`, its test, and the explore component/store that renders results. Identify where the
`EventWithDetails[]` from `searchEvents` is consumed and how pagination appends pages.

### Step 2: Add an enrichment merge keyed by event id

After a search page returns its events (and their ids), call `useEnrichedEvents({ eventIds, userId })` for
those ids, then produce the displayed list by mapping the **search order** of ids onto the enriched events
(fall back to the raw search row if an enriched row is missing, so nothing disappears). The merge must:
- preserve the search result ordering (search controls relevance/sort),
- replace `tags`/`avg_rating`/`rating_count`/`is_favorited`/`is_in_calendar` with enriched values,
- handle the loading state (show raw results or skeletons until enrichment resolves — do not flicker to
  "no rating" then update if avoidable; acceptable to show skeletons).

Keep the merge a **pure function** (e.g. `mergeSearchWithEnriched(searchEvents, enrichedById)`) so it is
unit-testable without rendering.

**Verify**: `pnpm run web:check` → exit 0.

### Step 3: Wire it into the explore results UI

Replace the zero-filled list with the merged enriched list in the explore results component. Confirm
infinite-scroll/pagination still appends and that enrichment is requested per loaded page of ids.

### Step 4: Remove the zero-fill only once enrichment renders

Once the UI shows enriched data, simplify `search-api.ts` to stop fabricating fields it no longer needs to
(or keep the raw shape and let the merge own enrichment — whichever keeps types honest). Do not leave two
sources of truth for the same fields.

**Verify**: `grep -n "avg_rating: 0" apps/web/src/features/explore/lib/search-api.ts` → no longer the source
of displayed ratings (either removed or clearly only a pre-enrichment placeholder).

## Test plan

- New unit test for the pure merge function (in `apps/web/src/features/explore/`): cases — enriched data
  overrides zero-filled fields; search order is preserved; an id missing from enrichment falls back to the
  raw row; empty search → empty output. Model on `apps/web/src/features/explore/lib/search-api.test.ts`.
- Verification: `pnpm run web:test` → all pass including the new test.

## Done criteria

- [ ] Explore search results display real `tags`, `avg_rating`/`rating_count`, and `is_favorited`/`is_in_calendar`
- [ ] Search result ordering is preserved after enrichment
- [ ] A pure, tested merge function backs the enrichment (new test passes)
- [ ] Search never regresses to a crash/empty state during loading
- [ ] `pnpm run web:check` exits 0; `pnpm run web:test` exits 0; `pnpm run verify:web` exits 0
- [ ] Changes confined to `apps/web/src/features/explore/**` (`git status`)
- [ ] `plans/README.md` status row for 009 updated

## STOP conditions

Stop and report (do not improvise) if:
- You discover `events_enriched` (`useEnrichedEvents` by-ids) cannot accept the volume/shape of search ids
  (e.g. a hard server limit smaller than a search page) — report it; the backend Approach A may be required.
- The explore store/pagination is structured such that enrichment per page is not cleanly expressible
  without restructuring the store — STOP and report the shape rather than rewriting the store here.
- Enrichment introduces a visible double-fetch or N+1 (one enriched call per event instead of one batched
  call per page) — that defeats the purpose; report and reconsider.

## Maintenance notes

- **Follow-up (Approach A)**: when the backend can change `search_events`, return enrichment server-side and
  drop the client merge — record this as a backend ticket.
- Reviewer: confirm enrichment is **batched per page** (one `events_enriched` call), not per event.
- If `staleTime` differs between search and enriched queries, favorite toggles may briefly desync between
  surfaces — acceptable, but note it.
</content>
