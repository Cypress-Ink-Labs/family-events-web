# Plan 019: Cover admin mutation hooks with invalidation-contract tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/admin/hooks`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

Admin is the data-quality and beta-access gate: it moderates comments/ratings,
approves invites, manages cities/AI settings, and publishes events into the
public-facing caches. The mutation hooks that drive these flows each invalidate
a specific set of React Query caches on success — that invalidation set is a
**contract**. If a future query-key refactor renames a key or drops one from a
hook's `onSuccess`, the symptom is silent: a published event stays "draft" in
Explore until a manual refresh, a deleted rating still shows, an approved invite
regresses. There is currently no test that pins these contracts. This plan adds
focused tests so a broken invalidation set fails CI instead of shipping.

## Current state

The admin mutation hooks live under
`apps/web/src/features/admin/hooks/` (and `hooks/events/`). They follow a
uniform shape: a `useMutation` whose `mutationFn` calls an API-layer function and
whose `onSuccess` invalidates a fixed set of `qk.*` keys. Example —
`apps/web/src/features/admin/hooks/events/use-admin-event-editor.ts:11-29`:

```ts
export function useUpdateAdminEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAdminEventInput) => updateAdminEvent(input),
    onSuccess: async (_event, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.admin.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.all }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailAll }),
        queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all }),
        queryClient.invalidateQueries({ queryKey: qk.admin.events.detail(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.eventAiTrace(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.events.detailById(variables.eventId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.stats }),
      ])
    },
  })
}
```

The same file exports `useCreateAdminEvent` and `useUnlockAdminEventFields` with
their own invalidation sets (see lines 31-68). The API functions come from
`@/features/admin/api/event-editor` (`updateAdminEvent`, `createAdminEvent`,
`unlockAdminEventFields`).

**Hooks with NO test today** (confirmed — no sibling `*.test.ts(x)`):

- `hooks/events/use-admin-event-editor.ts` — `useUpdateAdminEvent`, `useCreateAdminEvent`, `useUnlockAdminEventFields`
- `hooks/use-admin-access.ts` — user access mutations
- `hooks/use-admin-comments.ts` — comment moderation
- `hooks/use-admin-ratings.ts` — rating deletion
- `hooks/use-admin-invite-requests.ts` — invite approve/reject
- `hooks/use-admin-cities.ts` — city CRUD
- `hooks/use-admin-ai-settings.ts` — AI toggles/model

**Already covered** (do not duplicate): `hooks/events/use-admin-events.test.tsx`
covers `useBatchUpdateAdminEventStatus` + `useDeleteAdminEvents`.

### Convention to follow — the exemplar test

`apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx` is the
canonical pattern. **Match it exactly.** It mocks the API module, renders the
hook with a `QueryClientProvider`, spies on `invalidateQueries`, and asserts both
the API call and the invalidated key set:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"

vi.mock("@/features/admin/api/events", () => ({
  batchUpdateAdminEventStatus: vi.fn().mockResolvedValue(undefined),
  deleteAdminEvents: vi.fn().mockResolvedValue(undefined),
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
  })
})
```

Key conventions: the `// @vitest-environment jsdom` docblock on line 1 (Vitest
4.1.9 has no `environmentMatchGlobs`, so each component/hook test that needs a DOM
declares it inline — see `plans/README.md` plan 008 notes); `vi.mock` the API
module; `spy.mock.calls.map((c) => c[0]?.queryKey)` + `toContainEqual` to assert
the invalidation set without depending on call order.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0, no errors |
| Run one test file | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (create these test files; mirror each hook's directory):
- `apps/web/src/features/admin/hooks/events/use-admin-event-editor.test.tsx` (create)
- `apps/web/src/features/admin/hooks/use-admin-comments.test.tsx` (create)
- `apps/web/src/features/admin/hooks/use-admin-ratings.test.tsx` (create)
- `apps/web/src/features/admin/hooks/use-admin-invite-requests.test.tsx` (create)
- `apps/web/src/features/admin/hooks/use-admin-access.test.tsx` (create)

**Out of scope** (do NOT modify):
- Any non-test source file. This plan adds tests only — if a hook looks buggy,
  record it and STOP; do not "fix" it here.
- `use-admin-cities.ts` / `use-admin-ai-settings.ts` — lower-risk; defer unless
  trivial after the five above are done.
- `use-admin-events.test.tsx` — already covers its hooks.

## Git workflow

- Branch: `advisor/019-admin-mutation-hook-tests`
- Conventional Commits, e.g. `test(admin): cover admin mutation-hook invalidation contracts`.
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Read each target hook and record its contract

For each in-scope hook, open the source and write down: the API function(s) it
calls (and from which `@/features/admin/api/*` module), the mutation input
shape, and the exact `qk.*` keys its `onSuccess` invalidates. These are your
assertions. Do not guess — copy them from the source.

**Verify**: you have a contract list per hook. No command.

### Step 2: Write `use-admin-event-editor.test.tsx`

Cover all three hooks (`useUpdateAdminEvent`, `useCreateAdminEvent`,
`useUnlockAdminEventFields`). `vi.mock("@/features/admin/api/event-editor", ...)`
with `updateAdminEvent`/`createAdminEvent`/`unlockAdminEventFields` as
`vi.fn().mockResolvedValue(...)` (resolve `createAdminEvent` to an object with an
`id`, since its `onSuccess` reads `event.id`). For each: assert the API fn is
called with the mutation input, and that the invalidated key set
(`spy.mock.calls.map(c => c[0]?.queryKey)`) `toContainEqual` every key listed in
`use-admin-event-editor.ts` for that hook.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/admin/hooks/events/use-admin-event-editor.test.tsx` → all pass.

### Step 3: Write the other four test files

One file per hook (`use-admin-comments`, `use-admin-ratings`,
`use-admin-invite-requests`, `use-admin-access`). Same pattern: mock that hook's
API module, render, mutate, `await waitFor(isSuccess)`, assert API-call args +
invalidation set. If a hook has an `onError`/optimistic path, add a rollback test
modeled on `use-favorites.test.ts`.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/admin/hooks` → all pass.

### Step 4: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- New files listed in Scope. Each hook gets ≥1 success test asserting (a) the API
  fn is called with the right args, (b) the full invalidation set is present.
  Mutations with optimistic updates additionally get a rollback test.
- Structural pattern: `apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx`.
- Verification: `pnpm --filter @cypress-ink-labs/web run test` → all pass including the new files.

## Done criteria

- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] The five new `*.test.tsx` files exist and pass
- [ ] Each test asserts both the API-call args and the invalidation key set
- [ ] `pnpm run verify:web` exits 0
- [ ] No non-test source files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- A hook's live code doesn't match the contract you recorded in Step 1 after
  drift check (codebase moved since `37234b7`).
- Writing a test reveals an apparent bug in a hook (wrong/missing invalidation):
  record it with `file:line` and STOP — do not fix source in this plan.
- A test needs to touch an out-of-scope source file to pass.
- `verify:web` fails twice after a reasonable fix attempt.

## Maintenance notes

- These tests pin the invalidation contract. When a hook intentionally changes
  which caches it refreshes, update the corresponding test in the same PR — that
  is the signal the contract changed on purpose.
- Reviewer: scrutinize that assertions use `toContainEqual` on the key set (order-
  independent) and that `createAdminEvent` mock resolves an object with `id`.
- Deferred: `use-admin-cities` / `use-admin-ai-settings` tests (lower risk).
