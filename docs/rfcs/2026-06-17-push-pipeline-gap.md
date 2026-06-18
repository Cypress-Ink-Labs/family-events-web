# Push Pipeline Gap Analysis

**Date**: 2026-06-17
**Status**: findings / spike
**Author**: spike (plan 014)
**Related plans**: [005](../../plans/005-onboarding-env-readme.md), [014](../../plans/014-spike-push-gap-analysis.md)

---

## Purpose

An earlier audit suggested "no send path exists" for push notifications. This spike
re-examines that claim end to end, maps the verified web-side pipeline, names the
backend send-side evidence, distinguishes what is confirmed from what requires
backend-repo inspection, and recommends the smallest high-value next step.

---

## Verified: the web-side client pipeline

The following is confirmed by reading the source at commit `4e739e4` in this repo.

### 1. Service worker (`apps/web/public/sw-push.js`)

A push-only service worker is present. It handles two browser events:

- `push` — parses the server payload (JSON with `title`, `body`, `url`, `icon`, `tag`)
  and calls `showNotification`.
- `notificationclick` — closes the notification and focuses or opens the target `url`.

No caching logic. Does not conflict with Vite HMR. The payload format the backend must
produce is: `{ title, body, url?, icon?, tag? }`.

### 2. VAPID key (`apps/web/src/infrastructure/push/vapid.ts`)

`getVapidPublicKey()` reads `import.meta.env.VITE_VAPID_PUBLIC_KEY` (a Vite build-time
replacement). Returns `null` if unset. `urlBase64ToUint8Array()` converts the base64url
key for `PushManager.subscribe()`.

**Documentation gap**: `VITE_VAPID_PUBLIC_KEY` is absent from both `.env.example` and
`apps/web/.env.example`. A developer who clones the repo and runs `pnpm dev` will get
`status: "no-vapid-key"` silently — push will not work and there is no error surfaced
to the UI. See [plan 005](../../plans/005-onboarding-env-readme.md) for the broader
onboarding env-docs work; adding `VITE_VAPID_PUBLIC_KEY` to `.env.example` belongs
there.

### 3. Registration flow (`apps/web/src/infrastructure/push/register.ts`)

`registerWebPush()` is fully implemented and idempotent:

