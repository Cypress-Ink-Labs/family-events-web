# Plan 017: Cover dashboard render + admin bulk-mutation contracts with tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat e07d499..HEAD -- apps/web/src/features/dashboard apps/web/src/features/admin/hooks/events/use-admin-events.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (component-test infra already exists — jsdom + RTL, plan 008)
- **Category**: tests
- **Planned at**: commit `e07d499`, 2026-06-18

## Why this matters

Two high-traffic / high-stakes areas have no component-level coverage. The
**dashboard** is the main landing page (guest CTA vs. logged-in sections, loading /
error / empty branches) and has zero tests. The **admin bulk operations**
(approve / reject / delete many events at once) are the most destructive actions in
the app; their hooks fan out cache invalidations that, if silently dropped in a
refactor, leave the admin UI showing stale data after a bulk action. Component-test
infra (jsdom + React Testing Library) already landed in plan 008 — this plan uses
it.

## Current state

- `apps/web/src/features/dashboard/pages/dashboard.tsx` (161 LOC) — `DashboardPage`
  reads `useAuth()` (`user`, `profile`), `useApp()` (`selectedCity`), and
  `useEnrichedEvents({ cityId, userId })`, then renders one of:
  `DashboardGuestCta`, `DashboardLoadingState`, `DashboardErrorState`,
  `DashboardEmptyState`, or the populated sections (`DashboardTodaySection`,
  `DashboardSoonSection`, `DashboardSavedSection`, etc.) from
  `@/features/dashboard/components/dashboard-sections`. No test file exists.

- `apps/web/src/features/admin/hooks/events/use-admin-events.ts:170-197` — the two
  bulk-mutation hooks (thin wrappers over the API layer, with an invalidation
  contract on success):
  ```ts
  export function useBatchUpdateAdminEventStatus() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: ({ eventIds, status }: { eventIds: string[]; status: Event["status"] }) =>
        batchUpdateAdminEventStatus(eventIds, status),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
        void queryClient.invalidateQueries({ queryKey: qk.events.all })
        void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
        void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
      },
    })
  }

  export function useDeleteAdminEvents() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (eventIds: string[]) => deleteAdminEvents(eventIds),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
        void queryClient.invalidateQueries({ queryKey: qk.events.all })
        void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
        void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
      },
    })
  }
  ```
  The API functions are imported from `@/features/admin/api/events`
  (`batchUpdateAdminEventStatus`, `deleteAdminEvents`).

### Test conventions to match

- **Exemplar**: `apps/web/src/features/admin/components/admin-event-edit-form.test.tsx`.
  Note the first line `// @vitest-environment jsdom` (Vitest 4 here has no
  `environmentMatchGlobs`, so each DOM test opts in via this docblock), the
  `vi.mock(...)` of heavy sub-modules, `render`/`screen` from
  `@testing-library/react`, and `cleanup()` in `afterEach`.
- There is **no existing `renderHook` test** in this repo. This plan introduces the
  first one (Step 2); the harness is given in full below.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run one test file | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Unit tests (web) | `pnpm run web:test` | all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (create only):
- `apps/web/src/features/dashboard/pages/dashboard.test.tsx`
- `apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx`

**Out of scope** (do NOT modify):
- Any source file under `apps/web/src` — this plan adds tests only; if a source
  file appears to need a change to be testable, that is a STOP condition.
- `apps/web/src/features/admin/pages/admin-events.tsx` — the full 309-LOC page is
  intentionally NOT the test target (mocking its 7+ hooks + Zustand store is
  brittle); test the bulk-mutation hooks instead.
- `vitest.config.ts` / test infra — already configured.

## Git workflow

- Branch: `advisor/017-admin-dashboard-component-tests`
- Conventional Commits, e.g. `test(dashboard): cover render states` and
  `test(admin): cover bulk-mutation invalidation contract` (commit per file is fine).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Dashboard render-state test

Create `apps/web/src/features/dashboard/pages/dashboard.test.tsx`. Mock the three
data hooks and the `dashboard-sections` module (render sentinels so you assert which
branch rendered, mirroring how the exemplar mocks sub-sections). Cover:

1. **Guest** — `useAuth` returns `{ user: null }` → `DashboardGuestCta` sentinel present.
2. **Loading** — user present, `useEnrichedEvents` returns `{ isLoading: true }` →
   `DashboardLoadingState` sentinel.
3. **Error** — `{ isError: true }` → `DashboardErrorState` sentinel.
4. **Empty** — `{ data: [] }` (not loading, not error) → `DashboardEmptyState` sentinel.
5. **Populated** — `{ data: [<one event>] }` → at least one populated section
   sentinel (e.g. `DashboardTodaySection`) present and the empty-state sentinel absent.

Skeleton:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"

const authMock = vi.fn()
const appMock = vi.fn()
const enrichedMock = vi.fn()

vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/features/events/hooks/use-enriched-events", () => ({
  useEnrichedEvents: () => enrichedMock(),
}))
vi.mock("@/features/dashboard/components/dashboard-sections", () => ({
  DashboardCarouselSection: () => <div data-testid="carousel" />,
  DashboardEmptyState: () => <div data-testid="empty" />,
  DashboardErrorState: () => <div data-testid="error" />,
  DashboardGuestCta: () => <div data-testid="guest" />,
  DashboardHeader: () => null,
  DashboardLoadingState: () => <div data-testid="loading" />,
  DashboardParentPulse: () => null,
  DashboardSavedSection: () => <div data-testid="saved" />,
  DashboardSoonSection: () => <div data-testid="soon" />,
  DashboardTodaySection: () => <div data-testid="today" />,
}))
vi.mock("@/shared/components/motion", () => ({
  FadeSwap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { DashboardPage } from "./dashboard"

beforeEach(() => {
  appMock.mockReturnValue({ selectedCity: { id: "city-1" } })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
// ... five `it(...)` cases setting authMock/enrichedMock per the list above.
```
Adjust the mocked module's export list so it **exactly** matches the named imports
in `dashboard.tsx` (open the file and copy the import list — missing/extra named
exports will throw at import time). If the page reads a hook this skeleton does not
mock and the test errors on an undefined return, add that mock; if the page needs a
provider you cannot satisfy by mocking the hook (e.g. it calls `useQueryClient`
directly), STOP and report.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/dashboard/pages/dashboard.test.tsx` → all pass (5 cases).

### Step 2: Admin bulk-mutation invalidation test (first `renderHook`)

Create `apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx`. Mock
the API module and assert: (a) the mutation calls the API function with the right
args, and (b) on success it invalidates all four query keys. Full harness:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/events", () => ({
  batchUpdateAdminEventStatus: vi.fn().mockResolvedValue(undefined),
  deleteAdminEvents: vi.fn().mockResolvedValue(undefined),
  // include any other named exports the hook module imports from this path,
  // or the import will throw — check the top of use-admin-events.ts.
  fetchAdminEventFacets: vi.fn(),
  updateAdminEventStatus: vi.fn(),
}))

import { batchUpdateAdminEventStatus, deleteAdminEvents } from "@/features/admin/api/events"
import { useBatchUpdateAdminEventStatus, useDeleteAdminEvents } from "./use-admin-events"

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe("useBatchUpdateAdminEventStatus", () => {
  it("calls the API and invalidates the admin/events/stats caches on success", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useBatchUpdateAdminEventStatus(), { wrapper: wrapper(client) })

    result.current.mutate({ eventIds: ["e1", "e2"], status: "published" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(batchUpdateAdminEventStatus).toHaveBeenCalledWith(["e1", "e2"], "published")
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.events.all)
    expect(invalidated).toContainEqual(qk.events.detailAll)
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})

describe("useDeleteAdminEvents", () => {
  it("calls deleteAdminEvents and invalidates the same caches on success", async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, "invalidateQueries")
    const { result } = renderHook(() => useDeleteAdminEvents(), { wrapper: wrapper(client) })

    result.current.mutate(["e1", "e2", "e3"])

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAdminEvents).toHaveBeenCalledWith(["e1", "e2", "e3"])
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidated).toContainEqual(qk.admin.events.all)
    expect(invalidated).toContainEqual(qk.admin.stats)
  })
})
```
Before running, open the top of `use-admin-events.ts` and ensure the `vi.mock`
of `@/features/admin/api/events` lists **every** export the module imports from
that path (the import list shows `batchUpdateAdminEventStatus`, `deleteAdminEvents`,
`fetchAdminEventFacets`, `updateAdminEventStatus`). A missing one throws at import.
Confirm the four `qk.*` keys referenced exist in
`apps/web/src/infrastructure/queries/query-keys.ts`; if a key name differs, use the
real one (do not invent).

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/admin/hooks/events/use-admin-events.test.tsx` → all pass.

### Step 3: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- `dashboard.test.tsx` — 5 render-branch cases (guest / loading / error / empty /
  populated), modeled on `admin-event-edit-form.test.tsx`.
- `use-admin-events.test.tsx` — 2 cases asserting the bulk approve/reject (status
  update) and bulk delete hooks call their API and fire the cache-invalidation
  contract. This is the regression guard: dropping an `invalidateQueries` call in a
  future refactor fails the test.
- Verification: `pnpm run web:test` → all pass, including the ≥7 new cases.

## Done criteria

ALL must hold:

- [ ] `apps/web/src/features/dashboard/pages/dashboard.test.tsx` exists; 5 cases pass
- [ ] `apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx` exists; 2 cases pass
- [ ] Each test asserts something meaningful (a render branch / an API call + invalidation key), not a tautology
- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] `pnpm run verify:web` exits 0
- [ ] No source files (non-`.test.*`) modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Rendering `DashboardPage` requires a provider you cannot satisfy by mocking its
  hooks (e.g. it calls `useQueryClient`/router hooks directly) — report rather than
  building a deep provider tree.
- The bulk-mutation hooks no longer match the excerpt (e.g. invalidation keys
  changed) — update assertions to the real keys only if the change is obviously
  intentional; otherwise stop.
- A test only passes by asserting something trivial (e.g. "render did not throw")
  with no branch/contract assertion — that fails the "meaningful assertion" criterion.
- Making a test pass would require editing a source file.

## Maintenance notes

- The invalidation-contract test is deliberately coupled to the four query keys. If
  a key is intentionally added/removed from the hooks, update the assertions in the
  same PR — a failure here means "an admin bulk action may now leave stale caches."
- This plan establishes the `renderHook` + `QueryClientProvider` pattern; future
  hook tests should follow `use-admin-events.test.tsx`.
- A reviewer should confirm the dashboard mock's exported names track
  `dashboard.tsx`'s imports exactly — drift there yields a confusing import-time error.
