# Plan 032: Paginate the admin comments and ratings collections

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/admin/api/comments.ts apps/web/src/features/admin/api/ratings.ts apps/web/src/features/admin/hooks/use-admin-comments.ts apps/web/src/features/admin/hooks/use-admin-ratings.ts apps/web/src/features/admin/pages/admin-comments.tsx apps/web/src/features/admin/pages/admin-ratings.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; a mismatch
> is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Admin comments and ratings currently load their entire joined collections before
rendering. As moderation history grows, this increases query payload, render
work, and time-to-interaction even though an administrator usually moderates a
small visible slice. Server-side, page-number pagination keeps each response to
50 rows, preserves newest-first ordering, and lets the UI expose a small,
accessible previous/next control without a new component abstraction.

## Current state

`apps/web/src/features/admin/api/comments.ts:5-15` selects the entire comments
collection with profile and event joins. It orders newest first but passes no
`count`, `range`, or limit:

```ts
const ADMIN_COMMENT_COLUMNS =
  "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name), events(title)"

export async function listAdminComments(): Promise<AdminComment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(ADMIN_COMMENT_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminComment[]
}
```

`apps/web/src/features/admin/api/ratings.ts:4-14` has the same unbounded shape:

```ts
const ADMIN_RATING_COLUMNS =
  "id, user_id, event_id, score, created_at, user_profiles(display_name), events(title)"

export async function listAdminRatings(): Promise<AdminRating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select(ADMIN_RATING_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminRating[]
}
```

The list hooks are `apps/web/src/features/admin/hooks/use-admin-comments.ts:12-17`
(`useAdminComments`) and
`apps/web/src/features/admin/hooks/use-admin-ratings.ts:5-10`
(`useAdminRatings`). Each currently has one static admin key and calls the
unparameterized API:

```ts
export function useAdminComments() {
  return useQuery({
    queryKey: qk.admin.comments,
    queryFn: listAdminComments,
  })
}

export function useAdminRatings() {
  return useQuery({
    queryKey: qk.admin.ratings,
    queryFn: listAdminRatings,
  })
}
```

The comment page currently partitions the fully loaded array in the browser at
`apps/web/src/features/admin/pages/admin-comments.tsx:113-145`:

```tsx
const { flagged, approved, pending } = useMemo(() => {
  return {
    flagged: comments.filter((comment) => comment.is_flagged),
    approved: comments.filter((comment) => comment.is_approved && !comment.is_flagged),
    pending: comments.filter((comment) => !comment.is_approved && !comment.is_flagged),
  }
}, [comments])

// …
{[
  { value: "all", list: comments },
  { value: "flagged", list: flagged },
  { value: "pending", list: pending },
  { value: "approved", list: approved },
].map(({ value, list }) => (
```

The live four-tab partition is authoritative. The initial three-filter spec
omitted the live `approved` tab; this plan corrects the filter union and keeps
the current semantics one-to-one:

- `"all"`: no filter.
- `"flagged"`: `.eq("is_flagged", true)`.
- `"pending"`: `.eq("is_approved", false).eq("is_flagged", false)`.
- `"approved"`: `.eq("is_approved", true).eq("is_flagged", false)`.

Once the API applies that filter, remove this client-side partitioning rather
than fetching all rows and filtering in memory.

`apps/web/src/features/admin/pages/admin-ratings.tsx:12-36` likewise renders
its entire query result and calculates its displayed average from that result:

```tsx
export function AdminRatingsPage() {
  const { data: ratings = [] } = useAdminRatings()
  // …
  const avg =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : "0"

  return (
    <div className="space-y-6">
      <Toolbar title="Ratings" subtitle={`${ratings.length} ratings · ${avg} avg`} />
      <div className="space-y-3">
        {ratings.map((r) => (
```

Existing shared UI is sufficient: both admin pages already import the existing
`@/shared/components/ui/button` primitive, so use it for minimal previous/next
controls. Do not create a pagination component. Admin query keys are currently
`qk.admin.comments` and `qk.admin.ratings`
(`apps/web/src/infrastructure/queries/query-keys.ts:225,246`); parameterized
queries must retain those prefixes so existing mutation invalidations continue
to refresh all loaded page/filter variants.

