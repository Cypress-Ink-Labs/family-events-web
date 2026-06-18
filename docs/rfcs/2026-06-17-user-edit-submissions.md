# User Edit/Delete of Own Event Submissions

## Problem

Users who submit community events via `submit_community_event` can only create — there is no path
to edit or delete their own submission after the fact. After submitting, `submit-event.tsx`
navigates to `/explore` and the event is out of the submitter's hands. Admins hold full CRUD via
`admin_update_event` / `admin_create_event`. In a closed beta, the inability to fix a typo or
cancel a submission generates support load and discourages future submissions.

## Current State

Verified at commit `4e739e4`:

**Submission lifecycle:**

1. `apps/web/src/features/events/pages/submit-event.tsx` calls
   `supabase.rpc("submit_community_event", { p_title, p_description, p_start_datetime, ... })`
   (line 34) with eleven fields, then unconditionally `navigate("/explore")` (line 53).
2. The RPC inserts a row into `events` with `status = "draft"` (inferred from the `EventStatus`
   union: `"draft" | "published" | "rejected" | "archived"` in `apps/web/src/shared/types.ts`
   line 36; fresh community submissions are not directly published).
3. The row carries a `submitted_by` field (visible in test fixtures:
   `apps/web/src/features/admin/components/admin-events-sections.test.ts` line 68,
   `apps/web/src/features/admin/hooks/operations/use-admin-events-realtime.test.ts`). This is the
   ownership anchor.
4. Admins review via `apps/web/src/features/admin/pages/admin-event-edit.tsx`, which calls
   `admin_update_event` (RPC) to patch fields and change `status` to `published`, `rejected`, or
   `archived`. A `p_decision_reason` parameter carries a review note. Admins also call
   `admin_create_event` for manual entries and `admin_unlock_event_fields` to clear field locks.
5. There is no user-facing read path for a submitter to retrieve their own submissions, and no
   user-scoped edit or delete RPC. The client cannot verify ownership — that boundary lives in
   Supabase RLS in the backend repo.

**Form component:** `apps/web/src/features/events/components/submit-event-form.tsx` exports
`SubmitEventForm` (controlled, unmanaged state) and `CommunityEventFormData`. The form is
currently create-only; it has no `initialValues` / prefill props.

## Proposal

### Authorization boundary

**Enforcement is Supabase RLS/RPC, not client-side.** The web client cannot be the security
boundary for ownership checks. Every mutating operation must be gated by a backend RPC that
verifies `submitted_by = auth.uid()` AND checks the event's current `status` before acting.
Client code only calls these RPCs; it never filters or validates ownership itself.

### Backend RPC contract

Two new RPCs are needed in the backend repo:

**`update_user_community_event`**

```
update_user_community_event(
  p_event_id   uuid,
  p_title      text,
  p_description text | null,
  p_start_datetime timestamptz,
  p_end_datetime   timestamptz | null,
  p_venue_name text | null,
  p_address    text | null,
  p_city_id    uuid,
  p_age_min    int | null,
  p_age_max    int | null,
  p_is_free    bool,
  p_price      numeric | null
) returns events
```

Preconditions (enforced server-side):
- `events.submitted_by = auth.uid()` — caller owns the event.
- `events.status IN ('draft')` — event has not yet been approved, rejected, or archived. Once an
  admin has acted on it the submitter's edit window closes.

On success: updates the mutable fields, resets any LLM review fields to null (the updated content
needs re-review), and returns the updated row.

**`cancel_user_community_event`**

```
cancel_user_community_event(
  p_event_id uuid
) returns void
```

Preconditions (same as above):
- `events.submitted_by = auth.uid()`
- `events.status = 'draft'`

On success: transitions `status` to `"archived"` (soft-delete) so audit history is preserved and
the event is invisible to public queries. Hard-delete is not recommended; see Open Questions.

### Editable states

