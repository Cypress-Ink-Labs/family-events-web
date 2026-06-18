# Plan 014: SPIKE — analyze the web-side gap in the push-notification pipeline

> **Executor instructions**: This is a **design/investigation spike**, not a build task. The deliverable is
> a written findings document. Do not implement features. If anything in "STOP conditions" occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/infrastructure/push apps/web/src/features/profile/hooks/use-notification-preferences.ts apps/web/vitest.config.ts`

## Status

- **Priority**: P3
- **Effort**: M (spike)
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

The app has substantial push-notification infrastructure: a service-worker registration + VAPID subscribe
flow (`infrastructure/push/`), subscription storage via `register_push_subscription`, and user
notification preferences (`use-notification-preferences.ts`). An initial read suggested "no send path
exists" — but that is **likely wrong**: the repo's `vitest.config.ts` references backend edge functions
`send-push`, `send-reminders`, and `send-weekly-digest` (excluded from the web test run), which live in the
Supabase backend repo. So the sending side probably *does* exist server-side. Before anyone "builds push
sending," this spike establishes what actually exists end-to-end and identifies the real web-side gap (if
any) — so effort isn't spent rebuilding something that's already there.

## Current state

Verified at `4e739e4`:
- `apps/web/src/infrastructure/push/register.ts` — `registerWebPush()` registers `/sw-push.js`, requests
  permission, subscribes via `PushManager`, and stores the subscription with
  `supabase.rpc("register_push_subscription", { p_platform: "web", p_endpoint, p_p256dh, p_auth_key })`.
- `apps/web/src/infrastructure/push/vapid.ts` — `getVapidPublicKey()` reads `VITE_VAPID_PUBLIC_KEY`
  (returns `null` if unset; note this var is NOT in `.env.example` — onboarding gap, see `plans/005`).
- `apps/web/src/features/profile/hooks/use-notification-preferences.ts` — user preference toggles
  (reminder/change/digest channels).
- `apps/web/vitest.config.ts` `exclude` lists `../../supabase/functions/send-weekly-digest/**`,
  `../../supabase/functions/send-push/**`, `../../supabase/functions/send-reminders/**` — i.e. the **send
  side exists as Supabase edge functions in a sibling/backend location**, not in `apps/web`.
- Those `supabase/functions/` directories are NOT present in this web repo checkout (they live in the
  backend repo); the web repo references them only via the monorepo-relative test globs.

## Scope

**In scope** (this spike produces only):
- A findings document: `docs/rfcs/<date>-push-pipeline-gap.md` (match existing RFC style).

**Out of scope** (do NOT do):
- Implementing any send trigger, admin UI, or hook.
- Modifying push infra, preferences, or config.
- Backend edge-function changes.

## Steps

### Step 1: Trace the web-side pipeline end to end

Document the full client flow: enable push → `registerWebPush` → subscription stored → preferences set. Note
what `VITE_VAPID_PUBLIC_KEY` requires and that it's undocumented in `.env.example`.

### Step 2: Establish what the backend already provides

From the `vitest.config.ts` references and any contract types in `@cypress-ink-labs/contracts`, document that
`send-push`/`send-reminders`/`send-weekly-digest` edge functions exist in the backend repo. **You cannot read
them here** — state that explicitly and list what must be confirmed by inspecting the backend repo: do the
send functions read `push_subscriptions` + the user's notification preferences? what triggers them (cron?
event-status change?)?

### Step 3: Identify the actual web-side gap (if any)

Frame the real question: given sending exists server-side, what (if anything) is missing in the web app?
Candidates to evaluate: (a) is there UI to *trigger* a notification (e.g. admin "notify favoriters when an
event publishes")? (b) does the preferences UI actually gate delivery, or is it cosmetic until the backend
reads it? (c) is `VITE_VAPID_PUBLIC_KEY` configured in deploy + documented? (d) end-to-end test coverage.
Recommend the smallest high-value next step rather than a rebuild.

### Step 4: Write the RFC

Write `docs/rfcs/<date>-push-pipeline-gap.md`: client pipeline (Step 1), backend-side assumptions to verify
(Step 2), the real gap + recommended next step (Step 3), and open questions requiring backend-repo inspection.

**Verify**: the file exists; `pnpm run docs:test` → exit 0.

## Done criteria

- [ ] `docs/rfcs/<date>-push-pipeline-gap.md` exists, mapping the client pipeline and naming the backend
      send functions referenced in `vitest.config.ts`
- [ ] It explicitly distinguishes what's verified-in-this-repo vs what needs backend-repo confirmation
- [ ] It recommends a concrete smallest-next-step rather than "build sending from scratch"
- [ ] It notes the `VITE_VAPID_PUBLIC_KEY` documentation gap (links `plans/005`)
- [ ] `pnpm run docs:test` exits 0
- [ ] No source code modified (`git status` shows only the new doc)
- [ ] `plans/README.md` status row for 014 updated

## STOP conditions

Stop and report (do not improvise) if:
- You conclude the send functions do NOT exist after all (e.g. the `vitest.config.ts` references are stale and
  point to nothing) — that materially changes the finding; report it rather than designing a trigger UI.
- The push infra in `apps/web` differs from the excerpts (drift).

## Maintenance notes

- The honest framing here matters: the original audit signal ("no send path") was contradicted by the test
  config. Confirm reality in the backend repo before any build plan is written.
- Reviewer: confirm the RFC doesn't assume backend behavior it couldn't verify.
</content>
