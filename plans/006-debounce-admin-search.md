# Plan 006: Debounce the admin event search so each keystroke doesn't refetch

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/admin/pages/admin-events.tsx apps/web/src/features/admin/hooks/events/use-admin-events.ts apps/web/src/features/admin/stores/admin-store.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

In the admin events page, the search keyword flows straight into two React Query keys with no debounce.
Every keystroke changes the query key, which (a) invalidates and refetches **page 1** of the paginated
admin events list (`pageSize` 200) and (b) refetches the facet-counts query. Typing a 10-character search
fires ~10 list-page RPCs + ~10 facet RPCs and repeatedly resets the infinite query's loaded pages. A
single debounced value eliminates the storm while keeping the UI responsive.

## Current state

Verified at `4e739e4`.

`apps/web/src/features/admin/pages/admin-events.tsx`:
- `keyword` comes from a Zustand store: `const keyword = useAdminStore((state) => state.keyword)` (line 51),
  `const setKeyword = useAdminStore((state) => state.setKeyword)` (line 54).
- The search input change handler sets it directly with no delay (lines 144–147):
  ```ts
  function handleKeywordChange(nextKeyword: string) {
    setKeyword(nextKeyword)
    clearSelectedIds()
  }
  ```
- `keyword` is passed to both data hooks:
  ```ts
  useAdminEventsInfinite({ keyword, status: statusFilter, cityFilter, sourceFilter, llmReviewFilter, pageSize })  // ~line 90
  const { data: facets = [] } = useAdminEventFacets(keyword)  // line 105
  ```

`apps/web/src/features/admin/hooks/events/use-admin-events.ts`:
- `useAdminEventsInfinite` builds its query key from `keyword` (sanitized) — lines 76, 92–99.
- `useAdminEventFacets(keyword)` keys on `qk.admin.events.facets(keyword)` and refetches on every change
  (lines 141–146).

`apps/web/src/features/admin/stores/admin-store.ts`:
- `keyword: string` (line 8), `setKeyword: (k) => set({ keyword: k })` (line 39). The raw text input value
  lives in the store. Other filters (status, city, source) are discrete dropdowns — they change rarely and
  do NOT need debouncing; only the free-text `keyword` does.

Repo convention: this is React 19. `useDeferredValue` is available and is the lowest-risk way to decouple
the rapidly-changing input value from the expensive query keys without adding a dependency or timers.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Web unit tests | `pnpm run web:test` | exit 0, all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (modify only):
- `apps/web/src/features/admin/pages/admin-events.tsx`

**Out of scope** (do NOT touch):
- `use-admin-events.ts` — the hooks correctly key on their input; the fix is to pass a debounced value in.
- `admin-store.ts` — keep storing the immediate input value so the text field stays responsive.
- The discrete filter dropdowns (status/city/source/llmReview) — they don't need debouncing.
- Do NOT add a third-party debounce dependency (e.g. lodash) — use React 19 `useDeferredValue`.

## Git workflow

- Branch: `advisor/006-debounce-admin-search`
- Conventional-commit style, e.g. `perf(admin): debounce event search query keys`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Derive a deferred keyword in `admin-events.tsx`

Keep the input bound to the immediate store `keyword` (so typing stays instant), but feed a deferred copy
into the data hooks. Add, near the existing `keyword` read:

```ts
import { useDeferredValue } from "react"
// ...
const keyword = useAdminStore((state) => state.keyword)
const deferredKeyword = useDeferredValue(keyword)
```

### Step 2: Pass `deferredKeyword` to the query hooks (only)

Change the two hook call sites to use `deferredKeyword` instead of `keyword`:

```ts
useAdminEventsInfinite({ keyword: deferredKeyword, status: statusFilter, cityFilter, sourceFilter, llmReviewFilter, pageSize })
const { data: facets = [] } = useAdminEventFacets(deferredKeyword)
```

Leave the search input's `value`/`onChange` wiring bound to the immediate `keyword`/`handleKeywordChange`
so the field does not lag.

**Verify**: `grep -n "deferredKeyword" apps/web/src/features/admin/pages/admin-events.tsx` → shows the
declaration plus the two hook call sites (3 matches); the search input still binds the immediate `keyword`.

### Step 3: Typecheck and test

**Verify**: `pnpm run web:check` → exit 0. `pnpm run web:test` → exit 0.

## Test plan

No new unit test is strictly required (this is a render-timing optimization and the data hooks are
unchanged). If a fast follow is desired, it belongs to `plans/008` (component-test infra) where the admin
page could be rendered and rapid `setKeyword` calls asserted to coalesce. For this plan, verification is
typecheck + existing suite green + a manual check: in the running admin page, typing quickly issues
network requests only after typing pauses (observe the Network tab).

## Done criteria

- [ ] `apps/web/src/features/admin/pages/admin-events.tsx` declares `deferredKeyword = useDeferredValue(keyword)`
- [ ] Both `useAdminEventsInfinite` and `useAdminEventFacets` receive `deferredKeyword`
- [ ] The search input remains bound to the immediate `keyword` (no input lag)
- [ ] `pnpm run web:check` exits 0
- [ ] `pnpm run web:test` exits 0
- [ ] Only `admin-events.tsx` modified (`git status`)
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report (do not improvise) if:
- The live `admin-events.tsx` no longer matches the excerpts (drift — e.g. keyword no longer from the store).
- Typecheck reveals the hooks expect a different keyword type than the deferred value provides.
- You find the search input is debounced elsewhere already (then this is a no-op — report and mark REJECTED).

## Maintenance notes

- If search is later moved to a server-driven typeahead, revisit whether `useDeferredValue` or an explicit
  debounce timer is the better fit.
- Reviewer should confirm the *input* still uses the immediate value (responsiveness) and only the *query
  hooks* use the deferred value.
</content>