1. Guards: checks `serviceWorker` and `PushManager` browser support.
2. Guards: returns `{ status: "no-vapid-key" }` if env is unset.
3. Registers `/sw-push.js` with scope `/`.
4. Calls `Notification.requestPermission()`.
5. Subscribes via `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
6. Stores the subscription with `supabase.rpc("register_push_subscription", { p_platform: "web", p_endpoint, p_p256dh, p_auth_key })`.

`unregisterWebPush()` is also implemented — unsubscribes the PushManager subscription
(does not call a delete RPC; the endpoint becomes stale server-side on next send attempt).

**Web-side unit tests** exist in `register.test.ts` and cover all result paths.

**Critical gap**: `registerWebPush()` is NOT called anywhere in the current UI. No
component, hook, or page imports or calls it. The flow exists in infrastructure but has
no entrypoint. The user has no way to opt in to push without a developer invoking the
function directly.

### 4. Notification preferences (`apps/web/src/features/profile/hooks/use-notification-preferences.ts`)

`useNotificationPreferences` reads and `useUpdateNotificationPreferences` upserts the
`user_notification_preferences` table via RPCs:
- Read: direct `supabase.from("user_notification_preferences").select(...)`.
- Write: `supabase.rpc("upsert_notification_preferences", toUpsertParams(prefs))`.

Six boolean columns are exposed to the user:
`reminder_email`, `reminder_push`, `change_email`, `change_push`, `digest_email`, `digest_push`.

The preferences UI (`ProfileNotificationPreferencesCard`) is wired and rendered on the
profile page — it works. The data is persisted. Whether the backend send functions read
this table before sending is unverified (see section below).

### 5. In-app notification inbox (`apps/web/src/features/notifications/`)

Separate from push: the app has a `user_notifications` table-backed inbox (bell icon,
unread count, mark-read RPCs). This is a pull model, not push. It is not the same as web
push and appears fully functional on the web side.

---

## Backend send-side: what the evidence shows (cannot be fully verified here)

`apps/web/vitest.config.ts` excludes three Supabase edge function directories from the
web test run:

```
../../supabase/functions/send-weekly-digest/**
../../supabase/functions/send-push/**
../../supabase/functions/send-reminders/**
```

These paths are relative to `apps/web/` — i.e. they resolve to
`<repo-root>/supabase/functions/...`. **Those directories are NOT present in this web
repo checkout.** The web repo's vitest config references them because at some point both
the web app and the Supabase backend live (or lived) in the same monorepo tree, or the
config was written anticipating that layout. The edge functions themselves cannot be read
here.

**What this evidence confirms:**

- Three edge functions named `send-push`, `send-reminders`, and `send-weekly-digest` are
  expected to exist somewhere in the backend.
- They are excluded from the web vitest run — meaning they have their own `.test.ts`
  files that were previously runnable from this config, or the exclusion was added
  preemptively to avoid glob noise.

**What requires backend-repo inspection to confirm:**

- Do the three functions actually exist and are they deployed?
- Does `send-push` read the `push_subscriptions` table (populated by
  `register_push_subscription` RPC) to find endpoints?
- Does `send-push` / `send-reminders` check `user_notification_preferences` (e.g.
  `reminder_push`, `change_push`) before sending, or does it send to all subscribers?
- What triggers each function: scheduled cron, database webhook, Supabase function
  invocation from another function?
- What payload format does `send-push` produce — does it match the service worker's
  expected `{ title, body, url?, icon?, tag? }` shape?
- Does `send-reminders` send both email and push, or only email?
- Is there a VAPID private key configured in the backend edge function environment?

---

## The real web-side gap

The "no send path" claim was wrong about the server side — evidence points to edge
functions existing. The real gap is on the web client:

**`registerWebPush()` is never called.** The function is fully implemented and tested,
but no component triggers it. A user visiting the profile page sees notification
preference toggles but cannot enable push delivery because the browser subscription step
never runs. The push toggle for "Reminders / Push" etc. saves to `user_notification_preferences`
but there is no corresponding push subscription stored in `push_subscriptions` — the
backend has nowhere to send.

Secondary gaps (lower priority, pending backend confirmation):

- `VITE_VAPID_PUBLIC_KEY` undocumented in `.env.example` (onboarding break; plan 005).
- No end-to-end test confirming a subscription survives a full register → backend-send
  round trip.
- `unregisterWebPush()` does not call a delete RPC — stale subscriptions accumulate in
  `push_subscriptions`; whether the backend handles 410 Gone cleanup is unknown.

---

## Recommended smallest next step

**Wire `registerWebPush()` into the profile notification preferences UI.**

Concretely: when the user enables any push channel toggle (`reminder_push`,
`change_push`, or `digest_push`) for the first time (i.e. the browser has no active push
subscription yet), call `registerWebPush()` and surface the result to the user (success
toast, or an explanatory error if permission is denied or VAPID key is missing).

This is a single-hook addition to the existing preferences flow. It does not require
backend changes. It closes the only confirmed web-side gap. It also makes
`VITE_VAPID_PUBLIC_KEY` observable in dev (the `no-vapid-key` result can produce a
clearer dev-mode warning).

The backend send-side should be inspected in parallel (or first, if there is doubt about
whether the edge functions exist) — but that inspection is independent of wiring the
registration call.

---

## Open questions requiring backend-repo inspection

1. Do `send-push`, `send-reminders`, `send-weekly-digest` exist as deployed functions?
2. Does `send-push` join `push_subscriptions` and respect `user_notification_preferences`?
3. What triggers `send-reminders` and `send-weekly-digest` — cron schedule or event?
4. What payload shape does `send-push` send to the push endpoint?
5. Does the backend handle `410 Gone` responses from push services to clean stale
   subscriptions?
6. Is the VAPID private key set in the backend function environment?
