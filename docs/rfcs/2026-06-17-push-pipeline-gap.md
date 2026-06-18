# Push Pipeline Gap Analysis

**Date**: 2026-06-17 (spike) · **updated + fleshed 2026-06-18** (post plan 015)
**Status**: findings → primary gap CLOSED by plan 015; remaining web gaps specified below
**Source plan**: 014 · [CIL-75](https://linear.app/hexsleeves/issue/CIL-75)
**Related**: [005 / CIL-66](https://linear.app/hexsleeves/issue/CIL-66) (env docs),
[015 / CIL-58](https://linear.app/hexsleeves/issue/CIL-58) (wired the registration call)

---

## Purpose

An earlier audit claimed "no send path exists" for push. This spike re-examined that end to end,
mapped the verified web-side pipeline, and recommended the smallest high-value next step (wire
`registerWebPush()`). That step shipped as **plan 015 ([CIL-58](https://linear.app/hexsleeves/issue/CIL-58))**.
This doc is now the living tracker for the **remaining** web-side push gaps, each specified
build-ready.

---

## Status update — what plan 015 changed

The spike's headline gap was: *`registerWebPush()` is fully implemented and tested but never called.*
**That is now CLOSED.**

- `features/profile/pages/profile.tsx:86` `handleNotificationToggle(field, value)` calls
  `registerWebPush()` when a user enables any `*_push` field (line 89–90).
- All non-success results (`denied` / `unsupported` / `no-vapid-key` / `error`) `toast` and
  **`return` before** `updateNotifPrefs.mutate()` (lines 94–110) — so a push-enabled preference is
  never persisted without a real browser subscription. (This early-return was the plan-015 REVISE
  fix, commit `888653e`.)
- On `subscribed`, the toggle falls through and saves the preference (lines 113–118).

So: a user can now opt in to push from the profile UI, and the subscription is stored in
`push_subscriptions` via `register_push_subscription`.

## Verified web-side pipeline (still accurate)

- **Service worker** `apps/web/public/sw-push.js`: handles `push` (parses `{ title, body, url?,
  icon?, tag? }`, `showNotification`) and `notificationclick` (focus/open `url`). No caching; no HMR
  conflict. **This is the payload contract the backend must produce.**
- **VAPID** `infrastructure/push/vapid.ts`: `getVapidPublicKey()` reads
  `import.meta.env.VITE_VAPID_PUBLIC_KEY`, returns `null` if unset; `urlBase64ToUint8Array()` for
  `PushManager.subscribe()`.
- **Registration** `infrastructure/push/register.ts`: `registerWebPush()` — support guards →
  no-vapid-key guard → register `/sw-push.js` (scope `/`) → `Notification.requestPermission()` →
  `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → store via
  `register_push_subscription({ p_platform:"web", p_endpoint, p_p256dh, p_auth_key })` → returns
  `{ status:"subscribed", subscriptionId }`. Idempotent. Fully unit-tested (`register.test.ts`).
- **`unregisterWebPush()`**: unsubscribes the local `PushManager` subscription **only** — it does
  **not** call any delete RPC, and **nothing in the UI calls it** (see Gap 1).
- **Preferences** `features/profile/hooks/use-notification-preferences.ts`: six booleans
  (`reminder_email/push`, `change_email/push`, `digest_email/push`) read via `select` and written
  via `upsert_notification_preferences`. Optimistic update with rollback.
- **In-app inbox** `features/notifications/`: separate pull-model (`user_notifications`, bell,
  unread count). Not push; functional.

---

## Remaining web-side gaps (build-ready)

### Gap 1 — Disabling push never unsubscribes (stale subscriptions accumulate)

**Today**: enabling a `*_push` toggle subscribes; **disabling** it just saves `false` to prefs. The
browser `PushManager` subscription and the `push_subscriptions` row both persist. `unregisterWebPush()`
exists but is unwired, and even it only unsubscribes locally — no DB delete. Result: the backend
keeps sending to endpoints the user "disabled", and dead endpoints pile up.

**Fix**

1. Backend RPC (separate repo): **`unregister_push_subscription(p_endpoint text) returns void`** —
   deletes the row where `endpoint = p_endpoint AND user_id = auth.uid()`.
2. `register.ts`: have `unregisterWebPush()` call `unregister_push_subscription(endpoint)` with the
   current subscription's endpoint **before** `subscription.unsubscribe()`, and return its result.
3. `profile.tsx handleNotificationToggle`: when `value === false && field.endsWith("_push")` **and
   no other `*_push` field remains enabled**, call `unregisterWebPush()` (toast on failure). Compute
   "last push toggle off" from the current `notifPrefs` snapshot.

### Gap 2 — `VITE_VAPID_PUBLIC_KEY` undocumented (silent dev breakage)

Verified 2026-06-18: the var is **still absent** from both `.env.example` and `apps/web/.env.example`
(plan 005 synced general onboarding but did not add this one). A fresh clone runs `pnpm dev`, the
user enables push, and gets a `no-vapid-key` toast with no setup guidance.

**Fix**: add to `apps/web/.env.example`:

```
# Web push (VAPID public key, base64url). Subscriptions no-op without it.
VITE_VAPID_PUBLIC_KEY=
```

Optionally downgrade the dev-mode `no-vapid-key` path to a `console.warn` with a pointer to this var.

### Gap 3 — No end-to-end round-trip test

No test confirms register → backend-send → SW `showNotification`. **Fix**: a best-effort Playwright
spec (parses via `--list`; requires live Supabase + `VITE_VAPID_PUBLIC_KEY` + a test send) following
the existing e2e auth/storageState patterns. Mark UNVERIFIED until run against a live env (same
posture as the plan-batch e2e specs).

### Gap 4 — Backend send-side unverified (cross-repo)

`apps/web/vitest.config.ts` excludes `../../supabase/functions/{send-push,send-reminders,send-weekly-digest}/**`
— paths resolving to `<repo-root>/supabase/functions/...`, **not present in this checkout**. The
exclusion implies those functions exist in the backend repo, but their behavior can't be read here.

This is a **backend-repo task**, tracked here so it isn't lost — see open questions. It does not
block Gaps 1–3.

---

## Recommended sequence

1. **Gap 2** (env doc) — trivial, unblocks dev. Pairs naturally with the next env touch.
2. **Gap 1** (unsubscribe + delete RPC) — the real correctness gap now that opt-in works; needs one
   backend RPC + small web wiring.
3. **Gap 4** (backend inspection) — confirm the send side actually reads `push_subscriptions` and
   respects `user_notification_preferences`; can run in parallel.
4. **Gap 3** (e2e) — last, once a live env + VAPID keypair are available.

## Acceptance criteria

- [ ] `apps/web/.env.example` documents `VITE_VAPID_PUBLIC_KEY`.
- [ ] Disabling the last `*_push` toggle calls `unregisterWebPush()`, which deletes the
      `push_subscriptions` row via `unregister_push_subscription` and unsubscribes the browser.
- [ ] `register.test.ts` covers the unregister-with-delete path.
- [ ] Backend send-side confirmed to (a) read `push_subscriptions`, (b) honor `*_push` prefs,
      (c) emit the `{ title, body, url?, icon?, tag? }` payload, (d) clean `410 Gone` endpoints.

## Open questions requiring backend-repo inspection

1. Do `send-push`, `send-reminders`, `send-weekly-digest` exist as deployed functions?
2. Does `send-push` join `push_subscriptions` and respect `user_notification_preferences`?
3. What triggers `send-reminders` / `send-weekly-digest` — cron or DB event?
4. What payload shape does `send-push` emit (must match `sw-push.js`)?
5. Does the backend handle `410 Gone` to prune stale subscriptions?
6. Is the VAPID **private** key set in the backend function environment?
