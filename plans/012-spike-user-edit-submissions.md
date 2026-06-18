# Plan 012: SPIKE — design user edit/delete of their own event submissions

> **Executor instructions**: This is a **design/investigation spike**, not a build-everything task. Your
> deliverable is a written findings document with a concrete proposal + open questions — NOT a shipped
> feature. Do not implement the RPC or UI in this plan. If anything in "STOP conditions" occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/events/pages/submit-event.tsx apps/web/src/features/admin/pages apps/web/src/shared/types.ts`

## Status

- **Priority**: P3
- **Effort**: M (spike)
- **Risk**: MED (touches authorization model — backend coordination required)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

Admins have full event CRUD (`apps/web/src/features/admin/pages/admin-event-edit.tsx`), but users who submit
community events can only **create** — there is no edit or delete of their own submission. After
`submit_community_event`, `submit-event.tsx` navigates to `/explore` and the submission is out of the user's
hands. In a closed beta, the inability to fix a typo or cancel a submission generates support load and
discourages submissions. This spike defines a safe, ownership-scoped edit/delete path and surfaces the open
questions (especially the authorization boundary, which lives in the Supabase backend).

## Current state

Verified at `4e739e4`:
- `apps/web/src/features/events/pages/submit-event.tsx` calls `supabase.rpc("submit_community_event", { ... })`
  (line ~34) with title/description/datetime/venue/address/city/age/price, then `navigate("/explore")`
  (line ~53). The form component is `apps/web/src/features/events/components/submit-event-form.tsx`
  (exports `SubmitEventForm`, `CommunityEventFormData`).
- Admin edit exists: `apps/web/src/features/admin/pages/admin-event-edit.tsx` + `admin-event-edit-form.tsx`
  + `apps/web/src/features/admin/lib/event-editor-mappers.ts` (patch derivation).
- `apps/web/src/shared/types.ts` defines the event `status` enum (includes a "draft"/submission state) and
  the event shape.
- **Authorization is Supabase RLS in a separate backend repo.** Any "user can edit only their own draft
  submission" rule must be enforced there, not in the client. The client cannot be the security boundary.

## Scope

**In scope** (this spike produces only):
- A findings document: `docs/rfcs/<date>-user-edit-submissions.md` (follow the existing RFC style in
  `docs/rfcs/2026-06-11-web-package-boundaries.md`).

**Out of scope** (do NOT do):
- Implementing any RPC, hook, route, or UI.
- Modifying `submit-event-form.tsx`, types, or admin code.
- Any backend/RLS change (different repo).

## Steps

### Step 1: Map the current submission lifecycle

Document: what `submit_community_event` stores, what `status` a fresh submission gets, who can see it, and
how admins review it. Identify the field that records the submitter (e.g. `submitted_by`/`created_by`) by
reading `shared/types.ts` and the admin review components.

### Step 2: Define the proposed edit/delete capability

Propose:
- A backend RPC contract (signature + ownership/status precondition) — e.g.
  `update_user_community_event(p_event_id, ...)` that succeeds only when `submitted_by = auth.uid()` AND the
  event is still in the editable (draft/pending) state; and a delete/cancel equivalent. State clearly that
  enforcement is RLS/RPC-side.
- The web surface: a `/events/:id/edit` route reusing `SubmitEventForm` prefilled, plus an entry point
  (where the user finds their submissions — note this overlaps with `plans/013`'s "My Submissions" view).
- Which states are editable vs locked (once approved/published, edits go through admin).

### Step 3: Enumerate open questions + risks

List decisions the maintainer/backend owner must make: can a user edit after approval? does an edit reset
review status? soft-delete vs hard-delete? rate limiting? Concurrency with admin edits?

### Step 4: Write the RFC

Write `docs/rfcs/<date>-user-edit-submissions.md` with: problem, current state (from Step 1), proposal
(Step 2), open questions/risks (Step 3), and a rough effort estimate for the eventual build. Match the
heading style of the existing RFC.

**Verify**: `test -f docs/rfcs/*user-edit-submissions.md` (the file exists); `pnpm run docs:test` → exit 0
(the new doc doesn't break the docs guard).

## Done criteria

- [ ] `docs/rfcs/<date>-user-edit-submissions.md` exists with problem, current state, proposal, open questions
- [ ] The proposal states explicitly that ownership enforcement is backend RLS/RPC, not client-side
- [ ] It cross-references `plans/013` for the shared "find my submissions" surface
- [ ] `pnpm run docs:test` exits 0
- [ ] No source code modified (`git status` shows only the new doc)
- [ ] `plans/README.md` status row for 012 updated

## STOP conditions

Stop and report (do not improvise) if:
- You cannot determine the submitter-ownership field from the code/types — the spike needs that fact; report
  what's missing rather than assuming a column name.
- `tests/guards/docs-coverage.test.mjs` rejects a new RFC file format.
- The submission lifecycle in code contradicts the premise (e.g. users already can edit somewhere) — report it.

## Maintenance notes

- This spike's RFC feeds a future build plan; it intentionally stops at design so the backend owner can weigh
  the RLS/RPC contract before any UI is built.
- Reviewer: confirm the doc does not propose client-side authorization as the boundary.
</content>
