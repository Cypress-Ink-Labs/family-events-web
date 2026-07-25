# Plan 028: Handle rejected realtime `setAuth()` before subscribing (events + presence)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts apps/web/src/features/admin/hooks/operations/use-admin-dashboard-presence.ts apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The admin event broadcast and dashboard-presence subscriptions authenticate
asynchronously before they subscribe. Today, either rejected `setAuth()` promise
becomes an unhandled rejection and leaves its subscription inactive for the
mount. Presence has a second unhandled promise: a rejected `channel.track()`.
These failures are operationally invisible precisely when an admin needs live
updates. Capturing them in Sentry preserves the existing low-risk lifecycle—no
retry or behavioural fallback—while making the dead subscription diagnosable.

## Current state

`apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.ts:91-123`
creates the private `events:all` channel and only subscribes after `setAuth()`
resolves. The chain has no rejection handler; cleanup keeps a `closed` flag and
removes the channel:

```ts
export function useAdminEventsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let closed = false
    const channel = supabase
      .channel("events:all", { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })
      .on("broadcast", { event: "UPDATE" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })
      .on("broadcast", { event: "DELETE" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })

    function handleEventChange(payload: AdminEventBroadcastPayload) {
      patchAdminEventQueries(queryClient, payload)
      void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
    }

    void supabase.realtime.setAuth().then(() => {
      if (!closed) {
        channel.subscribe()
      }
    })

    return () => {
      closed = true
      void supabase.removeChannel(channel).catch(() => {})
    }
  }, [queryClient])
}
```

`apps/web/src/features/admin/hooks/operations/use-admin-dashboard-presence.ts:40-85`
uses the same shape for the private presence channel. Its subscribe callback
starts `channel.track(payload)` but does not observe a rejection:

```ts
void supabase.realtime.setAuth().then(() => {
  if (closed) return
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      void channel.track(payload)
    }
  })
})

return () => {
  closed = true
  setUsers([])
  void channel.untrack().catch(() => {})
  void supabase.removeChannel(channel).catch(() => {})
}
```

The repository's canonical Sentry convention is the local observability wrapper,
not a direct `@sentry/react` namespace import. `apps/web/src/features/plan/hooks/use-plan-for-today.ts:7`
imports `Sentry` from `@/infrastructure/observability/sentry`, and
`apps/web/src/infrastructure/observability/sentry.ts:198-205` exposes
`Sentry.captureException(error, captureContext?)`, delegating its second argument
to the underlying Sentry SDK:

```ts
export const Sentry = {
  captureException(error: unknown, captureContext?: CaptureContext) {
    runWhenReady((module) => module.captureException(error, captureContext))
  },
  withScope(callback: (scope: SentryScope) => void) {
    runWhenReady((module) => module.withScope(callback))
  },
}
```

This corrects the stale audit wording that named
`import * as Sentry from "@sentry/react"`; use the wrapper import above so the
capture context `{ tags: { area: "admin.realtime" } }` or
`{ tags: { area: "admin.presence" } }` remains valid and matches the live
codebase convention.

`apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts:1-113`
currently contains node-environment unit tests only for
`patchAdminEventsInfiniteCache`. It supplies `Event` and infinite-cache fixtures,
then asserts in-place update, ignored unseen INSERT, and DELETE row removal. It
does not render the hook, mock Supabase realtime, or assert `setAuth()` failure
behaviour. There is no sibling presence-hook test yet.

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
- `apps/web/src/features/admin/hooks/operations/use-admin-dashboard-presence.ts`
- `apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts`
- `apps/web/src/features/admin/hooks/operations/use-admin-dashboard-presence.test.ts` (create)

**Out of scope**:
- Realtime retry, backoff, reconnect, or alerting design. A rejected auth or
  track call must be captured once, not retried here.
- The admin-event cache-patching logic, list predicates, and structural
  invalidations; Plan 029 owns those changes after this plan lands.
- Supabase authentication implementation, channel names, and backend RLS.
- Cleanup semantics: retain the existing `closed` flag, `untrack`, and
  `removeChannel` behaviour.

## Git workflow

- Branch: `advisor/028-realtime-setauth-rejection`
- Conventional Commits, e.g. `fix(admin): capture realtime auth subscription failures`.
- Do NOT push or open a PR.

## Steps

### Step 1: Add the repository Sentry wrapper to both hooks

Import `{ Sentry }` from `@/infrastructure/observability/sentry` in each target
hook. Do not import `* as Sentry` from `@sentry/react`; the wrapper is the live
repository convention and supports the same capture-context parameter needed
for the area tags.

**Verify**: `pnpm run web:check` — both hook files type-check with the wrapper
import and no unused imports.

