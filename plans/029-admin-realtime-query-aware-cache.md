# Plan 029: Make admin realtime cache updates query-aware

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts apps/web/src/infrastructure/queries/query-keys.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 028 (same file — land 028 first)
- **Category**: bug
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Admin-event broadcasts currently write every cache below the
`["admin", "events"]` prefix through an updater that assumes an infinite-list
shape. A populated event-detail cache shares that prefix but has no `pages`
array, so a broadcast can throw a `TypeError` while handling realtime data.
That aborts the broadcast handler instead of keeping the open admin list and
edit page coherent. The existing list patch also cannot insert unseen rows,
and page totals can remain stale after a delete. Restricting the write to list
keys and invalidating lists for structural changes makes the cache behaviour
safe and self-healing without changing event-detail handling.

## Current state

`apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts:31-64`
exports the list-cache updater. It accepts an `AdminEventsInfiniteCache` and
only guards for a falsy value before accessing `data.pages`; it removes a
matching row on `DELETE`, decrements that page's `totalCount`, and otherwise
patches a matching row in place:

```ts
export function patchAdminEventsInfiniteCache(
  data: AdminEventsInfiniteCache | undefined,
  payload: AdminEventBroadcastPayload
): AdminEventsInfiniteCache | undefined {
  if (!data) return data

  const id = changedEventId(payload)
  if (!id) return data

  let changed = false
  const pages = data.pages.map((page) => {
    const existingIndex = page.rows.findIndex((event) => event.id === id)
    if (existingIndex === -1) return page

    if (payload.payload.operation === "DELETE") {
      changed = true
      return {
        ...page,
        rows: page.rows.filter((event) => event.id !== id),
        totalCount: Math.max(0, page.totalCount - 1),
      }
    }

    const record = payload.payload.record
    if (!record) return page

    changed = true
    const rows = [...page.rows]
    rows[existingIndex] = patchEvent(rows[existingIndex], record)
    return { ...page, rows }
  })

  return changed ? { ...data, pages } : data
}
```

`patchAdminEventQueries` at
`apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts:78-89`
uses the broad `qk.admin.events.all` prefix for `setQueriesData`, then patches
the exact detail cache separately:

```ts
queryClient.setQueriesData<AdminEventsInfiniteCache>({ queryKey: qk.admin.events.all }, (data) =>
  patchAdminEventsInfiniteCache(data, payload)
)
queryClient.setQueryData<EventWithDetails | null | undefined>(
  qk.admin.events.detail(id),
  (data) => patchAdminEventDetailCache(data, payload)
)
```

The broadcast handler at lines 108-111 calls that function and leaves the
existing `qk.admin.stats` invalidation in place. Subscription setup at lines
113-123 is changed first by Plan 028; land that dependency before editing this
shared file.

The key definitions confirm why the prefix is too broad.
`apps/web/src/infrastructure/queries/query-keys.ts:235-245` defines list keys as
`["admin", "events", <params object>]`, while detail, audit, and facets use a
string at index 2:

```ts
events: {
  all: ["admin", "events"] as const,
  list: (options: AdminEventsKeyOptions) =>
    ["admin", "events", normalizeAdminEventsParams(options)] as const,
  detail: (eventId: string | null | undefined) =>
    ["admin", "events", "detail", nil(eventId)] as const,
  audit: (eventId: string | null | undefined) =>
    ["admin", "events", "audit", nil(eventId)] as const,
  facets: (keyword: string) =>
    ["admin", "events", "facets", { keyword: sanitizePostgrestLike(keyword) }] as const,
},
```

`apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts:71-113`
currently tests only `patchAdminEventsInfiniteCache`: an in-place update, an
unseen insert that remains unchanged, and deletion from one loaded page. It
has no cache-client or broadcast tests for key selection, detail caches, or
invalidation.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0, no type or lint errors |
| Web tests | `pnpm run web:test` | all web tests pass |
| Web build | `pnpm run web:build` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | all guard tests pass |
| Docs guard | `pnpm run docs:test` | all docs guard tests pass |
| Dead code | `pnpm knip` | completes with no new findings from this change |
| Dependency audit | `pnpm audit` | reports no newly introduced vulnerabilities |

Vitest unit tests are colocated as `*.test.ts` in the node environment and
`*.test.tsx` with a `// @vitest-environment jsdom` docblock where a DOM is
needed. React Testing Library is available.

## Scope

**In scope**:
- `apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts`
- `apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts`

**Out of scope**:
- `apps/web/src/infrastructure/queries/query-keys.ts` — read its key shapes but
  do not change the keys.
- `apps/web/src/features/admin/hooks/operations/use-admin-dashboard-presence.ts`
  — Plan 028 owns rejected-auth and presence error handling.
- Backend broadcast payload validation or a Zod schema for it; this was
  previously rejected and must not be reintroduced here.
- Retry/backoff and any other realtime lifecycle changes.

## Git workflow

- Branch: `advisor/029-admin-realtime-query-aware-cache`
- This plan depends on Plan 028. Land `advisor/028-realtime-setauth-rejection`
  first, then start this branch from that result so both edits to the shared
  hook are retained.
- Conventional Commits, e.g. `fix(admin): scope realtime event cache updates to list queries`.
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the Plan 028 dependency and cache-key contract