`apps/web/src/features/admin/api/access.ts:7-13` also selects an unbounded
joined list:

```ts
export async function listAdminUserAccess(): Promise<AdminUserAccessRecord[]> {
  const { data, error } = await supabase
    .from("user_access")
    .select(ADMIN_USER_ACCESS_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminUserAccessRecord[]
}
```

It is explicitly out of scope: its selection and bulk-delete semantics require
a separate pagination design.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Guard tests | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead code | `pnpm knip` | exits without new unused-symbol findings |
| Dependency audit | `pnpm audit` | exits with the current audit result |

Vitest tests are colocated: `*.test.ts` files run in the node environment, and
DOM tests use `*.test.tsx` with a `// @vitest-environment jsdom` docblock. RTL
is available through `@testing-library/react`.

## Scope

**In scope**:

- `apps/web/src/features/admin/api/comments.ts`
- `apps/web/src/features/admin/api/ratings.ts`
- `apps/web/src/features/admin/hooks/use-admin-comments.ts`
- `apps/web/src/features/admin/hooks/use-admin-ratings.ts`
- `apps/web/src/features/admin/pages/admin-comments.tsx`
- `apps/web/src/features/admin/pages/admin-ratings.tsx`
- Focused API, hook, and page tests for the changed pagination behavior.

**Out of scope**:

- `apps/web/src/features/admin/api/access.ts` and the access page. Their
  selection and bulk-delete semantics need a separate future pagination plan.
- Backend SQL, RPCs, or a new pagination component.
- Mutation invalidation changes; the existing admin-key-prefix invalidations
  must keep working for all page/filter queries.

## Git workflow

- Branch: `advisor/032-admin-comments-ratings-pagination`
- Conventional Commits, e.g. `perf(admin): paginate moderation collections`.
- Do NOT push or open a PR.

## Steps

### Step 1: Define the parameterized API contracts

In `comments.ts`, export `AdminCommentFilter` as the live tab union:

```ts
export type AdminCommentFilter = "all" | "pending" | "flagged" | "approved"
```

Change the comments API signature to:

```ts
listAdminComments(
  page: number,
  filter: AdminCommentFilter
): Promise<{ rows: AdminComment[]; totalCount: number }>
```

Change the ratings API signature to:

```ts
listAdminRatings(page: number): Promise<{ rows: AdminRating[]; totalCount: number }>
```

For both APIs, retain
`.order("created_at", { ascending: false })`, select with `{ count: "exact" }`,
and apply `.range(page * 50, page * 50 + 49)`. Return `(data ?? [])` as `rows`
and the exact count (using `0` when Supabase returns null).

For comments, apply the selected live-tab filter before the shared order/range
chain: `all` adds none; `flagged`, `pending`, and `approved` use the exact
mappings documented in Current state. Do not collapse flagged and pending or
allow a flagged comment to appear in approved/pending results.

**Verify**: add API-level mocked-Supabase tests that assert `{ count: "exact" }`,
page 0 and page 1 range arguments (`0, 49` and `50, 99`), newest-first order,
count handling, and each four-way comment filter mapping; `pnpm run web:test`
exits 0.

### Step 2: Make comments and ratings hooks page-aware

Update `useAdminComments(page, filter)` and `useAdminRatings(page)` to call the
new API contracts. Each must use one React Query entry per current page/filter
and `placeholderData: keepPreviousData` from `@tanstack/react-query` v5. Derive
the parameterized keys from the existing `qk.admin.comments` and
`qk.admin.ratings` prefixes so their current `invalidateQueries` calls remain
prefix invalidations for every cached page variant.

Update `use-admin-comments.test.tsx` and `use-admin-ratings.test.tsx` mocks and
assertions for the changed query functions while retaining the existing mutation
invalidation-contract coverage.

**Verify**: `pnpm run web:test` exits 0 with both hook suites passing; changing
page or filter produces a separate query invocation and prior rows stay visible
while the next page loads.

### Step 3: Replace client-side comment filtering with server pagination

