# Plan 020: Cover user mutation hooks + the event-submission flow with tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/events apps/web/src/features/profile/hooks`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (but see Maintenance: coordinate with plan 023)
- **Category**: tests
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

The user-facing mutations — rating an event, saving to calendar, editing a
profile, and **submitting a community event (the feature the app exists for)** —
have zero test coverage today, while sibling mutations like favorites are
well-tested. Each carries cache-invalidation logic whose breakage is silent
(e.g., a rating that never updates the event's projection, a profile edit that
doesn't refresh, a submit that fails its RPC with no surfaced error). This plan
pins those contracts and the submission happy/error paths.

## Current state

All three user mutation hooks follow the `useMutation` + `onSuccess`-invalidates
shape. Verified excerpts:

`apps/web/src/features/events/hooks/use-ratings.ts:22-40` — `useUpsertRating`:
```ts
return useMutation({
  mutationFn: ({ eventId, score }) => { if (!userId) throw new Error(...); return upsertEventRating({ userId, eventId, score }) },
  onSuccess: (_rating, variables) => {
    void queryClient.invalidateQueries({ queryKey: qk.ratings.byEvent(variables.eventId) })
    void queryClient.invalidateQueries({ queryKey: qk.ratings.userEvent(userId, variables.eventId) })
    invalidateEventProjectionQueries(queryClient, variables.eventId)
  },
})
```
API: `upsertEventRating` from `@/features/events/api/ratings`. Helper
`invalidateEventProjectionQueries` from `@/features/events/lib/event-cache`.

`apps/web/src/features/events/hooks/use-calendar-events.ts:27-47` —
`useToggleCalendarEvent`: calls `removeFromCalendar`/`addToCalendar` from
`@/features/events/api/calendar`; `onSuccess` invalidates
`qk.calendarEvents.byUser(userId)` and calls `invalidateEventProjectionQueries`.

`apps/web/src/features/profile/hooks/use-profile.ts:13-41` — `useUpdateProfile`:
`mutationFn` runs `supabase.from("user_profiles").update(payload).eq("id", userId).select(...).single()`;
`onSuccess` invalidates `qk.userProfile.byUser(userId)`.

The submission flow:
`apps/web/src/features/events/pages/submit-event.tsx:26-59` — `handleSubmit`
calls `supabase.rpc("submit_community_event", { p_title, ... })`, on error
`toast.error(humanizeSupabaseError(...))`, on success `toast.success(...)` then
`navigate("/explore")`. The form
`apps/web/src/features/events/components/submit-event-form.tsx` validates via
`communityEventSchema` (zod, lines 11-23) in its own `handleSubmit` and only
calls the `onSubmit` prop with parsed data when valid.

### Conventions to follow

- Hook-with-API tests: model after
  `apps/web/src/features/admin/hooks/events/use-admin-events.test.tsx`
  (`// @vitest-environment jsdom` docblock, `vi.mock` the API module, `renderHook`
  + `QueryClientProvider`, spy `invalidateQueries`, assert with `toContainEqual`).
- Pure-handler / optimistic tests: model after
  `apps/web/src/features/events/hooks/use-favorites.test.ts`.
- For `useUpdateProfile`, the `mutationFn` uses the Supabase query builder
  (`from().update().eq().select().single()`). Mock `@/infrastructure/supabase/client`
  with a chainable stub whose `single()` resolves `{ data, error }`:
  ```ts
  vi.mock("@/infrastructure/supabase/client", () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    return { supabase: { from, rpc: vi.fn() } }
  })
  ```
- For rating/calendar, prefer `vi.mock("@/features/events/lib/event-cache", () => ({ invalidateEventProjectionQueries: vi.fn() }))` and assert it was called with `(expect.anything(), eventId)`, plus spy `invalidateQueries` for the direct keys.
- Form/component tests: model after
  `apps/web/src/features/dashboard/pages/dashboard.test.tsx` and
  `apps/web/src/features/admin/components/admin-event-edit-form.test.tsx`
  (jsdom, `@testing-library/react`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run one test file | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (create):
- `apps/web/src/features/events/hooks/use-ratings.test.tsx`
- `apps/web/src/features/events/hooks/use-calendar-events.test.tsx`
- `apps/web/src/features/profile/hooks/use-profile.test.tsx`
- `apps/web/src/features/events/components/submit-event-form.test.tsx`
- `apps/web/src/features/events/pages/submit-event.test.tsx`

**Out of scope** (do NOT modify):
- Any source file. Tests only.
- `use-favorites.ts` / `use-comments.ts` — already tested.
- The `submit-event-form` internals — plan 023 may migrate this form to
  react-hook-form; write the form test against the **current** behavior
  (validate-then-call-`onSubmit`), and plan 023 will update it.

## Git workflow

- Branch: `advisor/020-user-mutation-and-submit-tests`
- Conventional Commits, e.g. `test(events): cover user mutations + submission flow`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: `use-ratings.test.tsx` + `use-calendar-events.test.tsx`

Mock the API module and `event-cache`. Render the hook, mutate, `await
waitFor(isSuccess)`. Assert: API fn called with the right input; the direct
`invalidateQueries` keys present; `invalidateEventProjectionQueries` called with
the event id. Add an error test: API rejects → `result.current.isError` true and
no invalidation runs.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/events/hooks/use-ratings.test.tsx src/features/events/hooks/use-calendar-events.test.tsx` → pass.

### Step 2: `use-profile.test.tsx`

Mock the supabase client chain (see Conventions). Assert: success path returns
the profile and invalidates `qk.userProfile.byUser(userId)`; error path
(`single()` resolves `{ data: null, error: {...} }`) → `isError` true, no
invalidation; missing-`userId` path throws "must be signed in".

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/profile/hooks/use-profile.test.tsx` → pass.

### Step 3: `submit-event-form.test.tsx`

Render `<SubmitEventForm cityId="city-1" onSubmit={spy} isSubmitting={false} />`.
Cases: submitting with required fields filled calls `onSubmit` once with parsed
`CommunityEventFormData`; submitting empty shows the required-field error(s) and
does NOT call `onSubmit`; the free/price toggle gates the price field. Use RTL
queries + `fireEvent`.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/events/components/submit-event-form.test.tsx` → pass.

### Step 4: `submit-event.test.tsx`

Mock `@/infrastructure/supabase/client` (`rpc` as `vi.fn`), `sonner` (`toast`),
and `react-router`'s `useNavigate`. Render `SubmitEventPage` with an authed user
(`vi.mock` the auth + app stores like `dashboard.test.tsx` does). Drive the form
submit. Assert: `supabase.rpc` called with `"submit_community_event"` and the
mapped `p_*` payload; on success → success toast + `navigate("/submissions?submitted=1")`
**if** plan 013 has landed, else `navigate("/explore")` — match the live code in
`submit-event.tsx` at drift-check time; on RPC error → error toast and no navigation.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/events/pages/submit-event.test.tsx` → pass.

### Step 5: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Five files (Scope). Coverage: rating upsert (success/error/invalidation),
  calendar toggle (add+remove/invalidation/error), profile update
  (success/error/unauthenticated), form validation (valid/invalid/price-gate),
  submission flow (RPC payload/success-nav/error-toast).
- Patterns: `use-admin-events.test.tsx` (hooks), `use-favorites.test.ts`
  (optimistic), `dashboard.test.tsx` (store mocking), `admin-event-edit-form.test.tsx` (form render).
- Verification: `pnpm --filter @cypress-ink-labs/web run test` → all pass.

## Done criteria

- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] All five new test files exist and pass
- [ ] `submit-event.test.tsx` asserts the `submit_community_event` RPC payload and both success and error branches
- [ ] `pnpm run verify:web` exits 0
- [ ] No non-test source files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Live code diverges from the excerpts (drift since `37234b7`) — especially the
  `submit-event.tsx` post-submit navigation target.
- A test reveals an apparent source bug: record `file:line` and STOP; no source fixes here.
- The supabase-chain mock can't satisfy `useUpdateProfile` without touching
  source — STOP and report (the builder shape may have changed).

## Maintenance notes

- **Coordinate with plan 023**: if 023 (migrate `submit-event-form` to
  react-hook-form) lands after this, it must update `submit-event-form.test.tsx`
  to the new form API. Write this plan's form test against current behavior and
  note the dependency in the PR.
- Reviewer: confirm error-path tests assert *no* invalidation/navigation happened
  (negative assertions are the ones that catch silent regressions).
- These tests use mocked Supabase — they verify client contracts, not RLS. RLS
  remains the backend repo's responsibility.
