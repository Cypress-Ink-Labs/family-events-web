# Plan 030: Add a sync generation guard to the auth store

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/auth/stores/auth-store.ts apps/web/src/features/auth/stores/auth-store.test.ts`
> Re-read both files and compare the "Current state" excerpts against live code.
> Any mismatch is a STOP condition; do not apply this plan to changed behavior.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Session synchronization has asynchronous boundaries while its visible state is
shared and global. A stale profile/access request can finish after sign-out or
a newer session and overwrite the new account's profile, access, and Sentry
identity. That can expose incorrect authorization state until another refresh.
A monotonic generation makes obsolete async work a no-op without changing the
profile/access API or the existing auth lifecycle.

## Current state

`apps/web/src/features/auth/stores/auth-store.ts:23-42` creates the module-level
`authRuntime`. It currently owns the expiry timer and synchronization metadata,
but has no generation that identifies the current sync:

```ts
function createAuthStoreRuntime() {
  return {
    expiryTimer: null as ReturnType<typeof setTimeout> | null,
    lastSyncedAccessToken: null as string | null,
    lastProfileFetchAt: 0,
    clearExpiryTimer() {
      // ...
    },
    reset() {
      this.clearExpiryTimer()
      this.lastSyncedAccessToken = null
      this.lastProfileFetchAt = 0
    },
  }
}

const authRuntime = createAuthStoreRuntime()
```

`apps/web/src/features/auth/stores/auth-store.ts:100-170` resets state without
invalidating in-flight `_syncSession` work, then has `_syncSession` await the
invite claim, profile/access load, and possibly sign-out. After the load it
unconditionally writes synchronization metadata, store profile/access, and the
Sentry user context:

```ts
_resetAuthState() {
  authRuntime.reset()
  set({ session: null, user: null, profile: null, access: null, authError: null })
  clearSentryUserContext()
  queryClient.clear()
},

async _syncSession(sessionValue, force = false) {
  // validation, expiry-timer setup, and the synchronous session/user write
  set({ session: sessionValue, user: sessionValue.user, authError: null })
  // ...
  if (isNewToken) {
    await claimPendingInviteAccess()
  }
  let profile: UserProfile | null = null
  let access: UserAccess | null = null
  try {
    ;({ profile, access } = await loadProfileAndAccess(sessionValue.user.id))
  } catch (error) {
    if (get().profile !== null) return
    throw error
  }
  // ... access-revocation sign-out branch ...
  authRuntime.lastSyncedAccessToken = sessionValue.access_token
  authRuntime.lastProfileFetchAt = Date.now()
  set({ profile, access })
  setSentryUserContext({ id: sessionValue.user.id, role: profile?.role, accessEnabled: access?.is_enabled })
}
```

The early `set({ session, user, authError: null })` at
`auth-store.ts:128-129` is deliberately synchronous: no `await` precedes it,
so it does **not** need a generation guard.

`apps/web/src/features/auth/stores/auth-store.ts:275-278` shows the relevant
sign-out flow: `signOut()` awaits Supabase, then calls `_resetAuthState()`.
Without invalidation, an earlier `_syncSession` can still commit after that
reset.

**Existing test decision**: the required grep found
`apps/web/src/features/auth/stores/auth-store.test.ts`; it already has
node-environment Vitest tests, module mocks, `loadStore()`, and
`flushPromises()` (`auth-store.test.ts:1-143`). **Extend this existing file**;
do not create another auth-store test file. Its current happy-path test at
`auth-store.test.ts:145-165` verifies profile/access and Sentry context, which
is the contract the race tests must protect.

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
`*.test.tsx` with a `// @vitest-environment jsdom` docblock. RTL is available
for DOM tests, but this store suite is already a node-environment unit suite.

## Scope

**In scope**:
- `apps/web/src/features/auth/stores/auth-store.ts`
- `apps/web/src/features/auth/stores/auth-store.test.ts` (extend; existing file)

**Out of scope**:
- `apps/web/src/features/auth/api/load-profile-and-access.ts` and its API
  behavior.
- Sentry helper implementations.
- `initAuth`'s destroyed-flag lifecycle logic, which is already correct.
- Retry, cancellation, or profile-fetch deduplication redesigns.

## Git workflow

- Branch: `advisor/030-auth-store-sync-generation`
- Conventional Commits, e.g. `fix(web): guard stale auth session syncs`.
- Do **not** push or open a PR.

## Steps

### Step 1: Reconfirm the async commit boundaries and add race tests

In `auth-store.test.ts`, retain the existing module-reset and Supabase/Sentry
mock pattern. Mock `loadProfileAndAccess` with manually resolved deferred
promises so each user/session can complete in a controlled order. Add two
regression tests:

