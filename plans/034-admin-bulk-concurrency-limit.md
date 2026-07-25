# Plan 034: Bound the admin bulk-operation fan-out

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/lib/async/map-with-concurrency.ts apps/web/src/lib/async/map-with-concurrency.test.ts apps/web/src/features/admin/pages/admin-access.tsx apps/web/src/features/admin/pages/admin-sources.tsx`
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

The two admin bulk controls fire one request per selected item without a bound.
A large account deletion or a broad Scrape All can open an unbounded number of
browser requests and trigger the mutation hook's invalidations once per success.
That can overload the API, produce redundant cache work, and make bulk progress
unpredictable. A small worker pool keeps the current per-item API semantics and
aggregate toast behavior while bounding request pressure to four in flight and
refreshing each affected cache family once after the batch settles.

## Current state

A repository-wide source scan found no existing `mapWithConcurrency` helper or
general concurrency utility. This plan introduces the narrowly scoped,
independently tested helper at `apps/web/src/lib/async/map-with-concurrency.ts`.

At `apps/web/src/features/admin/pages/admin-access.tsx:112-132`, bulk deletion
preserves a confirmation guard and derives aggregate success/failure toasts, but
uses unbounded mutation-hook fan-out:

```tsx
async function deleteSelectedAccounts() {
  const ids = selectedLoadedIds
  if (ids.length === 0) return
  if (
    !window.confirm(
      `Delete ${ids.length} account${ids.length === 1 ? "" : "s"}? This cannot be undone.`
    )
  ) {
    return
  }
  const results = await Promise.allSettled(ids.map((id) => deleteUser.mutateAsync(id)))
  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = ids.length - succeeded
  if (succeeded > 0) {
    toast.success(`${succeeded} account${succeeded > 1 ? "s" : ""} deleted`)
  }
  if (failed > 0) {
    toast.error(`${failed} delete${failed > 1 ? "s" : ""} failed`)
  }
  clearSelectedIds()
}
```

The per-item hook calls the direct API `deleteAdminUser` and invalidates exactly
one query family at `apps/web/src/features/admin/hooks/use-admin-access.ts:37-45`:

```tsx
export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })
    },
  })
}
```

`deleteAdminUser` is the API-layer function to call directly on the bulk path,
not the per-item hook, per `apps/web/src/features/admin/api/access.ts:38-43`:

```ts
export async function deleteAdminUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: userId,
  })
  if (error) throw error
}
```

At `apps/web/src/features/admin/pages/admin-sources.tsx:75-87`, the shared
single-source handler calls `triggerScrape.mutateAsync`, displays a per-result
toast, and maintains the per-source scraping state:

```tsx
async function handleScrape(sourceId: string) {
  addScrapingId(sourceId)
  try {
    await triggerScrape.mutateAsync({ sourceId })
    toast.success("Scrape started!", { description: "Ingestion run queued." })
    return true
  } catch (error) {
    toastError(error, "Failed to trigger scrape.")
    return false
  } finally {
    removeScrapingId(sourceId)
  }
}
```

`apps/web/src/features/admin/pages/admin-sources.tsx:123-139` then calls that
single-item handler for every active source at once:

```tsx
const [isScrapeAllPending, setIsScrapeAllPending] = useState(false)

async function handleScrapeAll() {
  const activeSources = sources.filter((source) => source.is_active)
  if (activeSources.length === 0) return

  setIsScrapeAllPending(true)
  const results = await Promise.all(activeSources.map((source) => handleScrape(source.id)))
  setIsScrapeAllPending(false)

  const failed = results.filter((queued) => !queued).length
  if (failed > 0) {
    toast.warning(`Scrape All: ${activeSources.length - failed} queued, ${failed} failed.`)
  } else {
    toast.success(`All ${activeSources.length} sources queued for scraping.`)
  }
}
```

The source hooks wrap the direct API `triggerSourceScrape` and list the exact
four cache families to refresh after a scrape at
`apps/web/src/features/admin/hooks/sources/use-admin-sources.ts:49-59`:

```tsx
export function useTriggerSourceScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceId }: { sourceId: string }) => triggerSourceScrape(sourceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.sources })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceQueueSummary })
      void queryClient.invalidateQueries({ queryKey: qk.admin.sourceRuns })
      void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
    },