In `admin-comments.tsx`, hold the current page and tab filter in component
state. Reset the page to 0 whenever the selected tab/filter changes. Replace
the current `useMemo` partition and array-of-lists rendering with the selected
server result's `rows` and `totalCount`; retain all four existing tab meanings
from Current state. Do not issue all-filter background queries merely to restore
client-side tab counts.

Add a minimal footer using the existing `Button` primitive: disabled Previous /
Next controls and `Page X of Y`, where the page count is derived from
`totalCount` and the fixed 50-row page size. Keep mutation hooks and their
existing invalidation keys unchanged.

Add a page-level DOM test that switches from a nonzero page to another comment
filter and confirms it fetches page 0 using that filter. Include a page-2
response fixture to prove the rendered list follows the server's newest-first
row order.

**Verify**: `pnpm run web:test` exits 0; manually, seed-visible comments on page
2 differ from page 1 and switching a tab returns to page 1.

### Step 4: Add ratings pagination UI

In `admin-ratings.tsx`, hold the current page, call the page-aware ratings hook,
and render the returned `rows`. Add the same minimal existing-Button previous /
next footer with `Page X of Y` derived from `totalCount` and the fixed page size.
Do not create a shared pagination component. Keep the current deletion mutation
and its invalidation set unchanged.

Add a focused page/hook test that selects page 2 and verifies the page request
and server row order.

**Verify**: `pnpm run web:test` exits 0 with ratings pagination coverage
passing.

### Step 5: Run the full web gate

**Verify**: `pnpm run web:check` and `pnpm run verify:web` both exit 0.

## Test plan

- API tests mock the Supabase builder and assert exact count selection,
  newest-first order, 50-row page ranges, count fallback, and the full
  `all | flagged | pending | approved` comment-filter mapping.
- Hook tests verify one query per current page/filter and
  `keepPreviousData` behavior without weakening the existing mutation
  invalidation-contract assertions.
- Page tests verify page-2 server rows retain order and a filter switch resets
  comment pagination to page 1.
- `pnpm run web:test`, `pnpm run web:check`, and `pnpm run verify:web` provide
  the regression gates.

## Done criteria

- [ ] `listAdminComments(page, filter)` returns `{ rows, totalCount }`, uses
  `{ count: "exact" }`, `.range(page * 50, page * 50 + 49)`, and newest-first
  order for every live filter.
- [ ] `listAdminRatings(page)` returns `{ rows, totalCount }` with the same
  exact-count, range, and order contract.
- [ ] Comment filters preserve the four live tab semantics: all, flagged,
  pending (unapproved and unflagged), and approved (approved and unflagged).
- [ ] Client-side comment array partitioning is deleted after server filtering
  exists.
- [ ] Comments and ratings use page-aware queries with
  `placeholderData: keepPreviousData` and prefix-compatible `qk` keys.
- [ ] Both pages render existing-Button previous/next controls and `Page X of
  Y`; comment filter changes reset to page 1.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The cited code does not match the Current state excerpts after the drift
  check.
- Supabase's live query builder cannot combine the documented filter with
  `{ count: "exact" }`, ordering, and the 50-row range.
- The four live comment-tab semantics change, particularly the disjoint
  approved/pending exclusion of flagged rows.
- Preserving mutation invalidations requires changing their documented admin-key
  prefixes or the out-of-scope access flow.
- Pagination requires a new shared component or backend SQL/RPC change rather
  than the existing API/page surfaces.

## Maintenance notes

- **Resolved spec drift**: the original three-filter union omitted the live
  `approved` tab. This plan intentionally uses all four current, disjoint tab
  semantics; do not revert it to `all | pending | flagged` without an explicit
  product decision to remove the Approved tab.
- `apps/web/src/features/admin/api/access.ts` remains deliberately unpaginated.
  Its selection/bulk-delete semantics are a separate future design and must be
  recorded as such in the round-3 `plans/README.md` index.
- Keep the page size fixed at 50 across comments and ratings. If it changes,
  update the range, footer math, and tests together.
- The existing mutation invalidations use the admin key prefixes; retain that
  relationship so every cached pagination variant refreshes after moderation or
  deletion.