1. Start user A's `_syncSession` with its profile/access promise pending; start
   and complete user B's `_syncSession`; then resolve A. Assert the store holds
   B's profile/access and the final `setSentryUserContext` payload is B's.
2. Start user A's `_syncSession` with its profile/access promise pending; call
   `signOut`; then resolve A. Assert `profile` and `access` remain `null` and
   stale work does not restore a Sentry identity.

Use distinct user IDs, access tokens, profiles, and access rows for A and B so
an incorrect stale commit cannot satisfy the assertions accidentally.

**Verify**: `pnpm run web:test` → the new tests fail before the generation
implementation and pass after it; the full web suite remains green.

### Step 2: Add the auth-runtime generation and invalidate reset work

Add `syncGeneration: 0` to the existing `authRuntime` return object. At the
top of `_syncSession`, capture the current request with:

```ts
const generation = ++authRuntime.syncGeneration
```

Increment `authRuntime.syncGeneration` in `_resetAuthState` before it clears
state. This invalidates every prior request when sign-out, an empty session, or
any other reset path wins the race. Keep `authRuntime.reset()` responsible for
its current timer/metadata cleanup; do not move this lifecycle state into the
Zustand store.

**Verify**: `pnpm run web:check` → the new runtime field and all existing store
types compile without errors.

### Step 3: Guard every asynchronous continuation and terminal commit

After **every** `await` inside `_syncSession`, compare the captured generation
with `authRuntime.syncGeneration` and return when they differ:

```ts
if (generation !== authRuntime.syncGeneration) return
```

Apply that rule after the expired-session `signOut`, after
`claimPendingInviteAccess`, after `loadProfileAndAccess` succeeds, and around
the access-revocation `signOut` path. In the access-revocation branch, check
before starting the terminal sign-out action and again after its `await`, so a
newer sync cannot be displaced by an obsolete revocation result.

Also place the same comparison immediately before every terminal success
commit: the two `authRuntime.last*` metadata writes,
`set({ profile, access })`, and `setSentryUserContext(...)`. Keep the existing
error behavior: a current first-sync profile failure throws, while a current
refresh failure with an existing profile remains fail-soft. Leave the early
synchronous `set({ session, user, authError: null })` unguarded because it has
no prior `await`.

**Verify**: `pnpm run web:test` → both deferred race regressions and existing
access-revocation/refresh tests pass.

### Step 4: Run the web gate

Run the web test and type/build gate after the targeted implementation is
complete. Do not broaden the fix into cancellation, retries, or an `initAuth`
rewrite if a non-race concern appears.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Extend the existing node-environment `auth-store.test.ts`; do not add a
  duplicate suite.
- Deferred-promise race: older user A resolves after newer user B and cannot
  overwrite B's profile, access, or Sentry context.
- Deferred-promise reset: resolving A after `signOut` cannot restore profile or
  access.
- Preserve all current tests for valid sync, access revocation, forced-refresh
  fail-soft behavior, expiry sign-out, and normal sign-out.

## Done criteria

- [ ] `authRuntime` has `syncGeneration: 0`, `_syncSession` captures a new
  generation at its top, and `_resetAuthState` increments it.
- [ ] Every `await` continuation and each listed terminal commit in
  `_syncSession` has the stale-generation bail-out before it can mutate state,
  metadata, or Sentry context.
- [ ] The early synchronous session/user/auth-error store write remains
  unguarded.
- [ ] `apps/web/src/features/auth/stores/auth-store.test.ts` contains both
  deferred-promise regressions and they pass.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- `auth-store.ts` or `auth-store.test.ts` does not match the Current state
  excerpts after the drift check.
- `_syncSession` contains an additional await, commit point, or lifecycle owner
  not accounted for above; stop and record the new boundary rather than
  guessing its generation semantics.
- The deferred race test demonstrates a stale Sentry or store mutation after
  the generation guard is added.
- The implementation requires changing `loadProfileAndAccess`, Sentry helpers,
  or `initAuth` destroyed-flag logic.
- `pnpm run verify:web` fails after a reasonable fix attempt.

## Maintenance notes

- `syncGeneration` is intentionally module-level runtime state, alongside the
  expiry timer and profile-fetch metadata. It must be incremented whenever a
  future reset invalidates in-flight auth work.
- A generation guard prevents stale commits; it does not cancel Supabase/RPC
  requests. Keep network cancellation/retry design out of this low-scope fix.
- Reviewer focus: ensure generation checks guard metadata and Sentry writes as
  well as Zustand state, and ensure the initial synchronous session/user write
  remains unchanged.
