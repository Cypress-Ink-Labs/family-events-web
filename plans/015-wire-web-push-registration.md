# Plan 015: Wire `registerWebPush()` into the profile push-preference toggles

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat e07d499..HEAD -- apps/web/src/features/profile`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction / bug (half-built feature with no entrypoint)
- **Planned at**: commit `e07d499`, 2026-06-18

## Why this matters

The web-push pipeline is fully built and unit-tested — service worker
(`apps/web/public/sw-push.js`), VAPID helper, and an idempotent
`registerWebPush()` that subscribes the browser and stores the subscription via
the `register_push_subscription` RPC. But **nothing calls `registerWebPush()`**
(confirmed: zero call sites outside its own file/test). A user who flips a "Push"
toggle in profile settings saves a row in `user_notification_preferences`, but no
browser push subscription is ever created — so the backend has nowhere to send.
The feature looks available and silently does nothing.

This was the explicit recommendation of the plan-014 spike
(`docs/rfcs/2026-06-17-push-pipeline-gap.md`, "Recommended smallest next step"):
wire the registration call into the existing preferences flow. It needs no
backend change.

## Current state

- `apps/web/src/infrastructure/push/register.ts` — implements `registerWebPush()`,
  returning a discriminated union `PushRegistrationResult`:
  ```ts
  export type PushRegistrationResult =
    | { status: "subscribed"; subscriptionId: string }
    | { status: "denied" }
    | { status: "unsupported" }
    | { status: "no-vapid-key" }
    | { status: "error"; error: string }
  ```
  It is idempotent (re-uses an existing `PushManager` subscription if present)
  and already tested in `apps/web/src/infrastructure/push/register.test.ts`.

- `apps/web/src/features/profile/pages/profile.tsx:85-93` — the toggle handler.
  This is the wiring point:
  ```ts
  function handleNotificationToggle(field: keyof NotificationPreferences, value: boolean) {
    if (!notifPrefs) return
    const updated = { ...notifPrefs, [field]: value }
    updateNotifPrefs.mutate(updated, {
      onSuccess: () => toast.success("Notification preference updated"),
      onError: (error) =>
        toast.error(humanizeSupabaseError(error, "Failed to update notification preferences.")),
    })
  }
  ```
  The three push fields on `NotificationPreferences` are `reminder_push`,
  `change_push`, `digest_push` (the other three are `*_email`).

- `apps/web/src/features/profile/components/profile-sections.tsx:279-346` —
  `ProfileNotificationPreferencesCard` is **presentational**: it renders
  `Switch`es and calls the `onToggle(field, value)` prop. Do not put
  registration logic here; it belongs in the page handler.

- Toast convention: `import { toast } from "sonner"` (already imported in
  `profile.tsx:35`). Success: `toast.success("…")`. Error with detail:
  `toast.error("…", { description: "…" })` (see `profile-sections.tsx:153-156`).

### Behavior to implement

When the user enables a **push** field (`value === true` and the field name ends
with `_push`), call `registerWebPush()` **once** before/alongside saving the
preference, and surface the result:

| `registerWebPush()` result | User-facing behavior |
|---|---|
| `subscribed` | proceed silently (the existing "preference updated" toast is enough) |
| `denied` | `toast.error("Push notifications blocked", { description: "Enable notifications for this site in your browser settings." })` |
| `unsupported` | `toast.error("Push isn't supported in this browser.")` |
| `no-vapid-key` | `toast.error("Push isn't configured.", { description: "Missing VAPID key — contact support." })` |
| `error` | `toast.error("Couldn't enable push", { description: result.error })` |

The preference write (`updateNotifPrefs.mutate`) should still happen regardless —
the preference and the subscription are independent records. Turning a push
toggle **off** must NOT call `registerWebPush()` (and must not call
`unregisterWebPush()` in this plan — see Out of scope).

`registerWebPush()` is idempotent, so calling it on every push-enable is safe;
you do **not** need to track "first time only" state.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0, no errors |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Format check (web) | `pnpm --filter @cypress-ink-labs/web run format:check` | exit 0 |
| Single test file | `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/profile/pages/profile.test.tsx` | all pass |
| Unit tests (web) | `pnpm run web:test` | all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/src/features/profile/pages/profile.tsx` — extend `handleNotificationToggle`.
- `apps/web/src/features/profile/pages/profile.test.tsx` — **create**; tests the handler behavior.

**Out of scope** (do NOT touch):
- `apps/web/src/infrastructure/push/register.ts` — already correct and tested.
- `apps/web/src/features/profile/components/profile-sections.tsx` — presentational; leave as is.
- `unregisterWebPush()` / push-off behavior — deliberately deferred (stale-subscription
  cleanup depends on backend `410 Gone` handling that is unverified; see the RFC open questions).
- `.env.example` / VAPID docs — that belongs to onboarding work, not here.
- Any backend / RPC / Supabase edge-function change.

## Git workflow