```

Therefore the direct-call bulk paths must invalidate only once after all items
settle: account deletion invalidates `qk.admin.userAccess`; source scraping
invalidates `qk.admin.sources`, `qk.admin.sourceQueueSummary`,
`qk.admin.sourceRuns`, and `qk.admin.stats`. Single-item mutation hooks and
flows remain unchanged.

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

- `apps/web/src/lib/async/map-with-concurrency.ts` (create)
- `apps/web/src/lib/async/map-with-concurrency.test.ts` (create)
- `apps/web/src/features/admin/pages/admin-access.tsx`
- `apps/web/src/features/admin/pages/admin-sources.tsx`
- Focused tests for the two changed bulk handlers, colocated with the existing
  page or feature test conventions.

**Out of scope**:

- The single-item mutation hooks `useDeleteAdminUser` and
  `useTriggerSourceScrape`; their behavior remains unchanged.
- Backend changes. A true bulk RPC is the longer-term backend solution, not
  part of this client-side concurrency bound.
- Any change to individual account deletion, individual scrape, or the existing
  `window.confirm` guard.

## Git workflow

- Branch: `advisor/034-admin-bulk-concurrency-limit`
- Conventional Commits, e.g. `perf(admin): bound bulk operation concurrency`.
- Do NOT push or open a PR.

## Steps

### Step 1: Add the bounded worker-pool helper and unit tests

Create `apps/web/src/lib/async/map-with-concurrency.ts` with this exact public
signature:

```ts
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]>
```

Implement a simple worker pool that preserves input result order, converts each
operation into a fulfilled or rejected `PromiseSettledResult`, settles every
item, and never starts more than `limit` callbacks concurrently. Do not add a
second abstraction or alter call sites outside this plan.

Create colocated node-environment tests proving that result order follows the
input order, mixed success/failure settles all inputs, and a deferred-promise
fixture sees at most four in-flight tasks.

**Verify**: `pnpm run web:test` exits 0, including the new utility tests.

### Step 2: Bound bulk account deletion and invalidate once

In `admin-access.tsx`, import `useQueryClient`, `qk`, `deleteAdminUser`, and
`mapWithConcurrency`. Keep `useDeleteAdminUser` for the existing one-account
dialog flow only. In `deleteSelectedAccounts`, keep the current empty selection
and `window.confirm` behavior plus its aggregate toast strings byte-for-byte;
replace the `Promise.allSettled(...deleteUser.mutateAsync...)` call with:

```ts
await mapWithConcurrency(ids, 4, deleteAdminUser)
```

After the worker pool settles, call
`queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })` exactly once.
Use the settled results for the existing success/failure counts, then clear the
selection as today.

Add a handler-level test with ten deferred deletions proving no more than four
are concurrent and that `qk.admin.userAccess` is invalidated once after all
operations settle.

**Verify**: `pnpm run web:test` exits 0 with the bulk account test passing.

### Step 3: Bound Scrape All and invalidate each source family once

In `admin-sources.tsx`, import the direct `triggerSourceScrape` API, the query
client/key dependencies, and `mapWithConcurrency`. Keep `handleScrape` and
`useTriggerSourceScrape` untouched for individual source actions. For the bulk
path only, run active source IDs through the worker pool with a limit of four,
maintaining the existing `isScrapeAllPending` lifecycle and aggregate success /
failure toast strings. Use direct API results to calculate the same queued and
failed totals; do not emit the current per-source success/failure toasts in the
bulk path.

Once all calls settle, invalidate each of these exactly once:

```ts
qk.admin.sources
qk.admin.sourceQueueSummary
qk.admin.sourceRuns
qk.admin.stats
```

Add a handler-level ten-source test that proves the four-request cap and one
invalidation per listed source cache family after settlement.

**Verify**: `pnpm run web:test` exits 0 with the bulk scrape test passing.

### Step 4: Typecheck and run the full web gate

**Verify**: `pnpm run web:check` and `pnpm run verify:web` both exit 0.

## Test plan

- `map-with-concurrency.test.ts`: input-order preservation, mixed settlement,
  and a maximum of four active callbacks under deferred promises.
- Bulk-access handler test: ten deletes never exceed four concurrent direct API
  calls; after settlement, `qk.admin.userAccess` is invalidated exactly once.
- Bulk-sources handler test: ten active sources never exceed four concurrent
  `triggerSourceScrape` calls; after settlement, each source cache family is
  invalidated exactly once.
- Existing single-item mutation flows remain covered by their current hook/page
  tests and are intentionally not redirected through the worker pool.

## Done criteria

- [ ] `mapWithConcurrency` has the specified generic signature and preserves
  order while capping concurrent callbacks at four for both bulk call sites.
- [ ] Bulk account deletion calls `deleteAdminUser` directly, preserves the
  confirmation and aggregate toast behavior, and invalidates
  `qk.admin.userAccess` once after settlement.
- [ ] Scrape All calls `triggerSourceScrape` directly, preserves aggregate toast
  behavior, and invalidates `qk.admin.sources`, `qk.admin.sourceQueueSummary`,
  `qk.admin.sourceRuns`, and `qk.admin.stats` once each after settlement.
- [ ] Single-item mutation hook flows are unchanged.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The cited code does not match the Current state excerpts after the drift
  check.
- A direct API call requires a different authorization, input, or error policy
  than its existing mutation hook.
- Preserving the current bulk confirmation or aggregate toast behavior would
  require changing an out-of-scope single-item flow.
- The live source hook invalidates a cache family other than the four recorded
  above; record the drift rather than guessing the bulk invalidation contract.
- A limit of four cannot be applied without violating the source or account API
  contract.

## Maintenance notes

- The worker pool is deliberately a client-side containment measure. A true bulk
  RPC is the preferred long-term solution because it would make the operation
  transactional and reduce request overhead further.
- Keep the direct API calls isolated to bulk paths. Per-item mutation hooks own
  per-item state, error behavior, and invalidation contracts for single actions.
- When source scrape invalidations change, update the single-item hook and this
  bulk path together so their post-operation cache families remain aligned.
