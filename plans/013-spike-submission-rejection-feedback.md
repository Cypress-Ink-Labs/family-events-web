# Plan 013: SPIKE — surface submission status + rejection reasons to the submitting user

> **Executor instructions**: This is a **design/investigation spike**, not a build-everything task. The
> deliverable is a written findings document with a concrete proposal + open questions. Do not implement
> the page or hooks. If anything in "STOP conditions" occurs, stop and report. When done, update the status
> row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/events/pages/submit-event.tsx apps/web/src/features/profile apps/web/src/features/admin/components/admin-event-review apps/web/src/shared/types.ts`

## Status

- **Priority**: P3
- **Effort**: M (spike)
- **Risk**: LOW
- **Depends on**: none (overlaps `plans/012` on the "find my submissions" surface)
- **Category**: direction
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

When a user submits a community event, the app reviews it (LLM-assisted) and stores a review status and a
human-readable reason — but the **submitter never sees it**. `submit-event.tsx` redirects to `/explore`
after submission, and there is no "my submissions" surface. Admins see `llm_review_reason`/`llm_review_flags`;
users see nothing. In a closed beta this trains early adopters to think submission is broken when an event
silently never appears. Surfacing status + reason builds trust and improves future submission quality. This
spike designs that user-facing surface.

## Current state

Verified at `4e739e4`:
- `apps/web/src/shared/types.ts` carries event review fields: `llm_review_status` (an
  `LlmEventReviewStatus | null`), `llm_review_reason` (`string | null`), `llm_review_flags` (`string[]`) —
  around lines 138–142.
- Admins already render these: `apps/web/src/features/admin/components/admin-event-review/` (e.g.
  `llm-review-summary.tsx`).
- `apps/web/src/features/events/pages/submit-event.tsx` submits via `submit_community_event` then
  `navigate("/explore")` (line ~53) — no tracking of the submitted event afterward.
- `apps/web/src/features/profile/pages/profile.tsx` exists (`ProfilePage`, line 39) and is the natural home
  for a "My Submissions" section, OR a dedicated `/submissions` route.
- Reading submissions back requires a query scoped to the current user's submitted events — that read must be
  authorized by Supabase RLS in the **backend repo** (a user may read their own submissions incl. review
  reason). Confirm whether such an RPC/view already exists before proposing a new one.

## Scope

**In scope** (this spike produces only):
- A findings document: `docs/rfcs/<date>-submission-feedback.md` (match the existing RFC style).

**Out of scope** (do NOT do):
- Implementing the page, route, hook, or RPC.
- Modifying types, profile, admin, or submit code.
- Any backend/RLS change.

## Steps

### Step 1: Map what's stored and who can read it

Document the review fields (`llm_review_status`, `llm_review_reason`, `llm_review_flags`) and the event
`status` values a submission moves through. Determine (from code/types) whether a user-scoped read path for
their own submissions already exists, or whether a new backend RPC/view + RLS policy is required.

### Step 2: Design the user-facing surface

Propose:
- Location: a "My Submissions" section on `ProfilePage` vs a dedicated `/submissions` route (recommend one,
  with reasoning; note the overlap with `plans/012`'s edit entry point — they likely share this surface).
- What each row shows: title, current status (pending/approved/rejected), and for rejected, the
  `llm_review_reason` (and optionally flags) in a collapsible.
- Empty state + how a freshly-submitted event appears (pending).
- Whether to add a post-submit confirmation that links here (instead of bouncing to `/explore`).

### Step 3: Open questions + risks

List decisions: should raw LLM flags be shown to users or a friendlier summary? privacy of review internals?
does showing a reason invite gaming? does this pair with a resubmit/edit flow (`plans/012`)?

### Step 4: Write the RFC

Write `docs/rfcs/<date>-submission-feedback.md`: problem, current state (Step 1), proposed surface (Step 2),
open questions/risks (Step 3), rough build effort. Cross-reference `plans/012`.

**Verify**: the file exists; `pnpm run docs:test` → exit 0.

## Done criteria

- [ ] `docs/rfcs/<date>-submission-feedback.md` exists with problem, current state, proposal, open questions
- [ ] It states whether a user-scoped read path exists or a new backend RPC/RLS policy is needed
- [ ] It cross-references `plans/012` for the shared submissions surface
- [ ] `pnpm run docs:test` exits 0
- [ ] No source code modified (`git status` shows only the new doc)
- [ ] `plans/README.md` status row for 013 updated

## STOP conditions

Stop and report (do not improvise) if:
- You cannot tell from the code whether users may already read their own submissions — report the gap; do not
  assume an RPC name.
- `tests/guards/docs-coverage.test.mjs` rejects the new RFC format.
- The review fields named above are not actually present on the event type (drift) — report it.

## Maintenance notes

- This RFC and `plans/012` likely converge on one "My Submissions" surface — coordinate them in the eventual
  build plan.
- Reviewer: confirm the proposal respects that review internals exposure is a product/privacy decision.
</content>