### Step 2: Capture rejected event-subscription authentication

Extend the event hook's `setAuth()` chain with exactly this failure behaviour:

```ts
.catch((error) => {
  if (!closed) {
    Sentry.captureException(error, { tags: { area: "admin.realtime" } })
  }
})
```

Keep the successful `channel.subscribe()` branch and the existing `closed` flag
semantics unchanged. Do not add a retry, fallback subscription, or toast.

**Verify**: `pnpm run web:test` — a rejected event `setAuth()` is captured once
when mounted and never calls `subscribe`.

### Step 3: Capture rejected presence authentication and tracking

Add the same guarded `.catch(...)` to the presence hook's `setAuth()` chain,
with `{ tags: { area: "admin.presence" } }`. In the `SUBSCRIBED` callback,
attach a `.catch(...)` to `channel.track(payload)` that captures the rejection
with the same `admin.presence` tag. Preserve the callback, payload, `closed`
flag, and cleanup logic; no retry is added.

**Verify**: `pnpm run web:test` — rejected presence `setAuth()` and rejected
`track()` each produce one Sentry capture without an unhandled rejection.

### Step 4: Add lifecycle-focused hook tests

Extend `use-admin-events-realtime.test.ts` with a jsdom hook-test setup, adding
`// @vitest-environment jsdom` at line 1 if the rendered-hook tests require it.
Mock the Supabase client and the Sentry wrapper. Model rendering and teardown on
existing hook-test conventions. Assert all of the following:

1. Rejected `setAuth()` captures once with `area: "admin.realtime"` and never
   calls `subscribe`.
2. If the hook unmounts before `setAuth()` resolves or rejects, it neither
   subscribes nor captures to Sentry.
3. The existing pure cache-patcher tests continue to pass in the same file.

Create `use-admin-dashboard-presence.test.ts` with the same mocked realtime and
Sentry setup. Exercise a subscribed channel whose `track(payload)` rejects and
assert one capture with `area: "admin.presence"`. Also cover rejected
`setAuth()` if that fixture can do so without duplicating setup.

**Verify**: `pnpm run web:test` — the new events and presence rejection cases
and the existing cache-patcher cases pass.

### Step 5: Run the web gate

Run the standard web verification after the focused tests. Review that error
capture is conditional on `!closed`, so teardown cannot report stale failures.

**Verify**: `pnpm run verify:web` — exit 0.

## Test plan

- Extend `use-admin-events-realtime.test.ts` with mocked Supabase and Sentry
  hook tests: rejected `setAuth()` captures exactly once and does not subscribe;
  unmount-before-resolution produces neither subscription nor capture.
- Create `use-admin-dashboard-presence.test.ts` to cover rejected
  `channel.track(payload)` with exactly one `admin.presence` capture. Include
  rejected `setAuth()` where the shared fixture makes the contract clear.
- Use manually controlled promises for auth so the unmount race is deterministic.
- Run `pnpm run web:test`, `pnpm run web:check`, and the full
  `pnpm run verify:web` gate.

## Done criteria

- [ ] Both hooks import the repository `{ Sentry }` wrapper from
  `@/infrastructure/observability/sentry`.
- [ ] Each `setAuth()` chain captures a mounted rejection with its exact area
  tag and does not subscribe after rejection.
- [ ] Rejected presence tracking captures with `area: "admin.presence"`.
- [ ] Unmount before auth settlement produces neither subscription nor Sentry
  capture.
- [ ] No retry, backoff, fallback, toast, or cleanup-lifecycle change was added.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- The live code does not match the "Current state" excerpts after the drift
  check.
- The observability wrapper no longer supports
  `Sentry.captureException(error, captureContext?)`; do not bypass it with a
  direct `@sentry/react` import without a separate decision.
- A rejected `setAuth()` or `track()` needs a retry, UX notification, or other
  lifecycle change to pass tests; record that broader requirement instead.
- The existing `closed` guard would be weakened or cleanup would need to change.
- The test setup cannot deterministically control `setAuth()` settlement or a
  mock would stop exercising the real subscription branch.
- `pnpm run web:test` or `pnpm run web:check` fails twice after a reasonable
  fix attempt.

## Maintenance notes

- The audit wording that prescribed `import * as Sentry from "@sentry/react"`
  was stale. The canonical live convention is
  `import { Sentry } from "@/infrastructure/observability/sentry"`; its
  `captureException` forwards the same capture context to the loaded Sentry SDK.
- Do not add retry/backoff under this low-risk fix. A dead subscription should
  be loud in Sentry; reconnect policy needs an explicit, separately reviewed
  design.
- Plan 029 edits the same events-realtime hook. Land this plan first, then
  preserve these rejection handlers while making its cache updates query-aware.