Confirm the Plan 028 `setAuth()` rejection handling is already present in the
shared hook; this plan must not overwrite or duplicate it. Re-read the list,
detail, audit, and facets key shapes in `query-keys.ts`. Define one local
list-key predicate and use it unchanged for both cache writes and structural
invalidations:

```ts
(query) =>
  query.queryKey.length === 3 &&
  typeof query.queryKey[2] === "object" &&
  query.queryKey[2] !== null
```

This selects only `["admin", "events", <params object>]` list queries and
excludes detail, audit, and facets keys.

**Verify**: `pnpm run web:test` — existing tests and Plan 028's newly added
rejection-handling cases pass before this cache change.

### Step 2: Guard and scope the list-cache updater

Make the first line of `patchAdminEventsInfiniteCache` exactly:

```ts
if (!data || !Array.isArray(data.pages)) return data
```

Pass the Step 1 predicate to `queryClient.setQueriesData` along with
`queryKey: qk.admin.events.all`, so the updater runs only on list-shaped cache
entries. Keep `patchAdminEventDetailCache` and its exact-key `setQueryData`
call unchanged.

**Verify**: `pnpm run web:test` — a populated detail cache can coexist with a
broadcast without throwing, and its patch remains confined to the exact detail
key.

### Step 3: Invalidate list queries after structural broadcasts

After patching an `INSERT` or `DELETE`, call:

```ts
void queryClient.invalidateQueries({
  queryKey: qk.admin.events.all,
  predicate: <the same list-key predicate>,
})
```

Do this after the patch so new rows appear on refetch and page totals
self-heal. Do not invalidate on `UPDATE`. Keep the existing
`qk.admin.stats` invalidation unchanged.

**Verify**: `pnpm run web:test` — INSERT and DELETE each invalidate only the
list-key family, while an UPDATE does not add a list invalidation.

### Step 4: Extend the realtime cache tests

Extend `use-admin-events-realtime.test.ts` with a query-client/broadcast test
setup that exercises the exported patcher and hook-level cache writes as needed.
Cover all of these observable contracts:

1. A populated `detail` cache plus a broadcast does not throw; the detail is
   patched only through its exact key and infinite list caches are never treated
   as the detail shape.
2. INSERT invalidates the matching list queries so an unseen row appears after
   refetch.
3. DELETE removes a row from a non-first loaded page and invalidates the list
   queries.
4. UPDATE patches the matching row in place without a list invalidation.

Keep the existing direct updater tests where they still express the list data
contract; add only the test environment required by the hook-level assertions.

**Verify**: `pnpm run web:test` — all existing and new realtime cache cases
pass.

### Step 5: Run the web quality gate and exercise the admin interaction

Run the standard web gate. Then manually keep the admin events list and an
open event-edit page visible while a second admin edits an event; there must be
no console error and the matching caches must update or invalidate according to
the operation.

**Verify**: `pnpm run web:check` — exit 0 with no type or lint errors.

## Test plan

- Extend `use-admin-events-realtime.test.ts` rather than creating a duplicate
  suite.
- Seed a detail cache and one or more `qk.admin.events.list(...)` infinite
  caches. Assert a broadcast cannot call `.pages.map` on the detail value and
  that the exact detail key retains its dedicated patch path.
- Assert INSERT invalidates matching list keys, DELETE removes an item on a
  later page and invalidates matching list keys, and UPDATE changes the loaded
  row without list invalidation.
- Run `pnpm run web:test` and `pnpm run web:check` after the focused changes.

## Done criteria

- [ ] Plan 028 has landed first and its `setAuth()` rejection handling remains
  intact in `use-admin-events-realtime.ts`.
- [ ] `patchAdminEventsInfiniteCache` returns early unless `data.pages` is an
  array.
- [ ] `setQueriesData` and INSERT/DELETE invalidation use the same predicate
  selecting only three-element event-list keys with a non-null object at index 2.
- [ ] INSERT and DELETE invalidate matching list queries; UPDATE patches only
  the matching loaded row and does not list-invalidate.
- [ ] Detail-cache handling and `qk.admin.stats` invalidation remain unchanged.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- Plan 028 is not landed before this plan begins, or its rejection-handling
  changes would be overwritten by this work.
- The live code does not match the "Current state" excerpts after the drift
  check.
- `qk.admin.events.list` no longer uses a three-element key with a non-null
  object at index 2; stop rather than guessing a replacement predicate.
- A change requires modifying `query-keys.ts`, the presence hook, or the backend
  payload contract.
- The cache API cannot apply the same predicate to both `setQueriesData` and
  `invalidateQueries`.
- `pnpm run web:test` or `pnpm run web:check` fails twice after a reasonable
  fix attempt.

## Maintenance notes

- UPDATE deliberately patches matching loaded rows in place without a list
  invalidation. An update can change filter membership, so a row can remain
  stale until the list refetches on filter change or remount; this is an
  accepted tradeoff for this MED-risk plan, not a reason to broaden the update.
- INSERT and DELETE invalidate only real list keys to make membership and page
  totals converge on the server result without disturbing event-detail, audit,
  or facets caches.
- Keep the predicate structurally aligned with `qk.admin.events.list`. If that
  key contract changes, update the predicate and its tests in the same change.