| Status | User can edit | User can cancel |
|--------|--------------|-----------------|
| `draft` | Yes | Yes |
| `published` | No | No — contact admin |
| `rejected` | No | No — already closed |
| `archived` | No | No — already closed |

Once an admin publishes or rejects an event, user-initiated changes must go through an admin. This
avoids silent content changes to live published events.

### Web surface

**Route:** `/events/:id/edit`

- Loads the event by `id`.
- Verifies on the client that `event.submitted_by === user.id` and `event.status === "draft"`;
  if not, shows a locked state (edit window closed or not the owner). This is a UX guard only —
  the RPC enforces the real rule.
- Renders `SubmitEventForm` prefilled with existing values. `SubmitEventForm` needs an optional
  `initialValues: CommunityEventFormData` prop added (no logic change; just seeded state).
- On submit calls `update_user_community_event`.
- Includes a "Cancel submission" destructive action that calls `cancel_user_community_event`.

**Entry point:** The user must be able to discover their own submissions. This surface overlaps
directly with plan 013's "My Submissions" view — a list of the current user's submitted events
with status badges. The edit/cancel actions would be accessible from that list. Implementing
the edit route without the discovery surface has limited value; the two should ship together.
See [Plan 013](../../plans/013-spike-submission-rejection-feedback.md) for the "My Submissions"
surface design.

**Read path:** Loading the event for the edit form requires a user-scoped query or RPC that
returns the submitter's own `draft` events (including fields that are currently admin-only such
as `llm_review_status`). A new backend RPC or RLS-governed view is required; no such path exists
today.

## Open Questions and Risks

1. **Reset on edit**: Should `update_user_community_event` reset `llm_review_status` and
   `llm_review_decision` to null, re-queuing the event for LLM review? If not, stale LLM flags
   could affect admin review of the edited content. Recommended: yes, reset on every user edit.

2. **Concurrency with admin edits**: If an admin is mid-edit when a user edits, the user's update
   could overwrite admin changes or vice versa. The RPC should check `updated_at` for optimistic
   concurrency, or the draft window should close as soon as an admin opens the event.

3. **Rate limiting**: The existing `submit_community_event` enforces max 5 submissions/day (noted
   in `submit-event-form.tsx`). `update_user_community_event` should be separately rate-limited
   (e.g. 10 edits/day per user) to prevent abuse.

4. **Hard-delete vs soft-delete**: Soft-delete via `status = 'archived'` is proposed. Hard-delete
   loses audit history. If privacy regulations require true erasure of user-submitted PII, a
   scheduled hard-delete pipeline should be considered separately.

5. **Edit after rejection**: Should a user be allowed to re-submit an edited version of a rejected
   event? The current proposal says no (rejected events are locked). An alternative is a
   "resubmit" flow that creates a new draft copying the rejected event's content. This is out of
   scope here but worth deciding before the build plan.

6. **Admin-locked fields**: Events already have an `admin_locked_fields` array (visible in test
   fixtures). If an admin has locked specific fields, the `update_user_community_event` RPC should
   skip or reject edits to those fields to avoid overwriting intentional admin corrections.

7. **Notification on user edit**: Should an admin be notified when a user edits a draft? If the
   event was already in an admin's review queue, a silent edit could confuse the reviewer.

## Effort Estimate (future build)

- Backend (separate repo): 2 new RPCs + RLS policies + tests — M (2–3 days).
- Web: `SubmitEventForm` prefill prop, `/events/:id/edit` route, cancel action — S (1 day).
- Discovery surface (shared with plan 013): see that RFC — M.
- Total web estimate: S–M assuming the "My Submissions" surface is implemented concurrently with
  plan 013.

## Cross-references

- [Plan 012](../../plans/012-spike-user-edit-submissions.md) — this spike's source plan.
- [Plan 013](../../plans/013-spike-submission-rejection-feedback.md) — "My Submissions" surface
  (overlapping entry point; the two RFCs converge on one list view that enables both edit access
  and rejection feedback display).