- Branch: `advisor/015-wire-web-push-registration`
- Conventional Commits, e.g. `feat(profile): subscribe to web push when a push toggle is enabled`
  (recent example from `git log`: `fix(events): add event-card-media helper …`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend the toggle handler in `profile.tsx`

Add the import:
```ts
import { registerWebPush } from "@/infrastructure/push/register"
```

Rewrite `handleNotificationToggle` (lines 85-93) so that when a `*_push` field is
being **enabled**, it calls `registerWebPush()` and maps the result to a toast per
the table in "Current state". Keep the existing preference-write behavior. Make the
handler `async` (it already lives in a function component; `onToggle` accepts a
`(field, value) => void` callback — an async function is fine since the return
value is unused). Target shape:

```ts
async function handleNotificationToggle(
  field: keyof NotificationPreferences,
  value: boolean,
) {
  if (!notifPrefs) return

  if (value && field.endsWith("_push")) {
    const result = await registerWebPush()
    switch (result.status) {
      case "subscribed":
        break
      case "denied":
        toast.error("Push notifications blocked", {
          description: "Enable notifications for this site in your browser settings.",
        })
        break
      case "unsupported":
        toast.error("Push isn't supported in this browser.")
        break
      case "no-vapid-key":
        toast.error("Push isn't configured.", {
          description: "Missing VAPID key — contact support.",
        })
        break
      case "error":
        toast.error("Couldn't enable push", { description: result.error })
        break
    }
  }

  const updated = { ...notifPrefs, [field]: value }
  updateNotifPrefs.mutate(updated, {
    onSuccess: () => toast.success("Notification preference updated"),
    onError: (error) =>
      toast.error(humanizeSupabaseError(error, "Failed to update notification preferences.")),
  })
}
```

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0, no errors.

### Step 2: Add the test file

Create `apps/web/src/features/profile/pages/profile.test.tsx`. Because the existing
component tests run under jsdom via a docblock (Vitest 4 here lacks
`environmentMatchGlobs`), start the file with `// @vitest-environment jsdom` — see
`apps/web/src/features/admin/components/admin-event-edit-form.test.tsx:1` for the
exact convention. Rather than render the whole page (it pulls in many providers),
test the handler logic by mocking and asserting `registerWebPush` is called only on
push-enable. The simplest robust approach: extract nothing — instead render
`ProfileNotificationPreferencesCard` directly with a spy `onToggle`, AND unit-test
the branch logic. Concretely, write the test against the **card + a stub handler**
that reproduces the rule, mocking `@/infrastructure/push/register`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ProfileNotificationPreferencesCard } from "@/features/profile/components/profile-sections"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@cypress-ink-labs/contracts"

describe("ProfileNotificationPreferencesCard push wiring", () => {
  afterEach(() => cleanup())

  it("invokes onToggle with the push field and true when a push switch is enabled", () => {
    const onToggle = vi.fn()
    render(
      <ProfileNotificationPreferencesCard
        preferences={{ ...DEFAULT_NOTIFICATION_PREFERENCES }}
        isPending={false}
        onToggle={onToggle}
      />,
    )
    // reminder-push switch has id="reminder-push" (profile-sections.tsx:302)
    fireEvent.click(screen.getByRole("switch", { name: /push/i }))
    expect(onToggle).toHaveBeenCalled()
    const [field, value] = onToggle.mock.calls[0]
    expect(String(field).endsWith("_push")).toBe(true)
    expect(typeof value).toBe("boolean")
  })
})
```

Then add the handler-behavior assertions by importing the real page is heavy;
instead also add a focused unit test of the registration branch by mocking the
push module and calling a small copy is NOT allowed (no logic duplication). If you
cannot test the page handler without standing up all of the profile page's
providers (auth store, app store, theme, query client), STOP and report — do not
build an elaborate provider harness; note it and we will scope a page-level test
separately.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/profile/pages/profile.test.tsx` → all pass.

### Step 3: Full gate

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- New file `apps/web/src/features/profile/pages/profile.test.tsx`, modeled
  structurally on `apps/web/src/features/admin/components/admin-event-edit-form.test.tsx`
  (jsdom docblock, `render`/`screen`/`fireEvent`, `cleanup` in `afterEach`).
- Cases: (1) enabling a push switch fires `onToggle` with a `*_push` field name;
  (2) the field/value contract holds. (The result→toast mapping is exercised
  indirectly; deep page-handler testing is gated behind the STOP in Step 2 to
  avoid a brittle provider harness.)
- Verification: `pnpm run web:test` → all pass, including the new file.

## Done criteria

ALL must hold:

- [ ] `pnpm --filter @cypress-ink-labs/web run typecheck` exits 0
- [ ] `grep -rn "registerWebPush" apps/web/src/features/profile/pages/profile.tsx` returns a match (the call is wired)
- [ ] `apps/web/src/features/profile/pages/profile.test.tsx` exists and passes
- [ ] `pnpm run verify:web` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `handleNotificationToggle` in `profile.tsx` no longer matches the excerpt above
  (drift since `e07d499`).
- Testing the page handler would require building a multi-provider harness
  (auth store + app store + theme + query client) — report and stop at the
  card-level test rather than over-engineering.
- `registerWebPush`'s return type no longer matches the `PushRegistrationResult`
  union above (the result→toast mapping would be wrong).
- `pnpm run verify:web` fails for a reason you cannot trace to your change after
  one fix attempt.

## Maintenance notes

- If push-OFF cleanup is added later, it belongs in a follow-up that also resolves
  the backend `410 Gone` / stale-subscription question (RFC
  `docs/rfcs/2026-06-17-push-pipeline-gap.md`, open questions).
- A reviewer should confirm `registerWebPush()` is only called on push-**enable**,
  never on toggle-off, and never on email toggles.
- Deferred out of this plan and tracked in the RFC: documenting
  `VITE_VAPID_PUBLIC_KEY` in `.env.example`, and an end-to-end register→send test.
